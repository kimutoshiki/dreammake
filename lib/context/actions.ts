'use server';

import { revalidatePath } from 'next/cache';
import { setSelectedKidId, clearSelectedKid } from '@/lib/context/kid';

export async function pickKid(id: string): Promise<{ ok: boolean }> {
  setSelectedKidId(id);
  revalidatePath('/kids');
  return { ok: true };
}

export async function unpickKid(): Promise<{ ok: boolean }> {
  clearSelectedKid();
  revalidatePath('/kids');
  return { ok: true };
}
