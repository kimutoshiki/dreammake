'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentTeacher } from '@/lib/context/teacher';
import { postToClassSheet } from '@/lib/integrations/sheets';

const UpdateSheetsSchema = z.object({
  classId: z.string().min(1),
  webhookUrl: z.string().url().or(z.literal('')),
  webhookSecret: z.string().max(200).optional(),
});

export async function updateClassSheetsConfig(formData: FormData) {
  const { current: teacher } = await getCurrentTeacher();
  if (!teacher) {
    return { ok: false as const, message: '教員が 選ばれていません' };
  }
  const parsed = UpdateSheetsSchema.safeParse({
    classId: formData.get('classId'),
    webhookUrl: formData.get('webhookUrl')?.toString() ?? '',
    webhookSecret: formData.get('webhookSecret')?.toString() ?? '',
  });
  if (!parsed.success) {
    return { ok: false as const, message: 'URL が正しくありません' };
  }
  // 教員がそのクラスに所属しているか確認
  const membership = await prisma.classMembership.findFirst({
    where: {
      classId: parsed.data.classId,
      userId: teacher.id,
      role: 'teacher',
    },
  });
  if (!membership) {
    return { ok: false as const, message: 'このクラスを編集する権限がありません' };
  }

  await prisma.class.update({
    where: { id: parsed.data.classId },
    data: {
      sheetsWebhookUrl: parsed.data.webhookUrl || null,
      sheetsWebhookSecret: parsed.data.webhookSecret || null,
    },
  });
  revalidatePath(`/teacher/classes/${parsed.data.classId}`);
  return { ok: true as const };
}

export async function testSheetsConnection(classId: string) {
  const { current: teacher } = await getCurrentTeacher();
  if (!teacher) {
    return { ok: false as const, message: '教員が 選ばれていません' };
  }
  const membership = await prisma.classMembership.findFirst({
    where: { classId, userId: teacher.id, role: 'teacher' },
  });
  if (!membership) {
    return { ok: false as const, message: 'このクラスを編集する権限がありません' };
  }
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { sheetsWebhookUrl: true, sheetsWebhookSecret: true, name: true },
  });
  if (!cls?.sheetsWebhookUrl || !cls.sheetsWebhookSecret) {
    return { ok: false as const, message: '先に URL と シークレットを 設定してください' };
  }

  try {
    await postToClassSheet(classId, {
      kind: 'reflection',
      timestamp: new Date().toISOString(),
      student: { nickname: '(接続テスト)', handle: null },
      className: cls.name,
      unitTitle: '—',
      title: 'テスト送信',
      content: 'このメッセージが Google スプレッドシートに追加されていれば設定成功です。',
      extra: { test: true, via: 'teacher-ui' },
    });
    return { ok: true as const, message: 'テスト送信しました。スプレッドシートを 確認してください。' };
  } catch (err) {
    return {
      ok: false as const,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
