import { Card, CardTitle } from '@/components/ui/Card';
import { QuizBuilderClient } from './QuizBuilderClient';

export default function QuizBuilderPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🧩 クイズを つくる</p>
        <CardTitle className="mt-1">
          じぶんの クイズを 作ろう(ノーコード)
        </CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          もんだいと こたえを ならべるだけ。できあがったら クラスで 遊べるよ。
          これが「プログラミングの 考え方」。条件で 正解・不正解が 変わる しくみを つくる 体験だよ。
        </p>
      </Card>
      <div className="mt-4">
        <QuizBuilderClient />
      </div>
    </main>
  );
}
