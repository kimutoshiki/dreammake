/**
 * Server Component 用のガード。
 * 条件を満たさない場合は redirect する(テンプレ的な DRY 化)。
 */
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { readSession, type SessionPayload } from '@/lib/auth/session';

export async function requireSession(): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) redirect('/signin');
  return session;
}

export async function requireStudent() {
  const session = await requireSession();
  if (session.role !== 'student') redirect('/');
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { gradeProfile: true, school: true },
  });
  if (!user) redirect('/signin');
  return { session, user };
}

export async function requireTeacher() {
  const session = await requireSession();
  if (session.role !== 'teacher') redirect('/');
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { school: true },
  });
  if (!user) redirect('/signin');
  return { session, user };
}
