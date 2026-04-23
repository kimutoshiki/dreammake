'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { studentLogin } from '@/lib/auth/actions';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';

type Emoji = { id: string; label: string; char: string };

// デモ用の絵柄プール(本番は public/emoji/ の SVG に置き換え)
const POOL: Emoji[] = [
  { id: 'fish', label: 'さかな', char: '🐟' },
  { id: 'cherry', label: 'さくら', char: '🌸' },
  { id: 'apple', label: 'りんご', char: '🍎' },
  { id: 'rocket', label: 'ロケット', char: '🚀' },
  { id: 'cat', label: 'ねこ', char: '🐱' },
  { id: 'sun', label: 'たいよう', char: '🌞' },
  { id: 'balloon', label: 'ふうせん', char: '🎈' },
  { id: 'butterfly', label: 'ちょうちょ', char: '🦋' },
  { id: 'rainbow', label: 'にじ', char: '🌈' },
  { id: 'moon', label: 'つき', char: '🌙' },
  { id: 'donut', label: 'ドーナツ', char: '🍩' },
  { id: 'star', label: 'ほし', char: '⭐' },
];

export default function StudentSignInPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set('emojiIds', selected.join(','));
    startTransition(async () => {
      const result = await studentLogin(fd);
      if (result.ok) {
        router.push('/kids');
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <Card>
        <CardTitle>じどうの ログイン</CardTitle>
        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div>
            <Label>🏫 がっこうコード</Label>
            <Input
              name="schoolCode"
              required
              defaultValue="demo-school"
              autoComplete="off"
            />
          </div>
          <div>
            <Label>🆔 じぶんの ID</Label>
            <Input
              name="handle"
              required
              defaultValue="s-4-01-001"
              autoComplete="off"
            />
          </div>

          <div>
            <Label>🎨 あいことばの えを 3つ えらぼう</Label>
            <div className="mt-2 grid grid-cols-4 gap-3">
              {POOL.map((e) => {
                const isSelected = selected.includes(e.id);
                const idx = selected.indexOf(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => toggle(e.id)}
                    aria-label={e.label}
                    aria-pressed={isSelected}
                    className={`relative flex h-20 items-center justify-center rounded-2xl border-2 text-4xl transition-all ${
                      isSelected
                        ? 'border-kid-primary bg-kid-soft'
                        : 'border-kid-ink/10 bg-white hover:bg-kid-soft/50'
                    }`}
                  >
                    <span aria-hidden>{e.char}</span>
                    {isSelected && (
                      <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-kid-primary text-sm text-white">
                        {idx + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-kid-ink/60">
              えらんだ じゅんばんは 関係ないよ(いつも 同じ 3つ ならOK)
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={pending || selected.length !== 3}
          >
            {pending ? 'かくにんちゅう…' : 'はいる!'}
          </Button>
          <Link
            href="/"
            className="block text-center text-sm text-kid-ink/60 hover:text-kid-primary"
          >
            ← もどる
          </Link>
        </form>
      </Card>
    </main>
  );
}
