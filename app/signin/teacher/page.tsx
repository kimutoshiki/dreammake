'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { teacherLogin } from '@/lib/auth/actions';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';

export default function TeacherSignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await teacherLogin(formData);
      if (result.ok) {
        router.push('/teacher');
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <Card>
        <CardTitle>先生のログイン</CardTitle>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label>メールアドレス</Label>
            <Input
              name="email"
              type="email"
              required
              defaultValue="teacher@demo.local"
              autoComplete="email"
            />
          </div>
          <div>
            <Label>パスワード</Label>
            <Input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? '確認中…' : 'ログイン'}
          </Button>
          <Link
            href="/"
            className="block text-center text-sm text-kid-ink/60 hover:text-kid-primary"
          >
            ← 戻る
          </Link>
        </form>
      </Card>
    </main>
  );
}
