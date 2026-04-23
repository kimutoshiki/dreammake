'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentTeacher } from '@/lib/context/teacher';
import { FEEDBACK_STAMPS, type FeedbackStampId } from '@/lib/feedback/stamps';

const STAMP_IDS = FEEDBACK_STAMPS.map((s) => s.id) as readonly FeedbackStampId[];

const ToggleSchema = z.object({
  artworkId: z.string().optional(),
  fieldNoteId: z.string().optional(),
  stamp: z.enum(STAMP_IDS as unknown as [FeedbackStampId, ...FeedbackStampId[]]),
});

export async function toggleFeedbackStamp(input: z.infer<typeof ToggleSchema>) {
  const { current: teacher } = await getCurrentTeacher();
  if (!teacher) return { ok: false as const, message: '教員が 選ばれていません' };
  const parsed = ToggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: '入力エラー' };
  const { artworkId, fieldNoteId, stamp } = parsed.data;
  if (!artworkId && !fieldNoteId) {
    return { ok: false as const, message: '対象が指定されていません' };
  }

  // 権限チェック: 教員がそのクラスの児童に紐づく作品・ノートのみ触れる
  if (artworkId) {
    const owner = await prisma.artwork.findUnique({
      where: { id: artworkId },
      select: {
        owner: {
          select: {
            memberships: {
              where: { role: 'student' },
              select: { classId: true },
            },
          },
        },
      },
    });
    const classIds = owner?.owner.memberships.map((m) => m.classId) ?? [];
    const teacherIn = await prisma.classMembership.findFirst({
      where: { userId: teacher.id, role: 'teacher', classId: { in: classIds } },
    });
    if (!teacherIn) return { ok: false as const, message: '権限がありません' };
  }
  if (fieldNoteId) {
    const note = await prisma.fieldNote.findUnique({
      where: { id: fieldNoteId },
      select: {
        user: {
          select: {
            memberships: {
              where: { role: 'student' },
              select: { classId: true },
            },
          },
        },
      },
    });
    const classIds = note?.user.memberships.map((m) => m.classId) ?? [];
    const teacherIn = await prisma.classMembership.findFirst({
      where: { userId: teacher.id, role: 'teacher', classId: { in: classIds } },
    });
    if (!teacherIn) return { ok: false as const, message: '権限がありません' };
  }

  // 既存チェック → toggle
  const existing = await prisma.feedback.findFirst({
    where: {
      teacherId: teacher.id,
      artworkId: artworkId ?? null,
      fieldNoteId: fieldNoteId ?? null,
      stamp,
    },
  });
  if (existing) {
    await prisma.feedback.delete({ where: { id: existing.id } });
  } else {
    await prisma.feedback.create({
      data: {
        teacherId: teacher.id,
        artworkId: artworkId ?? null,
        fieldNoteId: fieldNoteId ?? null,
        stamp,
      },
    });
  }

  if (artworkId) revalidatePath(`/teacher/classes`);
  if (fieldNoteId) revalidatePath(`/teacher/classes`);
  revalidatePath('/kids/gallery');
  revalidatePath('/kids/notebook');

  return { ok: true as const, toggled: !existing };
}
