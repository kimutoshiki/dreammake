'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { moderateInput } from '@/lib/moderation/input';
import { postToUnitSheet } from '@/lib/integrations/sheets';

const Schema = z.object({
  unitId: z.string().min(1),
  stanceId: z.string().optional(),
  customLabel: z.string().max(60).optional(),
  strength: z.coerce.number().int().min(1).max(5),
  reasoning: z.string().min(1).max(500),
  phase: z.enum(['pre', 'early', 'mid', 'late', 'post']).default('mid'),
});

export async function recordStance(formData: FormData) {
  const { current: kid } = await getCurrentKid();
  if (!kid) {
    return { ok: false as const, message: '児童が 選ばれていないよ' };
  }
  const parsed = Schema.safeParse({
    unitId: formData.get('unitId'),
    stanceId: formData.get('stanceId')?.toString() || undefined,
    customLabel: formData.get('customLabel')?.toString() || undefined,
    strength: formData.get('strength'),
    reasoning: formData.get('reasoning'),
    phase: formData.get('phase') ?? 'mid',
  });
  if (!parsed.success) {
    return { ok: false as const, message: '入力を 見直してね' };
  }
  if (!parsed.data.stanceId && !parsed.data.customLabel) {
    return { ok: false as const, message: '立場を 選ぶか、新しく 書いてね' };
  }

  const mod = await moderateInput({
    text: parsed.data.reasoning,
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

  const snap = await prisma.stanceSnapshot.create({
    data: {
      unitId: parsed.data.unitId,
      userId: kid.id,
      stanceId: parsed.data.stanceId ?? null,
      customLabel: parsed.data.customLabel ?? null,
      strength: parsed.data.strength,
      reasoning: parsed.data.reasoning,
      phase: parsed.data.phase,
      source: 'self',
    },
    include: { stance: true },
  });
  revalidatePath(`/kids/units/${parsed.data.unitId}`);
  revalidatePath(`/kids/units/${parsed.data.unitId}/stance`);

  await postToUnitSheet(parsed.data.unitId, {
    kind: 'stance',
    timestamp: snap.createdAt.toISOString(),
    student: { nickname: kid.nickname, handle: kid.handle },
    title: snap.stance?.label ?? snap.customLabel ?? '(未分類)',
    content: parsed.data.reasoning,
    extra: {
      phase: parsed.data.phase,
      strength: parsed.data.strength,
      custom_label: parsed.data.customLabel ?? null,
    },
  });

  return { ok: true as const };
}
