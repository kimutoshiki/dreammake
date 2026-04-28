import { Card, CardTitle } from '@/components/ui/Card';
import { GameMakerClient } from './GameMakerClient';

export default function GamePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🎮 ゲームを つくる</p>
        <CardTitle className="mt-1">じぶんの「もぐらたたき」を つくろう</CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          でてくる 絵文字、時間、はやさ を きめるだけ。
          そのまま 遊んで、ハイスコアを ねらおう!
        </p>
      </Card>
      <div className="mt-4">
        <GameMakerClient />
      </div>
    </main>
  );
}
