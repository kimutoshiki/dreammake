'use client';

import { useState, useTransition } from 'react';
import { createBot } from '@/lib/actions/bot';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input, Label, Textarea } from '@/components/ui/Input';

const PERSONAS = [
  { id: 'kind', label: 'やさしい' },
  { id: 'funny', label: 'おもしろい' },
  { id: 'scholar', label: 'ものしり博士' },
  { id: 'cheer', label: 'おうえん型' },
  { id: 'calm', label: 'しずか' },
];

export default function NewBotPage() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createBot(fd);
      if (result && !result.ok) setError(result.message);
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Card>
        <CardTitle>あたらしい ボットを つくろう</CardTitle>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label>💡 しらべた テーマ</Label>
            <Input name="topic" required maxLength={80} placeholder="例: メダカのひみつ" />
          </div>
          <div>
            <Label>🤖 ボットの なまえ</Label>
            <Input name="name" required maxLength={40} placeholder="例: メダカはかせ" />
          </div>
          <div>
            <Label>🗣️ はなしかた</Label>
            <select
              name="persona"
              defaultValue="kind"
              className="w-full rounded-xl border-2 border-kid-ink/10 bg-white px-4 py-3 outline-none focus:border-kid-primary"
            >
              {PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>✨ とくいなこと(じぶんで かんがえてみよう)</Label>
            <Textarea name="strengths" rows={2} maxLength={400} />
          </div>
          <div>
            <Label>🤔 にがてなこと(まだ しらべていないこと)</Label>
            <Textarea name="weaknesses" rows={2} maxLength={400} />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'つくってます…' : 'ボットを つくる ✨'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
