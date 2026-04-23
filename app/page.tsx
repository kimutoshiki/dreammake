import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Card>
        <p className="text-sm text-kid-ink/60">探究学習プラットフォーム</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          しらべてつくろう!AIラボ
        </h1>
        <p className="mt-4 text-base text-kid-ink/80 sm:text-lg">
          「<strong className="text-kid-primary">声が聞こえていないのはだれ?</strong>」を
          問い続ける、小学校社会科の 探究学習プラットフォーム。
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/kids"
            className="block rounded-2xl border-2 border-kid-ink/10 bg-kid-soft p-8 transition-colors hover:border-kid-primary"
          >
            <div className="text-5xl">🎒</div>
            <h2 className="mt-3 text-xl font-semibold">こどもの ページ</h2>
            <p className="mt-2 text-sm text-kid-ink/70">
              ボットと はなして、しらべて、まとめて、ともだちと シェアするよ
            </p>
          </Link>
          <Link
            href="/teacher"
            className="block rounded-2xl border-2 border-kid-ink/10 bg-white p-8 transition-colors hover:border-kid-primary"
          >
            <div className="text-5xl">👩‍🏫</div>
            <h2 className="mt-3 text-xl font-semibold">せんせいの ページ</h2>
            <p className="mt-2 text-sm text-kid-ink/70">
              単元を設計し、児童のふりかえり・立場分布・声の仮説を俯瞰する
            </p>
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border-2 border-kid-ink/10 bg-white p-4 text-sm text-kid-ink/80">
          <p className="font-medium">🤖 AI を使っていることの お知らせ</p>
          <p className="mt-1">
            このアプリは、ボットとの対話や「声が聞こえていないのはだれ?」機能で、
            <strong>Anthropic の Claude API</strong> を使って AI 応答を生成します。
            AI は間違えることがあります。大事なことは 本・先生・おうちの人にも
            たしかめてね。
          </p>
          <p className="mt-2 text-xs">
            <Link href="/privacy" className="text-kid-primary underline">
              AI 利用と プライバシーの 詳しい説明 →
            </Link>
          </p>
        </div>
      </Card>
    </main>
  );
}
