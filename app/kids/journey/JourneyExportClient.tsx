'use client';

import { useState, useTransition } from 'react';
import { exportJourneyToDocs } from '@/lib/actions/journey';
import type { JourneyRange } from '@/lib/queries/journey';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function JourneyExportClient({
  range,
  rangeLabel,
}: {
  range: JourneyRange;
  rangeLabel: string;
}) {
  const [docsUrl, setDocsUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setErr(null);
    setDocsUrl(null);
    startTransition(async () => {
      const res = await exportJourneyToDocs(range);
      if (res.ok) {
        setDocsUrl(res.docsUrl);
        window.open(res.docsUrl, '_blank', 'noopener');
      } else {
        setErr(res.message);
      }
    });
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="text-2xl">📄</span>
        <p className="font-semibold">
          {rangeLabel}の まとめを Google ドキュメントにする
        </p>
      </div>
      <p className="mt-2 text-sm text-kid-ink/70">
        先生の Google ドライブに、これまでの ふりかえり・声の仮説・立場の動き・
        記録ノートを ぜんぶ まとめた ドキュメントが できるよ。
      </p>
      {err && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {err}
        </p>
      )}
      {docsUrl ? (
        <div className="mt-3 space-y-2">
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-2xl bg-kid-primary px-6 py-2 text-sm font-medium text-white hover:bg-kid-primary/90"
          >
            📄 Google ドキュメントで ひらく
          </a>
          <p className="text-xs text-kid-ink/50">
            おして 何度でも 書き出せるよ(まとめを 作り直すときに)
          </p>
          <Button type="button" variant="ghost" onClick={run} disabled={pending}>
            もう一度 書き出す
          </Button>
        </div>
      ) : (
        <Button type="button" className="mt-4" onClick={run} disabled={pending}>
          {pending ? '書き出し中…' : '📄 Google ドキュメントに する'}
        </Button>
      )}
    </Card>
  );
}
