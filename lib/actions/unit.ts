'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth/session';

const CreateUnitSchema = z.object({
  classId: z.string().min(1),
  title: z.string().min(1).max(80),
  themeQuestion: z.string().min(1).max(200),
  coreInquiry: z.string().max(500).optional(),
  plannedHours: z.coerce.number().int().min(1).max(30),
  researchMode: z.boolean().optional(),
});

export async function createUnit(formData: FormData) {
  const session = await readSession();
  if (!session || session.role !== 'teacher') {
    return { ok: false as const, message: 'ログインしてください' };
  }
  const parsed = CreateUnitSchema.safeParse({
    classId: formData.get('classId'),
    title: formData.get('title'),
    themeQuestion: formData.get('themeQuestion'),
    coreInquiry: formData.get('coreInquiry')?.toString() ?? '',
    plannedHours: formData.get('plannedHours'),
    researchMode: formData.get('researchMode') === 'on',
  });
  if (!parsed.success) {
    return { ok: false as const, message: '入力を見直してください' };
  }
  const unit = await prisma.unit.create({
    data: {
      classId: parsed.data.classId,
      createdById: session.userId,
      title: parsed.data.title,
      themeQuestion: parsed.data.themeQuestion,
      coreInquiry: parsed.data.coreInquiry ?? '',
      plannedHours: parsed.data.plannedHours,
      researchMode: parsed.data.researchMode ?? false,
      status: 'draft',
    },
  });
  // 時数を既定で並べる
  for (let i = 1; i <= parsed.data.plannedHours; i++) {
    await prisma.unitHour.create({
      data: {
        unitId: unit.id,
        hourIndex: i,
        topic: i === 1 ? '導入・問いの共有' : `第${i}時`,
        aiInsertion: 'none',
        plannedActivities: '',
      },
    });
  }
  revalidatePath('/teacher');
  redirect(`/teacher/units/${unit.id}`);
}

const UpdateStatusSchema = z.object({
  unitId: z.string().min(1),
  status: z.enum(['draft', 'active', 'closed']),
});

export async function updateUnitStatus(input: z.infer<typeof UpdateStatusSchema>) {
  const session = await readSession();
  if (!session || session.role !== 'teacher') {
    return { ok: false as const, message: 'ログインしてください' };
  }
  const parsed = UpdateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: '入力を見直してください' };
  }
  await prisma.unit.update({
    where: { id: parsed.data.unitId },
    data: { status: parsed.data.status },
  });
  revalidatePath(`/teacher/units/${parsed.data.unitId}`);
  return { ok: true as const };
}

const AddStanceSchema = z.object({
  unitId: z.string().min(1),
  label: z.string().min(1).max(60),
  summary: z.string().max(300),
  icon: z.string().max(8).optional(),
});

export async function addStance(formData: FormData) {
  const session = await readSession();
  if (!session || session.role !== 'teacher') {
    return { ok: false as const, message: 'ログインしてください' };
  }
  const parsed = AddStanceSchema.safeParse({
    unitId: formData.get('unitId'),
    label: formData.get('label'),
    summary: formData.get('summary')?.toString() ?? '',
    icon: formData.get('icon')?.toString() ?? '',
  });
  if (!parsed.success) {
    return { ok: false as const, message: '入力を見直してください' };
  }
  await prisma.stance.create({
    data: {
      unitId: parsed.data.unitId,
      label: parsed.data.label,
      summary: parsed.data.summary,
      icon: parsed.data.icon || null,
      proposedBy: 'teacher',
      proposerUserId: session.userId,
    },
  });
  revalidatePath(`/teacher/units/${parsed.data.unitId}`);
  return { ok: true as const };
}

const UpdateHourAISchema = z.object({
  hourId: z.string().min(1),
  aiInsertion: z.enum(['none', 'before-self', 'after-self', 'ask-missing']),
});

export async function updateHourAI(input: z.infer<typeof UpdateHourAISchema>) {
  const session = await readSession();
  if (!session || session.role !== 'teacher') {
    return { ok: false as const, message: 'ログインしてください' };
  }
  const parsed = UpdateHourAISchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: '入力を見直してください' };
  }
  const hour = await prisma.unitHour.update({
    where: { id: parsed.data.hourId },
    data: { aiInsertion: parsed.data.aiInsertion },
  });
  revalidatePath(`/teacher/units/${hour.unitId}`);
  return { ok: true as const };
}
