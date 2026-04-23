/**
 * 児童が 書いた日本語の リクエストから 画像を 生成する。
 *
 * 手順:
 *  1. レート制限
 *  2. 入力モデレーション(ルール + Haiku)
 *  3. Claude Haiku で 画像プロンプトを 安全化 + 英訳
 *  4. Gemini Imagen で 画像生成
 *  5. /public/uploads/<kidId>/ に 保存、Artwork レコード作成
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentKid } from '@/lib/context/kid';
import { prisma } from '@/lib/prisma';
import { completeJson } from '@/lib/llm/anthropic';
import { env } from '@/lib/env';
import { checkLLMRateLimit, rateLimitMessageJa } from '@/lib/rate-limit';
import { moderateInput } from '@/lib/moderation/input';
import { childSafetySystemBlock } from '@/lib/prompts/child-safety';
import {
  buildImageSafetySystem,
  coerceImageSafety,
  type ImageSafetyOutput,
} from '@/lib/prompts/image-safety';
import { generateImage } from '@/lib/integrations/gemini-image';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BodySchema = z.object({
  request: z.string().min(1).max(500),
  aspectRatio: z.enum(['1:1', '3:4', '4:3']).default('1:1'),
});

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');
const IMAGE_EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export async function POST(req: Request) {
  const { current: kid } = await getCurrentKid();
  if (!kid) {
    return NextResponse.json({ error: 'no kid selected' }, { status: 400 });
  }

  const rl = await checkLLMRateLimit(kid.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: rateLimitMessageJa(rl), rateLimited: true },
      { status: 429 },
    );
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  // 入力モデレーション
  const mod = await moderateInput({ text: parsed.data.request, stage: 'image-prompt' });
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
    return NextResponse.json(
      { blocked: true, reason: 'その ことばは 絵には しないでおこうね' },
      { status: 422 },
    );
  }

  const band =
    (kid.gradeProfile?.band as 'lower' | 'middle' | 'upper' | undefined) ??
    'middle';

  // Claude で 安全化 + 英訳
  let safety: ImageSafetyOutput;
  try {
    safety = await completeJson(
      {
        system: [
          childSafetySystemBlock(),
          { text: buildImageSafetySystem(band) },
        ],
        messages: [{ role: 'user', content: parsed.data.request }],
        model: env.ANTHROPIC_MODEL_MODERATION,
        temperature: 0.2,
        maxTokens: 600,
      },
      coerceImageSafety,
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  await prisma.auditLog.create({
    data: {
      actorId: kid.id,
      action: 'llm-call',
      target: 'image-safety',
      model: env.ANTHROPIC_MODEL_MODERATION,
      meta: JSON.stringify({
        decision: safety.decision,
        had_rewrite: Boolean(safety.rewriteNotes?.length),
      }),
    },
  });

  if (safety.decision === 'refuse') {
    return NextResponse.json({
      refused: true,
      reason:
        safety.refuseReasonJa ??
        'そのテーマは ここでは 作れないよ。別の アイデアを ためしてみよう!',
    });
  }
  if (!safety.promptEn) {
    return NextResponse.json({
      refused: true,
      reason: 'うまく プロンプトが 作れなかったよ。別の 言い方で 書いてみよう。',
    });
  }

  // Gemini で 画像生成
  let result;
  try {
    result = await generateImage(safety.promptEn, parsed.data.aspectRatio);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }

  // ファイル保存
  const ext = IMAGE_EXT_BY_MIME[result.mimeType] ?? 'png';
  const id = randomUUID();
  const relPath = path.join(kid.id, `${id}.${ext}`);
  const absPath = path.join(UPLOAD_ROOT, relPath);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, result.bytes);
  const publicUrl = `/uploads/${kid.id}/${id}.${ext}`;

  // Artwork レコード
  const artwork = await prisma.artwork.create({
    data: {
      ownerId: kid.id,
      kind: 'image',
      title: parsed.data.request.slice(0, 60),
      imageUrl: publicUrl,
      imageProvider: 'gemini',
      imageModel: result.model,
      finalPrompt: safety.promptEn,
      safetyFilteredPrompt: safety.promptEn,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: kid.id,
      action: 'image-gen',
      target: `Artwork:${artwork.id}`,
      model: result.model,
      meta: JSON.stringify({ mocked: result.mocked, mime: result.mimeType }),
    },
  });

  return NextResponse.json({
    ok: true,
    artworkId: artwork.id,
    url: publicUrl,
    mocked: result.mocked,
    rewritten: safety.decision === 'rewrite',
  });
}
