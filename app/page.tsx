import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSelectedKidId } from '@/lib/context/kid';

/**
 * iPad で 最初に 開いたとき:
 *   - まだ 出席番号を 選んでいない → /pick
 *   - すでに Cookie に 有効な 番号がある → /kids
 * 先生向けページや ログイン画面は ない(1 人 1 台の iPad 前提)。
 */
export default async function RootPage() {
  const picked = await getSelectedKidId();
  if (picked) {
    const exists = await prisma.user.findUnique({ where: { id: picked } });
    if (exists) redirect('/kids');
  }
  redirect('/pick');
}
