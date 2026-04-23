import { Card, CardTitle } from '@/components/ui/Card';
import { PhotoClient } from './PhotoClient';

export default function PhotoPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">📷 カメラ</p>
        <CardTitle className="mt-1">しゃしんを とろう</CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          カメラの 使用を 聞かれたら「きょか」してね。
          うつりたくない 人や、おうちの 中が 写らないように
          気をつけよう。
        </p>
      </Card>
      <div className="mt-4">
        <PhotoClient />
      </div>
    </main>
  );
}
