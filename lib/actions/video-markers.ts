'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { moderateInput } from '@/lib/moderation/input';

const SaveSchema = z.object({
  artworkId: z.string().min(1),
  markers: z
    .array(
      z.object({
        t: z.number().min(0).max(3600),
        label: z.string().min(1).max(80),
      }),
    )
    .max(20),
});

export async function saveVideoMarkers(input: z.infer<typeof SaveSchema>) {
  const { current: kid } = await getCurrentKid();
  if (!kid) return { ok: false as const, message: '児童が 選ばれていないよ' };
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: '入力エラー' };

  const art = await prisma.artwork.findUnique({
    where: { id: parsed.data.artworkId },
    select: { id: true, ownerId: true, kind: true },
  });
  if (!art || art.ownerId !== kid.id || art.kind !== 'video') {
    return { ok: false as const, message: '動画が みつかりませんでした' };
  }

  const joined = parsed.data.markers.map((m) => m.label).join('\n');
  if (joined) {
    const mod = await moderateInput({ text: joined, stage: 'comment' });
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
        message: 'その ことばは マーカーには つけないでね',
      };
    }
  }

  await prisma.artwork.update({
    where: { id: art.id },
    data: {
      videoScript: JSON.stringify({ markers: parsed.data.markers }),
    },
  });

  revalidatePath('/kids/gallery');
  revalidatePath(`/kids/gallery/video/${art.id}`);
  return { ok: true as const };
}
