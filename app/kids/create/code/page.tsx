import { Card, CardTitle } from '@/components/ui/Card';
import { CodeBuilderClient } from './CodeBuilderClient';

export default function CodeBuilderPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🧠 ノーコードプログラミング</p>
        <CardTitle className="mt-1">めいれいを ならべて、ゴールを めざせ!</CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          5×5 の マスに 主人公が いるよ。「すすむ」「みぎ」「ひだり」などの
          めいれい を ならべて、ゴール 🎯 まで みちびこう。
          くりかえし も つかえるよ。
        </p>
      </Card>
      <div className="mt-4">
        <CodeBuilderClient />
      </div>
    </main>
  );
}
