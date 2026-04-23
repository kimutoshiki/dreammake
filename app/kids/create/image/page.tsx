import { Card, CardTitle } from '@/components/ui/Card';
import { ImageClient } from './ImageClient';

export default function ImagePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🖼️ 絵を つくる</p>
        <CardTitle className="mt-1">AI に 絵を かいて もらおう</CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          どんな 絵が ほしい?ことばで 書いて みよう。
          AI が 安全に 書き直してから、Google の Gemini が 絵に してくれるよ。
        </p>
        <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-900">
          ⚠️ 知っている 人の 名前や 顔は 絵に しないよ。
          暴力や こわい 絵も 作らないよ。
        </p>
      </Card>
      <div className="mt-4">
        <ImageClient />
      </div>
    </main>
  );
}
