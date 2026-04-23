import { Card, CardTitle } from '@/components/ui/Card';
import { MusicMakerClient } from './MusicMakerClient';

export default function MusicPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🎵 おんがくを つくる</p>
        <CardTitle className="mt-1">ドラムと メロディで リズムを つくろう</CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          タップで 音を 置いて、▶️ で 聴いてみよう。気に入ったら
          WAV ファイルとして 保存して、マイさくひんに 追加できるよ。
        </p>
        <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-900">
          ⚠️ 初回は iPad が マナーモードだと 音が出ないよ。画面タップで 音量を ON にしてね。
        </p>
      </Card>
      <div className="mt-4">
        <MusicMakerClient />
      </div>
    </main>
  );
}
