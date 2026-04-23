/**
 * ボット対話の SSE エンドポイント。
 *
 * 手順:
 *  1. 入力のモデレーション(ルール+Haiku)
 *     - hard-block: ModerationLog に記録し エラー応答を返して終了
 *  2. ボットのナレッジから System プロンプトを組み立て、Claude Sonnet にストリーム要求
 *  3. 応答の <cite> タグを解釈し、出典をアプリ層で機械付与
 *  4. Message を DB に保存、AuditLog / ModerationLog にも記録
 *
 * 認証はなく、「現在選ばれている児童」が誰かを lib/context/kid.ts から取得する。
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentKid } from '@/lib/context/kid';
import { prisma } from '@/lib/prisma';
import { stream } from '@/lib/llm/anthropic';
import { appendCitation, parseCiteTag } from '@/lib/llm/cite';
import { buildBotRuntimeSystem, gradeMaxTokens } from '@/lib/prompts/bot-runtime';
import { moderateInput } from '@/lib/moderation/input';
import { checkLLMRateLimit, rateLimitMessageJa } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .max(50)
    .default([]),
  message: z.string().min(1).max(2000),
});

export async function POST(
  req: Request,
  { params }: { params: { botId: string } },
) {
  const { current: kid } = await getCurrentKid();
  if (!kid) {
    return NextResponse.json({ error: 'no kid selected' }, { status: 400 });
  }

  const rl = await checkLLMRateLimit(kid.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { blocked: true, reason: rateLimitMessageJa(rl), rateLimited: true },
      { status: 429 },
    );
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const bot = await prisma.bot.findUnique({
    where: { id: params.botId },
    include: {
      owner: true,
      knowledgeCards: { orderBy: { order: 'asc' } },
      sources: true,
    },
  });
  if (!bot) {
    return NextResponse.json({ error: 'bot not found' }, { status: 404 });
  }
  if (!bot.isPublic && bot.ownerId !== kid.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // --- 1. 入力モデレーション ---
  const mod = await moderateInput({
    text: parsed.data.message,
    stage: 'chat',
  });
  await prisma.moderationLog.create({
    data: {
      stage: 'input',
      decision: mod.decision,
      categories: JSON.stringify(mod.categories),
      model: mod.model,
      reason: mod.reason,
      userId: kid.id,
    },
  });
  if (mod.decision === 'hard-block') {
    await prisma.incidentReport.create({
      data: {
        severity: 'alert',
        kind: 'hard-block',
        actorId: kid.id,
        summary: `チャット入力がハードブロック: ${mod.reason}`,
        payload: JSON.stringify({ categories: mod.categories }),
      },
    });
    return NextResponse.json(
      { blocked: true, reason: mod.reason },
      { status: 422 },
    );
  }

  // --- 2. システムプロンプト構築 ---
  const band =
    (kid.gradeProfile?.band as 'lower' | 'middle' | 'upper' | undefined) ??
    'middle';

  const systemBlocks = buildBotRuntimeSystem({
    bot: {
      name: bot.name,
      persona: bot.persona,
      topic: bot.topic,
      strengths: bot.strengths,
      weaknesses: bot.weaknesses,
    },
    ownerNickname: bot.owner.nickname ?? '(名前なし)',
    knowledgeCards: bot.knowledgeCards.map((c) => ({
      id: c.id,
      kind: c.kind,
      question: c.question,
      answer: c.answer,
      sourceIds: JSON.parse(c.sourceIds || '[]'),
    })),
    sources: bot.sources.map((s) => ({
      id: s.id,
      kind: s.kind,
      title: s.title,
      authorOrWho: s.authorOrWho,
      url: s.url,
    })),
    gradeBand: band,
  });

  const encoder = new TextEncoder();

  const sseStream = new ReadableStream({
    async start(controller) {
      function send(obj: unknown) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(obj)}\n\n`),
        );
      }
      try {
        const messages = [
          ...parsed.data.history.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: 'user' as const, content: parsed.data.message },
        ];

        let acc = '';
        let usageTokensIn = 0;
        let usageTokensOut = 0;
        let mocked = false;
        const iterable = stream({
          system: systemBlocks,
          messages,
          maxTokens: gradeMaxTokens(band),
          temperature: 0.3,
        });
        for await (const ev of iterable) {
          if (ev.type === 'delta') {
            acc += ev.delta;
            send({ type: 'delta', delta: ev.delta });
          } else if (ev.type === 'done') {
            usageTokensIn = ev.output.usage.inputTokens;
            usageTokensOut = ev.output.usage.outputTokens;
            mocked = ev.output.mocked;
          }
        }

        // --- 3. 出典の機械付与 ---
        const { cardIds, body } = parseCiteTag(acc);
        const referencedSourceIds = new Set<string>();
        for (const cid of cardIds) {
          const card = bot.knowledgeCards.find((c) => c.id === cid);
          if (!card) continue;
          for (const sid of JSON.parse(card.sourceIds || '[]') as string[]) {
            referencedSourceIds.add(sid);
          }
        }
        const citedSources = bot.sources.filter((s) =>
          referencedSourceIds.has(s.id),
        );
        const finalText = appendCitation(body, citedSources);

        // --- 4. DB 保存 ---
        const conversation = await prisma.conversation.create({
          data: {
            botId: bot.id,
            userId: kid.id,
            gradeProfileSnapshot: JSON.stringify({ band }),
          },
        });
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'user',
            content: parsed.data.message,
          },
        });
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'assistant',
            content: finalText,
            rawContent: acc,
            citedSourceIds: JSON.stringify([...referencedSourceIds]),
            tokensIn: usageTokensIn || null,
            tokensOut: usageTokensOut || null,
          },
        });
        await prisma.auditLog.create({
          data: {
            actorId: kid.id,
            action: 'llm-call',
            target: `Bot:${bot.id}`,
            model: 'claude-sonnet',
            tokensIn: usageTokensIn || null,
            tokensOut: usageTokensOut || null,
            meta: JSON.stringify({ route: 'chat', mocked }),
          },
        });

        send({ type: 'done', finalText, mocked });
        controller.close();
      } catch (err) {
        send({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
        controller.close();
      }
    },
  });

  return new Response(sseStream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
