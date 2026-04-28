'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { moderateInput } from '@/lib/moderation/input';

/**
 * 児童が作る「もぐらたたき風」ゲーム。
 * 出る もの の 絵文字、時間、スピードを 選ぶだけで 自分の ゲームに なる。
 */
const CreateGameSchema = z.object({
  title: z.string().min(1).max(60),
  // 出てくる絵文字(タップで 得点)
  goodEmojis: z.array(z.string().min(1).max(8)).min(1).max(8),
  // タップしては だめな絵文字(任意)
  badEmojis: z.array(z.string().min(1).max(8)).max(4).default([]),
  durationSec: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  speed: z.enum(['slow', 'medium', 'fast']),
});

export type GameSpec = z.infer<typeof CreateGameSchema>;

export async function createGameArtwork(spec: GameSpec) {
  const { current: kid } = await getCurrentKid();
  if (!kid) {
    return { ok: false as const, message: '児童が 選ばれていないよ' };
  }
  const parsed = CreateGameSchema.safeParse(spec);
  if (!parsed.success) {
    return { ok: false as const, message: 'ゲームの せってい を 見直してね' };
  }

  // タイトルだけ モデレーション(絵文字は スキップ)
  const mod = await moderateInput({ text: parsed.data.title, stage: 'comment' });
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
      message: 'タイトルを かえてね。やさしい ことばで。',
    };
  }

  const artwork = await prisma.artwork.create({
    data: {
      ownerId: kid.id,
      kind: 'game',
      title: parsed.data.title,
      gameSpec: JSON.stringify(parsed.data),
    },
  });
  revalidatePath('/kids');
  revalidatePath('/kids/gallery');
  return { ok: true as const, artworkId: artwork.id };
}
