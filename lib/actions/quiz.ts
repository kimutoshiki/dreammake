'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { moderateInput } from '@/lib/moderation/input';

/**
 * 児童が作る「自分のクイズ」。
 * 画面でブロックのように 問いと こたえを ならべて 保存する ノーコード体験。
 */
const QuestionSchema = z.object({
  questionText: z.string().min(1).max(200),
  options: z.array(z.string().min(1).max(100)).min(2).max(4),
  correctIndex: z.number().int().min(0).max(3),
  hint: z.string().max(200).optional(),
});

const CreateQuizSchema = z.object({
  title: z.string().min(1).max(60),
  description: z.string().max(400).optional(),
  questions: z.array(QuestionSchema).min(1).max(20),
  isPublic: z.boolean().default(false),
});

export type QuizSpec = z.infer<typeof CreateQuizSchema>;

export async function createQuizArtwork(spec: QuizSpec) {
  const { current: kid } = await getCurrentKid();
  if (!kid) {
    return { ok: false as const, message: '児童が 選ばれていないよ' };
  }
  const parsed = CreateQuizSchema.safeParse(spec);
  if (!parsed.success) {
    return { ok: false as const, message: '問題を 見直してね' };
  }

  // モデレーション: 全テキストを連結して一気に判定
  const allText = [
    parsed.data.title,
    parsed.data.description ?? '',
    ...parsed.data.questions.flatMap((q) => [q.questionText, ...q.options, q.hint ?? '']),
  ].join('\n');
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
      message:
        'そのことばは クイズには 書かないでね。せんせいに 相談してみよう。',
    };
  }

  const artwork = await prisma.artwork.create({
    data: {
      ownerId: kid.id,
      kind: 'quiz',
      title: parsed.data.title,
      quizKind: 'self-made',
      quizSpec: JSON.stringify(parsed.data),
    },
  });
  revalidatePath('/kids');
  revalidatePath('/kids/gallery');
  return { ok: true as const, artworkId: artwork.id };
}
