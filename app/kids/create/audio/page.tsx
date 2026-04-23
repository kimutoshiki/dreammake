import { Card, CardTitle } from '@/components/ui/Card';
import { AudioClient } from './AudioClient';

export default function AudioPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🎙️ ろくおん</p>
        <CardTitle className="mt-1">声を ろくおんして 文字に しよう</CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          iPad(Safari)では 話した ことばが 自動で 文字に なるよ。
          しゃべりながら 下に 文字が 出てきたら せいこう!
        </p>
        <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-900">
          ⚠️ 他の 人の 名前や 住所は 録音しないで ね。
        </p>
      </Card>
      <div className="mt-4">
        <AudioClient />
      </div>
    </main>
  );
}
