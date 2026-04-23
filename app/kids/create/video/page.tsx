import { Card, CardTitle } from '@/components/ui/Card';
import { VideoClient } from './VideoClient';

export default function VideoPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🎥 カメラ + マイク</p>
        <CardTitle className="mt-1">どうがを とろう</CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          さいだい 3 ふん まで。うつりたくない 人や、おうちの 中が
          写らないように 気をつけよう。
        </p>
      </Card>
      <div className="mt-4">
        <VideoClient />
      </div>
    </main>
  );
}
