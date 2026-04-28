'use client';

import { useEffect } from 'react';

/**
 * 最上位の error boundary。サーバ コンポーネントの 例外も ここで 受ける。
 *
 * 本番(Vercel)で Next.js が 既定で 出す
 *   "Application error: a server-side exception has occurred. Digest: XXX"
 * を 置き換え、Vercel runtime logs に フル stack を 流しつつ、画面には
 * Digest と 短い メッセージ を 表示する。
 *
 * - error.message は 本番でも 表示される(Next.js は digest だけ 隠さない)
 * - error.digest は サーバ側 ログ と 突き合わせる ID
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // ブラウザ コンソールにも 出す(クライアント発の 例外 用)
    // eslint-disable-next-line no-console
    console.error('global-error:', error);
  }, [error]);

  return (
    <html lang="ja">
      <body
        style={{
          background: '#FFF9F2',
          color: '#2E2A27',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif',
          padding: '2rem',
          minHeight: '100vh',
          margin: 0,
        }}
      >
        <main
          style={{
            maxWidth: 640,
            margin: '0 auto',
            background: 'white',
            borderRadius: 24,
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>⚠️ エラー</p>
          <h1 style={{ fontSize: 22, marginTop: 4 }}>
            うまく いかなかったよ
          </h1>
          <p style={{ marginTop: 8, fontSize: 14 }}>
            ページを 表示する とちゅうで エラーが でました。せんせいに
            つぎの じょうほうを しらせてね。
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 12,
                fontSize: 12,
                background: '#F5F1EC',
                padding: '6px 10px',
                borderRadius: 8,
                fontFamily: 'monospace',
              }}
            >
              Digest: {error.digest}
            </p>
          )}
          <p
            style={{
              marginTop: 8,
              fontSize: 12,
              background: '#F5F1EC',
              padding: '6px 10px',
              borderRadius: 8,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            {error.message || '(no message)'}
          </p>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: '#FF8C42',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 999,
                cursor: 'pointer',
              }}
            >
              もう一度
            </button>
            <a
              href="/"
              style={{
                background: '#F5F1EC',
                color: '#2E2A27',
                padding: '8px 16px',
                borderRadius: 999,
                textDecoration: 'none',
              }}
            >
              はじめに もどる
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
