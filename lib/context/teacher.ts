/**
 * 教員ページの「いま誰として操作しているか」を Cookie で保持。
 * 認証ではなく、デモ用の簡易セレクタ。シード時点では教員は 1 人なので、
 * デフォルトはその 1 人。複数教員がいる場合は切替 UI を後から足せる。
 */
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'stk_teacher_id';

export async function getSelectedTeacherId(): Promise<string | null> {
  return cookies().get(COOKIE_NAME)?.value ?? null;
}

export function setSelectedTeacherId(id: string) {
  cookies().set(COOKIE_NAME, id, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getCurrentTeacher() {
  const picked = await getSelectedTeacherId();
  const allTeachers = await prisma.user.findMany({
    where: { role: 'teacher' },
    select: { id: true, nickname: true, email: true },
    orderBy: [{ email: 'asc' }],
  });
  if (allTeachers.length === 0) {
    return { current: null, allTeachers: [] };
  }
  const targetId = picked && allTeachers.some((t) => t.id === picked)
    ? picked
    : allTeachers[0]!.id;
  const current = await prisma.user.findUnique({
    where: { id: targetId },
    include: { school: true },
  });
  return { current, allTeachers };
}
