import Link from 'next/link';
import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session';
import { Card } from '@/components/ui/Card';

export default async function HomePage() {
  const session = await readSession();
  if (session?.role === 'student') redirect('/kids');
  if (session?.role === 'teacher') redirect('/teacher');

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Card>
        <p className="text-sm text-kid-ink/60">Phase 1 デモ</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          しらべてつくろう!AIラボ
        </h1>
        <p className="mt-4 text-base text-kid-ink/80 sm:text-lg">
          「<strong className="text-kid-primary">声が聞こえていないのはだれ?</strong>」を
          問い続ける、小学校社会科の 探究学習プラットフォーム。
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/signin/student"
            className="block rounded-2xl border-2 border-kid-ink/10 bg-kid-soft p-6 transition-colors hover:border-kid-primary"
          >
            <div className="text-3xl">🎒</div>
            <h2 className="mt-2 font-semibold">児童として入る</h2>
            <p className="mt-1 text-sm text-kid-ink/70">
              学校コード + じぶんの ID + 絵柄で ログイン
            </p>
          </Link>
          <Link
            href="/signin/teacher"
            className="block rounded-2xl border-2 border-kid-ink/10 bg-white p-6 transition-colors hover:border-kid-primary"
          >
            <div className="text-3xl">👩‍🏫</div>
            <h2 className="mt-2 font-semibold">先生として入る</h2>
            <p className="mt-1 text-sm text-kid-ink/70">
              メールアドレスと パスワードで ログイン
            </p>
          </Link>
        </div>

        <div className="mt-6 rounded-2xl bg-kid-soft p-4 text-sm text-kid-ink/80">
          <p className="font-medium">🧪 デモ用アカウント</p>
          <p className="mt-1">
            先生: <code>teacher@demo.local</code> / <code>teacher-demo</code>
          </p>
          <p>
            児童: 学校コード <code>demo-school</code>、ID <code>s-4-01-001</code>、
            絵柄 🐟 🌸 🍎(みさき)
          </p>
        </div>
      </Card>
    </main>
  );
}
