/**
 * Cookie ベースの簡易セッション管理。
 *
 * Phase 1 では Auth.js を使わず、jose で署名した JWT を HttpOnly Cookie に入れる。
 * セッションのペイロードは最小限(userId, role)で、詳細はリクエストごとに DB から引く。
 */
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

export type SessionPayload = {
  userId: string;
  role: 'student' | 'teacher' | 'admin';
};

const COOKIE_NAME = 'stk_session';
const ISSUER = 'shirabete-tsukurou';
const AUDIENCE = 'stk-web';

const MAX_AGE_STUDENT = 60 * 60 * 4; // 4h
const MAX_AGE_TEACHER = 60 * 60 * 12; // 12h

function getSecret(): Uint8Array {
  const secret = env.AUTH_SECRET;
  if (!secret) {
    // 開発時のフォールバック。本番では .env.local に必ず設定する。
    if (env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET is required in production');
    }
    return new TextEncoder().encode('dev-only-secret-change-me-in-env-local');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const maxAge = payload.role === 'student' ? MAX_AGE_STUDENT : MAX_AGE_TEACHER;
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ sub: payload.userId, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + maxAge)
    .sign(getSecret());
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.role !== 'string' ||
      !['student', 'teacher', 'admin'].includes(payload.role)
    ) {
      return null;
    }
    return {
      userId: payload.sub,
      role: payload.role as SessionPayload['role'],
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string, role: SessionPayload['role']) {
  const maxAge = role === 'student' ? MAX_AGE_STUDENT : MAX_AGE_TEACHER;
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export { COOKIE_NAME as SESSION_COOKIE_NAME };
