'use client';

import { useEffect, useState } from 'react';

/**
 * サービスワーカー登録 + オフラインバナー。
 * ネットが 切れている間は 画面上部に 「オフラインだよ」表示。
 */
export function PwaAndOffline() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    const handle = () => setOnline(navigator.onLine);
    setOnline(navigator.onLine);
    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    return () => {
      window.removeEventListener('online', handle);
      window.removeEventListener('offline', handle);
    };
  }, []);

  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-50 bg-amber-400 px-4 py-2 text-center text-sm font-medium text-amber-950"
    >
      📴 いま オフラインです。AI に 聞く 機能は つかえませんが、
      カメラ・マイク・おえかき・おんがく・クイズ は 使えるよ。
    </div>
  );
}
