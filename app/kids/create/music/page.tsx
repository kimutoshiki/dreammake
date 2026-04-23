import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/Card';

export default function MusicPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🎵 おんがく</p>
        <CardTitle className="mt-1">もうすこしで つかえるよ</CardTitle>
        <p className="mt-3 text-sm text-kid-ink/80">
          iPad の マイクで 歌を ろくおんしたり、「やさしい・元気・しずか」などの
          気持ちから 30 秒の BGM を 自動で 作れる 機能を 準備中です。
        </p>
        <p className="mt-3 text-sm text-kid-ink/80">
          いまは「🎙️ ろくおん + もじおこし」で 歌声や 音を のこせます。
          「🎨 おえかき」で 気持ちの 色を 描けます。
        </p>
        <div className="mt-6 flex gap-2">
          <Link
            href="/kids/create/audio"
            className="inline-flex rounded-2xl bg-kid-soft px-4 py-2 text-sm hover:bg-kid-primary/20"
          >
            🎙️ ろくおん アプリへ
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
