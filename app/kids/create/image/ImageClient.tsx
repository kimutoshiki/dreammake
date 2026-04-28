'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label, Textarea } from '@/components/ui/Input';
import { parseJsonResponse } from '@/lib/http/parseJsonResponse';

type Aspect = '1:1' | '3:4' | '4:3';

export function ImageClient() {
  const [request, setRequest] = useState('');
  const [aspect, setAspect] = useState<Aspect>('1:1');
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rewritten, setRewritten] = useState(false);
  const [mocked, setMocked] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'info' | 'err' | 'refuse'; text: string } | null>(
    null,
  );

  async function generate() {
    if (!request.trim()) return;
    setPending(true);
    setMsg(null);
    setImageUrl(null);
    setRewritten(false);
    setMocked(false);
    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ request, aspectRatio: aspect }),
      });
      const data = await parseJsonResponse<{
        url?: string;
        rateLimited?: boolean;
        blocked?: boolean;
        reason?: string;
        refused?: boolean;
        rewritten?: boolean;
        mocked?: boolean;
      }>(res);
      if (!res.ok) {
        if (data?.rateLimited) {
          setMsg({ kind: 'err', text: data.error ?? 'たくさん つかった日 だよ' });
        } else if (data?.blocked) {
          setMsg({ kind: 'refuse', text: data.reason ?? 'つくれなかったよ' });
        } else {
          setMsg({ kind: 'err', text: data?.error ?? '通信できなかったよ' });
        }
        return;
      }
      if (data.refused) {
        setMsg({ kind: 'refuse', text: data.reason ?? 'つくれなかったよ' });
        return;
      }
      if (data.url) setImageUrl(data.url);
      setRewritten(!!data.rewritten);
      setMocked(!!data.mocked);
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <div>
        <Label>どんな 絵に したい?(日本語で OK)</Label>
        <Textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="例:朝の 川で メダカが たまごを うむ しずかな 絵"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-kid-ink/60">かたち:</span>
        {(['1:1', '3:4', '4:3'] as Aspect[]).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAspect(a)}
            className={`rounded-full border-2 px-3 py-1 text-xs ${
              aspect === a
                ? 'border-kid-primary bg-kid-soft'
                : 'border-kid-ink/10 bg-white hover:bg-kid-soft/50'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <Button
        type="button"
        className="mt-4 w-full"
        onClick={generate}
        disabled={pending || !request.trim()}
      >
        {pending ? '🎨 つくっているよ…' : '✨ つくる'}
      </Button>

      {msg && (
        <p
          className={`mt-3 rounded-xl p-3 text-sm ${
            msg.kind === 'refuse'
              ? 'bg-amber-50 text-amber-900'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {msg.text}
        </p>
      )}

      {imageUrl && (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="w-full rounded-2xl" />
          <div className="mt-2 text-xs text-kid-ink/60">
            {rewritten && (
              <span className="mr-2 rounded-full bg-kid-soft px-2 py-0.5">
                💡 AI が 安全に 書き直した
              </span>
            )}
            {mocked && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
                (GOOGLE_API_KEY 未設定 のため 開発モック)
              </span>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <a
              href="/kids/gallery"
              className="inline-flex items-center rounded-2xl bg-kid-primary px-6 py-2 text-sm font-medium text-white hover:bg-kid-primary/90"
            >
              🗂️ マイさくひんへ
            </a>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setImageUrl(null);
                setRequest('');
              }}
            >
              もう 1枚 つくる
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
