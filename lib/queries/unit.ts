/**
 * Unit 関連のクエリヘルパー。
 * 画面から再利用される取得ロジックをまとめる。
 */
import { prisma } from '@/lib/prisma';

export async function getUnitForStudent(unitId: string, studentUserId: string) {
  // メンバーシップを経由で所属確認してから取得
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: {
      class: {
        include: {
          memberships: {
            where: { userId: studentUserId },
            select: { role: true },
          },
        },
      },
      hours: { orderBy: { hourIndex: 'asc' } },
      stances: { orderBy: { createdAt: 'asc' } },
      bots: { include: { bot: { include: { owner: true } } } },
      surveys: true,
    },
  });
  if (!unit) return null;
  if (unit.class.memberships.length === 0) return null;
  return unit;
}

export async function getUnitForTeacher(unitId: string, teacherUserId: string) {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: {
      class: {
        include: {
          memberships: {
            where: { userId: teacherUserId, role: 'teacher' },
          },
        },
      },
      hours: { orderBy: { hourIndex: 'asc' } },
      stances: { orderBy: { createdAt: 'asc' } },
      surveys: true,
      bots: { include: { bot: true } },
    },
  });
  if (!unit) return null;
  if (unit.class.memberships.length === 0) return null;
  return unit;
}
