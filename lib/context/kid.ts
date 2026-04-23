/**
 * 児童ページの「いま誰として操作しているか」を Cookie で保持。
 *
 * 認証ではなく、タブレットを教室で使う想定の**簡易セレクタ**。
 * Cookie に児童の User.id を入れるだけで、JWT も パスワードも 使わない。
 * セキュリティ境界は「教室内で使う端末」の前提に 依存する。
 */
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'stk_kid_id';

export async function getSelectedKidId(): Promise<string | null> {
  return cookies().get(COOKIE_NAME)?.value ?? null;
}

export function setSelectedKidId(id: string) {
  cookies().set(COOKIE_NAME, id, {
    httpOnly: false,
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
 * 現在のキッド + 切替用の全員リストを返す。
 * 選択されていなければ最初の児童をデフォルトにする。
 */
export async function getCurrentKid(): Promise<{
  current: KidWithProfile | null;
  allKids: Array<{ id: string; nickname: string | null; handle: string | null; avatarSeed: string | null }>;
}> {
  const picked = await getSelectedKidId();

  const allKids = await prisma.user.findMany({
    where: { role: 'student' },
    select: {
      id: true,
      nickname: true,
      handle: true,
      avatarSeed: true,
    },
    orderBy: [{ handle: 'asc' }],
  });

  if (allKids.length === 0) {
    return { current: null, allKids: [] };
  }

  const targetId = picked && allKids.some((k) => k.id === picked)
    ? picked
    : allKids[0]!.id;

  const current = await prisma.user.findUnique({
    where: { id: targetId },
    include: {
      gradeProfile: true,
      school: true,
    },
  });

  return { current: current as KidWithProfile | null, allKids };
}
