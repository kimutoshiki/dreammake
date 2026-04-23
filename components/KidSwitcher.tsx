'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { pickKid } from '@/lib/context/actions';

export function KidSwitcher({
  currentKidId,
  kids,
}: {
  currentKidId: string;
  kids: Array<{ id: string; nickname: string | null; handle: string | null }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (id === currentKidId) return;
    startTransition(async () => {
      await pickKid(id);
      router.push('/kids');
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-2 rounded-full bg-kid-soft px-3 py-1 text-sm">
      <span aria-hidden>👤</span>
      <span className="sr-only">じぶんを えらぶ</span>
      <select
        value={currentKidId}
        onChange={onChange}
        disabled={pending}
        className="bg-transparent outline-none"
      >
        {kids.map((k) => (
          <option key={k.id} value={k.id}>
            {k.nickname ?? k.handle ?? '?'}
          </option>
        ))}
      </select>
    </label>
  );
}
