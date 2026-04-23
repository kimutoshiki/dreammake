/**
 * 「声が聞こえていないのはだれ?」の API。
 * 児童が直近の対話(任意)と Unit コンテキストを渡すと、
 * AI が自己診断した「強く出ていた立場」と「出ていなかったかもしれない立場」を返す。
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { completeJson } from '@/lib/llm/anthropic';
import {
  buildMissingVoiceSystem,
  type MissingVoiceOutput,
} from '@/lib/prompts/missing-voice';

export const runtime = 'nodejs';

const BodySchema = z.object({
  recentExchange: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      }),
    )
    .max(12)
    .default([]),
  childNote: z.string().max(400).optional(),
});

function coerce(raw: unknown): MissingVoiceOutput {
  const r = raw as Partial<MissingVoiceOutput>;
  return {
    prominentInRecentExchange: Array.isArray(r.prominentInRecentExchange)
      ? r.prominentInRecentExchange.map((x) => ({
          label: String(x?.label ?? ''),
          whyProminent: String(x?.whyProminent ?? ''),
        }))
      : [],
    possiblyMissingVoices: Array.isArray(r.possiblyMissingVoices)
      ? r.possiblyMissingVoices.map((x) => ({
          label: String(x?.label ?? ''),
          whyMightBeMissing: String(x?.whyMightBeMissing ?? ''),
          suggestedProbe: String(x?.suggestedProbe ?? ''),
        }))
      : [],
    invitation: String(r.invitation ?? ''),
    sourceHint: String(r.sourceHint ?? ''),
  };
}

export async function POST(
  req: Request,
  { params }: { params: { unitId: string } },
) {
  const session = await readSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  }
  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const unit = await prisma.unit.findUnique({
    where: { id: params.unitId },
    include: { stances: true },
  });
  if (!unit) {
    return NextResponse.json({ error: 'unit not found' }, { status: 404 });
  }

  const student = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { gradeProfile: true },
  });
  const band =
    (student?.gradeProfile?.band as 'lower' | 'middle' | 'upper' | undefined) ??
    'middle';

  const system = buildMissingVoiceSystem({
    unit: {
      title: unit.title,
      themeQuestion: unit.themeQuestion,
      knownStances: unit.stances.map((s) => ({
        label: s.label,
        summary: s.summary,
      })),
    },
    recentExchange: parsed.data.recentExchange,
    childNote: parsed.data.childNote,
    gradeBand: band,
  });

  try {
    const output = await completeJson(
      {
        system: { text: system },
        messages: [
          {
            role: 'user',
            content:
              'AI の応答に強く出ていた立場、出てこなかったかもしれない立場、そして私への問いを JSON で返してください。',
          },
        ],
        temperature: 0.5,
        maxTokens: 900,
      },
      coerce,
    );

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: 'llm-call',
        target: `Unit:${unit.id}:missing-voice`,
        model: 'claude-sonnet',
        meta: JSON.stringify({ route: 'missing-voice' }),
      },
    });

    return NextResponse.json(output);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
