'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth/session';
import { moderateInput } from '@/lib/moderation/input';

const Schema = z.object({
  unitId: z.string().min(1),
  askedPrompt: z.string().max(1000),
  aiResponseDigest: z.string().max(3000),
  hypothesisText: z.string().min(1).max(800),
  evidence: z.string().max(800).optional(),
  shared: z.boolean().default(false),
});

export async function saveMissingVoiceHypothesis(input: z.infer<typeof Schema>) {
  const session = await readSession();
  if (!session || session.role !== 'student') {
    return { ok: false as const, message: 'ログインして ください' };
  }
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: '入力を 見直してね' };
  }

  const mod = await moderateInput({
    text: parsed.data.hypothesisText,
    stage: 'reflection',
  });
  await prisma.moderationLog.create({
    data: {
      stage: 'input',
      decision: mod.decision,
      categories: JSON.stringify(mod.categories),
      model: mod.model,
      reason: mod.reason,
      userId: session.userId,
    },
  });
  if (mod.decision === 'hard-block') {
    return {
      ok: false as const,
      message:
        'そのことばは ここには 書かなくて いいよ。せんせいに 相談してみよう。',
    };
  }

  await prisma.missingVoiceHypothesis.create({
    data: {
      unitId: parsed.data.unitId,
      userId: session.userId,
      askedPrompt: parsed.data.askedPrompt,
      aiResponseDigest: parsed.data.aiResponseDigest,
      hypothesisText: parsed.data.hypothesisText,
      evidence: parsed.data.evidence ?? null,
      shared: parsed.data.shared,
    },
  });
  revalidatePath(`/kids/units/${parsed.data.unitId}`);
  return { ok: true as const };
}
