/**
 * ログイン/ログアウトの Server Action。
 *
 * 連続失敗でのロックアウトは `User.failedLoginCount` と `lockedUntil` で管理。
 */
'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import {
  canonicalizeEmojiPassword,
  verifyPassword,
} from '@/lib/auth/password';
import {
  clearSessionCookie,
  createSession,
  setSessionCookie,
} from '@/lib/auth/session';

const StudentLoginSchema = z.object({
  schoolCode: z.string().min(1).max(40),
  handle: z.string().min(1).max(40),
  emojiIds: z.array(z.string()).min(2).max(6),
});

const TeacherLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export type LoginResult = { ok: true } | { ok: false; message: string };

/** 児童ログイン:学校コード + 児童 ID + 絵柄パスワード。 */
export async function studentLogin(formData: FormData): Promise<LoginResult> {
  const raw = {
    schoolCode: String(formData.get('schoolCode') ?? ''),
    handle: String(formData.get('handle') ?? ''),
    emojiIds: String(formData.get('emojiIds') ?? '')
      .split(',')
      .filter(Boolean),
  };
  const parsed = StudentLoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: '入力を もういちど 見直してね。' };
  }
  const { schoolCode, handle, emojiIds } = parsed.data;

  const school = await prisma.school.findUnique({ where: { code: schoolCode } });
  if (!school) {
    return { ok: false, message: 'ログインできなかったよ。もういちど ためしてね。' };
  }

  const user = await prisma.user.findFirst({
    where: { role: 'student', schoolId: school.id, handle },
  });
  if (!user || !user.emojiPasswordHash || !user.emojiPasswordSalt) {
    return { ok: false, message: 'ログインできなかったよ。もういちど ためしてね。' };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return {
      ok: false,
      message: 'すこし 休んでから、もういちど ためしてね。',
    };
  }

  const input = canonicalizeEmojiPassword(emojiIds);
  const ok = verifyPassword(
    input,
    user.emojiPasswordSalt,
    user.emojiPasswordHash,
    env.RESEARCH_ANONYMOUS_ID_PEPPER ?? '',
  );

  if (!ok) {
    const nextCount = user.failedLoginCount + 1;
    const shouldLock = nextCount >= env.KIDS_AUTH_MAX_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: nextCount,
        lockedUntil: shouldLock
          ? new Date(Date.now() + env.KIDS_AUTH_LOCKOUT_MINUTES * 60 * 1000)
          : null,
      },
    });
    return { ok: false, message: 'ログインできなかったよ。もういちど ためしてね。' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastActiveAt: new Date(),
    },
  });

  const token = await createSession({ userId: user.id, role: 'student' });
  setSessionCookie(token, 'student');
  return { ok: true };
}

/** 教員ログイン:Phase 1 は簡易パスワード。将来 Auth.js のマジックリンクに置換。 */
export async function teacherLogin(formData: FormData): Promise<LoginResult> {
  const raw = {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  };
  const parsed = TeacherLoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: 'メールアドレスかパスワードが正しくありません。' };
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (
    !user ||
    user.role !== 'teacher' ||
    !user.emojiPasswordHash ||
    !user.emojiPasswordSalt
  ) {
    return { ok: false, message: 'メールアドレスかパスワードが正しくありません。' };
  }

  const ok = verifyPassword(
    password,
    user.emojiPasswordSalt,
    user.emojiPasswordHash,
    env.RESEARCH_ANONYMOUS_ID_PEPPER ?? '',
  );
  if (!ok) {
    return { ok: false, message: 'メールアドレスかパスワードが正しくありません。' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  const token = await createSession({ userId: user.id, role: 'teacher' });
  setSessionCookie(token, 'teacher');
  return { ok: true };
}

export async function signOut(): Promise<void> {
  clearSessionCookie();
  redirect('/');
}
