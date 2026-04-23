'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth/session';
import { moderateInput } from '@/lib/moderation/input';

const CreateBotSchema = z.object({
  name: z.string().min(1).max(40),
  topic: z.string().min(1).max(80),
  persona: z.enum(['kind', 'funny', 'scholar', 'cheer', 'calm']),
  strengths: z.string().max(400).optional(),
  weaknesses: z.string().max(400).optional(),
});

export async function createBot(formData: FormData) {
  const session = await readSession();
  if (!session || session.role !== 'student') {
    return { ok: false as const, message: 'ログインして ください' };
  }
  const parsed = CreateBotSchema.safeParse({
    name: formData.get('name'),
    topic: formData.get('topic'),
    persona: formData.get('persona'),
    strengths: formData.get('strengths')?.toString() ?? '',
    weaknesses: formData.get('weaknesses')?.toString() ?? '',
  });
  if (!parsed.success) {
    return { ok: false as const, message: '入力を見直してね' };
  }
  const bot = await prisma.bot.create({
    data: {
      ownerId: session.userId,
      name: parsed.data.name,
      topic: parsed.data.topic,
      persona: parsed.data.persona,
      strengths: parsed.data.strengths ?? '',
      weaknesses: parsed.data.weaknesses ?? '',
      avatarSeed: parsed.data.name,
      isPublic: false,
    },
  });
  revalidatePath('/kids');
  redirect(`/kids/bots/${bot.id}/knowledge`);
}

const AddKnowledgeSchema = z.object({
  botId: z.string().min(1),
  question: z.string().max(300).optional(),
  answer: z.string().min(1).max(1500),
  sourceTitle: z.string().min(1).max(200),
  sourceKind: z.enum(['book', 'url', 'interview', 'observation', 'other']),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  sourceAuthor: z.string().max(200).optional(),
});

export async function addKnowledgeCard(formData: FormData) {
  const session = await readSession();
  if (!session || session.role !== 'student') {
    return { ok: false as const, message: 'ログインして ください' };
  }
  const parsed = AddKnowledgeSchema.safeParse({
    botId: formData.get('botId'),
    question: formData.get('question')?.toString() ?? '',
    answer: formData.get('answer'),
    sourceTitle: formData.get('sourceTitle'),
    sourceKind: formData.get('sourceKind'),
    sourceUrl: formData.get('sourceUrl')?.toString() ?? '',
    sourceAuthor: formData.get('sourceAuthor')?.toString() ?? '',
  });
  if (!parsed.success) {
    return { ok: false as const, message: 'どこから 調べたかを 書いてね(出典が 必須だよ)' };
  }

  const bot = await prisma.bot.findUnique({ where: { id: parsed.data.botId } });
  if (!bot || bot.ownerId !== session.userId) {
    return { ok: false as const, message: 'このボットは あなたのボットじゃないよ' };
  }

  // モデレーション
  const mod = await moderateInput({
    text: `${parsed.data.question ?? ''}\n${parsed.data.answer}`,
    stage: 'knowledge',
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
        'このことばは ここには 書かなくて いいよ。せんせいに 相談してみよう。',
    };
  }

  const source = await prisma.source.create({
    data: {
      botId: bot.id,
      kind: parsed.data.sourceKind,
      title: parsed.data.sourceTitle,
      authorOrWho: parsed.data.sourceAuthor || null,
      url: parsed.data.sourceUrl || null,
    },
  });
  const nextOrder = await prisma.knowledgeCard.count({ where: { botId: bot.id } });
  await prisma.knowledgeCard.create({
    data: {
      botId: bot.id,
      kind: 'qa',
      question: parsed.data.question || null,
      answer: parsed.data.answer,
      sourceIds: JSON.stringify([source.id]),
      order: nextOrder,
    },
  });

  revalidatePath(`/kids/bots/${bot.id}`);
  revalidatePath(`/kids/bots/${bot.id}/knowledge`);
  return { ok: true as const };
}
