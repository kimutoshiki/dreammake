'use client';

import { useState, useTransition } from 'react';
import { exportFieldNoteToDocs } from '@/lib/actions/notebook';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function NoteDetailClient({
  noteId,
  docsUrl,
  docsExportedAt,
}: {
  noteId: string;
  docsUrl: string | null;
  docsExportedAt: string | null;
}) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(docsUrl);
  const [exportedAt, setExportedAt] = useState<string | null>(docsExportedAt);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function exportNow() {
    setErr(null);
    startTransition(async () => {
      const res = await exportFieldNoteToDocs(noteId);
      if (res.ok) {
        setCurrentUrl(res.docsUrl);
        setExportedAt(new Date().toISOString());
        // 新規作成したら 新しいタブで 開く
        if (!res.reused) window.open(res.docsUrl, '_blank', 'noopener');
      } else {
        setErr(res.message);
      }
    });
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="text-2xl">📄</span>
        <p className="font-semibold">Google ドキュメントに しゅつりょく</p>
      </div>
      <p className="mt-2 text-sm text-kid-ink/70">
        先生の Google ドライブに、このノートが ドキュメントとして 書き出されるよ。
        先生が クラスの 連携設定を している ときだけ つかえるよ。
      </p>

      {err && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {err}
        </p>
      )}

      {currentUrl ? (
        <div className="mt-4 space-y-2">
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-2xl bg-kid-primary px-6 py-2 text-sm font-medium text-white hover:bg-kid-primary/90"
          >
            📄 Google ドキュメントで ひらく
          </a>
          {exportedAt && (
            <p className="text-xs text-kid-ink/60">
              書き出し日時:{new Date(exportedAt).toLocaleString('ja-JP')}
            </p>
          )}
          <p className="text-xs text-kid-ink/50">
            もう一度 押しても、同じ ドキュメントが 開きます(1 ノートにつき 1 ドキュメント)。
          </p>
        </div>
      ) : (
        <Button
          type="button"
          onClick={exportNow}
          disabled={pending}
          className="mt-4"
        >
          {pending ? '書き出し中…' : '📄 Google ドキュメントに する'}
        </Button>
      )}
    </Card>
  );
}
