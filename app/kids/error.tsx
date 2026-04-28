'use client';

import { useEffect } from 'react';

/**
 * /kids 配下 専用 error boundary。global-error より 内側で 発火する。
 * サーバ コンポーネントの throw を 拾って、画面には 短い メッセージ +
 * digest + message を 出す(本番でも message は 見える)。
 *
 * デバッグ目的:Vercel の runtime logs に console.error で フル stack。
 */
export default function KidsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('kids-error:', error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-kid-ink/5">
        <p className="text-xs text-kid-ink/60">⚠️ エラー</p>
        <h1 className="mt-1 text-xl font-semibold">うまく いかなかったよ</h1>
        <p className="mt-2 text-sm text-kid-ink/80">
          いまの がめんを 出す とちゅうで エラーが でました。
          下の じょうほうを せんせいに しらせると なおせます。
        </p>
        {error.digest && (
          <p className="mt-3 break-all rounded-xl bg-kid-soft p-2 font-mono text-xs">
            Digest: {error.digest}
          </p>
        )}
        <p className="mt-2 break-all rounded-xl bg-kid-soft p-2 font-mono text-xs">
          {error.message || '(no message)'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-kid-primary px-4 py-2 text-sm text-white hover:bg-kid-primary/90"
          >
            もう一度
          </button>
          <a
            href="/kids"
            className="rounded-full bg-kid-soft px-4 py-2 text-sm hover:bg-kid-primary/20"
          >
            🎒 ハブへ
          </a>
          <a
            href="/pick"
            className="rounded-full bg-kid-soft px-4 py-2 text-sm hover:bg-kid-primary/20"
          >
            番号えらびに もどる
          </a>
        </div>
      </div>
    </main>
  );
}
