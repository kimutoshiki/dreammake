'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { moderateInput } from '@/lib/moderation/input';

const CreateSchema = z.object({
  title: z.string().min(1).max(80),
  locationNote: z.string().max(200).optional().or(z.literal('')),
  notes: z.string().max(4000).optional().or(z.literal('')),
  artworkIds: z.array(z.string()).max(12).default([]),
});

export async function createFieldNote(input: z.infer<typeof CreateSchema>) {
  const { current: kid } = await getCurrentKid();
  if (!kid) return { ok: false as const, message: '児童が 選ばれていないよ' };
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: '入力を 見直してね' };

  const joined = [parsed.data.title, parsed.data.notes, parsed.data.locationNote]
    .filter(Boolean)
    .join('\n');
  const mod = await moderateInput({ text: joined, stage: 'reflection' });
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
      message: 'その ことばは ここには 書かないでね。',
    };
  }

  const ids = parsed.data.artworkIds;
  if (ids.length > 0) {
    const ownedCount = await prisma.artwork.count({
      where: { id: { in: ids }, ownerId: kid.id },
    });
    if (ownedCount !== ids.length) {
      return { ok: false as const, message: '自分の さくひんだけ えらんでね' };
    }
  }

  const note = await prisma.fieldNote.create({
    data: {
      userId: kid.id,
      title: parsed.data.title,
      notes: parsed.data.notes ?? '',
      locationNote: parsed.data.locationNote || null,
      artworkIds: JSON.stringify(ids),
    },
  });

  revalidatePath('/kids/notebook');
  redirect(`/kids/notebook/${note.id}`);
}

const UpdateSchema = CreateSchema.extend({ id: z.string().min(1) });

export async function updateFieldNote(input: z.infer<typeof UpdateSchema>) {
  const { current: kid } = await getCurrentKid();
  if (!kid) return { ok: false as const, message: '児童が 選ばれていないよ' };
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: '入力を 見直してね' };

  const note = await prisma.fieldNote.findUnique({ where: { id: parsed.data.id } });
  if (!note || note.userId !== kid.id) {
    return { ok: false as const, message: 'このノートは あなたの ものじゃないよ' };
  }

  const joined = [parsed.data.title, parsed.data.notes, parsed.data.locationNote]
    .filter(Boolean)
    .join('\n');
  const mod = await moderateInput({ text: joined, stage: 'reflection' });
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
    return { ok: false as const, message: 'そのことばは ここには 書かないでね。' };
  }

  if (parsed.data.artworkIds.length > 0) {
    const ownedCount = await prisma.artwork.count({
      where: { id: { in: parsed.data.artworkIds }, ownerId: kid.id },
    });
    if (ownedCount !== parsed.data.artworkIds.length) {
      return { ok: false as const, message: '自分の さくひんだけ えらんでね' };
    }
  }

  await prisma.fieldNote.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      locationNote: parsed.data.locationNote || null,
      notes: parsed.data.notes ?? '',
      artworkIds: JSON.stringify(parsed.data.artworkIds),
    },
  });
  revalidatePath('/kids/notebook');
  revalidatePath(`/kids/notebook/${parsed.data.id}`);
  return { ok: true as const };
}
