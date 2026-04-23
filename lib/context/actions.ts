'use server';

import { redirect } from 'next/navigation';
import { clearSelectedKid } from '@/lib/context/kid';

/**
 * Cookie の 出席番号を はずして、番号選択画面(/pick)へ もどる。
 * プライバシーページ などから「iPad の ばんごうを かえる」時に 使う。
 */
export async function resetKidAndGoPick(): Promise<void> {
  clearSelectedKid();
  redirect('/pick');
}
