import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/Card';

export default function GamePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🎮 ゲームを つくる</p>
        <CardTitle className="mt-1">もうすこしで つかえるよ</CardTitle>
        <p className="mt-3 text-sm text-kid-ink/80">
          ブロックを ならべて かんたんな ゲームを 作れる ノーコード機能を 準備中です。
          いまは クイズ作成アプリで「条件で せいかい・ふせいかいが 変わる しくみ」を
          体験できます。
        </p>
        <div className="mt-6 flex gap-2">
          <Link
            href="/kids/create/quiz"
            className="inline-flex rounded-2xl bg-kid-soft px-4 py-2 text-sm hover:bg-kid-primary/20"
          >
            🧩 クイズを つくるへ
          </Link>
          <Link
            href="/kids"
            className="inline-flex rounded-2xl bg-kid-soft px-4 py-2 text-sm hover:bg-kid-primary/20"
          >
            ← マイハブへ
          </Link>
        </div>
      </Card>
    </main>
  );
}
