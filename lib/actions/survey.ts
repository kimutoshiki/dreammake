'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth/session';
import { buildDefaultSurvey } from '@/lib/research/default-surveys';

/** 教員:既定テンプレから単元の pre/post サーベイを作成(既にあれば何もしない)。 */
export async function ensureDefaultSurveys(unitId: string) {
  const session = await readSession();
  if (!session || session.role !== 'teacher') {
    return { ok: false as const };
  }
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { stances: true },
  });
  if (!unit) return { ok: false as const };

  for (const kind of ['pre', 'post'] as const) {
    const exists = await prisma.surveyInstrument.findUnique({
      where: { unitId_kind: { unitId, kind } },
    });
    if (exists) continue;
    const template = buildDefaultSurvey(kind, {
      title: unit.title,
      themeQuestion: unit.themeQuestion,
      stances: unit.stances.map((s) => ({ label: s.label })),
    });
    await prisma.surveyInstrument.create({
      data: {
        unitId,
        kind,
        title: template.title,
        questions: JSON.stringify(template),
        openAt: new Date(),
      },
    });
  }
  revalidatePath(`/teacher/units/${unitId}`);
  return { ok: true as const };
}

const SubmitSchema = z.object({
  instrumentId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()),
});

export async function submitSurveyResponse(input: z.infer<typeof SubmitSchema>) {
  const session = await readSession();
  if (!session || session.role !== 'student') {
    return { ok: false as const, message: 'ログインして ください' };
  }
  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: '入力を 見直してね' };
  }

  await prisma.surveyResponse.upsert({
    where: {
      instrumentId_userId: {
        instrumentId: parsed.data.instrumentId,
        userId: session.userId,
      },
    },
    update: {
      answers: JSON.stringify(parsed.data.answers),
      submittedAt: new Date(),
    },
    create: {
      instrumentId: parsed.data.instrumentId,
      userId: session.userId,
      answers: JSON.stringify(parsed.data.answers),
    },
  });
  return { ok: true as const };
}
