'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { moderateInput } from '@/lib/moderation/input';
import { detectStandstillWords } from '@/lib/research/standstill-rules';
import { postToUnitSheet } from '@/lib/integrations/sheets';

const Schema = z.object({
  unitId: z.string().min(1),
  prompt: z.string().max(300),
  text: z.string().min(1).max(4000),
  hourIndex: z.coerce.number().int().optional(),
  phase: z.enum(['pre', 'during', 'post']).default('during'),
});

export async function saveReflection(formData: FormData) {
  const { current: kid } = await getCurrentKid();
  if (!kid) {
    return { ok: false as const, message: '児童が 選ばれていないよ' };
  }
  const parsed = Schema.safeParse({
    unitId: formData.get('unitId'),
    prompt: formData.get('prompt'),
    text: formData.get('text'),
    hourIndex: formData.get('hourIndex') ?? undefined,
    phase: formData.get('phase') ?? 'during',
  });
  if (!parsed.success) {
    return { ok: false as const, message: '入力を 見直してね' };
  }

  const mod = await moderateInput({
    text: parsed.data.text,
    stage: 'reflection',
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
    return {
      ok: false as const,
      message: 'そのことばは ここには 書かなくて いいよ。せんせいに 相談してみよう。',
    };
  }

  const detection = detectStandstillWords(parsed.data.text);

  const entry = await prisma.reflectionEntry.create({
    data: {
      unitId: parsed.data.unitId,
      userId: kid.id,
      prompt: parsed.data.prompt,
      text: parsed.data.text,
      wordCount: parsed.data.text.length,
      standstillWords: JSON.stringify(detection.matches),
      standstillCount: detection.total,
      phase: parsed.data.phase,
      hourIndex: parsed.data.hourIndex ?? null,
    },
  });
  revalidatePath(`/kids/units/${parsed.data.unitId}`);
  revalidatePath(`/kids/units/${parsed.data.unitId}/reflect`);

  // Google スプレッドシート 連携(webhook 未設定なら no-op)
  await postToUnitSheet(parsed.data.unitId, {
    kind: 'reflection',
    timestamp: entry.createdAt.toISOString(),
    student: { nickname: kid.nickname, handle: kid.handle },
    title: parsed.data.prompt,
    content: parsed.data.text,
    extra: {
      phase: parsed.data.phase,
      standstill_count: detection.total,
      word_count: parsed.data.text.length,
    },
  });

  return {
    ok: true as const,
    entryId: entry.id,
    standstillCount: detection.total,
    matches: detection.matches,
  };
}
