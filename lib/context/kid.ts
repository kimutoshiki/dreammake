/**
 * 児童ページの「いま誰として操作しているか」を Cookie で保持。
 *
 * 認証ではなく、1 人 1 台の iPad を 前提とした **出席番号の 初回選択**。
 * Cookie に出席番号の User.id を入れるだけで、JWT も パスワードも 使わない。
 * セキュリティ境界は「児童が 自分の iPad を 使う」前提に 依存する。
 */
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { ensureSeeded } from '@/lib/db/ensure-seeded';

const COOKIE_NAME = 'stk_kid_id';

export async function getSelectedKidId(): Promise<string | null> {
  return cookies().get(COOKIE_NAME)?.value ?? null;
}

export function setSelectedKidId(id: string) {
  cookies().set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 日
  });
}

export function clearSelectedKid() {
  cookies().delete(COOKIE_NAME);
}

export type KidWithProfile = NonNullable<
  Awaited<ReturnType<typeof prisma.user.findFirst>>
> & {
  gradeProfile: { band: string } | null;
  school: { name: string; code: string } | null;
};

/**
 * Cookie に入っている 出席番号で 児童を ひく。
 * 未設定や 存在しない ID なら null を返し、呼び出し側で 番号選択画面へ 誘導する。
 */
export async function getCurrentKid(): Promise<{
  current: KidWithProfile | null;
}> {
  // Vercel の サーバレス は インスタンス ごとに /tmp が 別 なので、
  // どの ページから 入っても まず シードを 流す(冪等)。
  await ensureSeeded();

  const picked = await getSelectedKidId();
  if (!picked) return { current: null };

  const current = await prisma.user.findUnique({
    where: { id: picked },
    include: {
      gradeProfile: true,
      school: true,
    },
  });

  return { current: (current as KidWithProfile | null) ?? null };
}
