'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { moderateInput } from '@/lib/moderation/input';

/**
 * 児童が作る「ノーコードプログラミング」。
 * グリッド上の 主人公(亀など)に めいれい を 並べて、ゴールを めざす。
 * めいれい:すすむ / ひだり / みぎ / 〇かい くりかえす / いう。
 */
const CommandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('forward') }),
  z.object({ kind: z.literal('left') }),
  z.object({ kind: z.literal('right') }),
  z.object({ kind: z.literal('say'), text: z.string().min(1).max(40) }),
  z.object({
    kind: z.literal('repeat'),
    times: z.number().int().min(2).max(10),
    body: z.array(
      z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('forward') }),
        z.object({ kind: z.literal('left') }),
        z.object({ kind: z.literal('right') }),
        z.object({ kind: z.literal('say'), text: z.string().min(1).max(40) }),
      ]),
    ).min(1).max(8),
  }),
]);

const CreateProgramSchema = z.object({
  title: z.string().min(1).max(60),
  hero: z.string().min(1).max(8),                         // 主人公絵文字
  goal: z.string().min(1).max(8).default('🎯'),          // ゴール絵文字
  startX: z.number().int().min(0).max(4),
  startY: z.number().int().min(0).max(4),
  goalX: z.number().int().min(0).max(4),
  goalY: z.number().int().min(0).max(4),
  commands: z.array(CommandSchema).min(1).max(40),
});

export type ProgramSpec = z.infer<typeof CreateProgramSchema>;
export type Command = z.infer<typeof CommandSchema>;

export async function createProgramArtwork(spec: ProgramSpec) {
  const { current: kid } = await getCurrentKid();
  if (!kid) {
    return { ok: false as const, message: '児童が 選ばれていないよ' };
  }
  const parsed = CreateProgramSchema.safeParse(spec);
  if (!parsed.success) {
    return { ok: false as const, message: 'めいれい を 見直してね' };
  }

  // タイトル と すべての say テキスト を モデレーション
  function collectText(cs: Command[]): string[] {
    const out: string[] = [];
    for (const c of cs) {
      if (c.kind === 'say') out.push(c.text);
      if (c.kind === 'repeat') {
        for (const inner of c.body) if (inner.kind === 'say') out.push(inner.text);
      }
    }
    return out;
  }
  const allText = [parsed.data.title, ...collectText(parsed.data.commands)].join('\n');
  const mod = await moderateInput({ text: allText, stage: 'comment' });
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
      message: 'やさしい ことばに かえてね。',
    };
  }

  const artwork = await prisma.artwork.create({
    data: {
      ownerId: kid.id,
      kind: 'program',
      title: parsed.data.title,
      programSpec: JSON.stringify(parsed.data),
    },
  });
  revalidatePath('/kids');
  revalidatePath('/kids/gallery');
  return { ok: true as const, artworkId: artwork.id };
}
