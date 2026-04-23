'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { saveVideoMarkers } from '@/lib/actions/video-markers';
import type { VideoMarker } from '@/lib/video/markers';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';

export function VideoMarkerClient({
  artworkId,
  videoUrl,
  initialMarkers,
}: {
  artworkId: string;
  videoUrl: string;
  initialMarkers: VideoMarker[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [markers, setMarkers] = useState<VideoMarker[]>(initialMarkers);
  const [label, setLabel] = useState('');
  const [current, setCurrent] = useState(0);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrent(v.currentTime);
    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, []);

  function addMarker() {
    if (!label.trim() || markers.length >= 20) return;
    const t = Math.round(current * 10) / 10;
    const next = [...markers, { t, label: label.trim() }].sort(
      (a, b) => a.t - b.t,
    );
    setMarkers(next);
    setLabel('');
  }

  function removeMarker(i: number) {
    setMarkers((prev) => prev.filter((_, idx) => idx !== i));
  }

  function seek(t: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    v.play().catch(() => undefined);
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await saveVideoMarkers({ artworkId, markers });
      if (res.ok) setMsg({ kind: 'ok', text: 'ほぞんしたよ!' });
      else setMsg({ kind: 'err', text: res.message });
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full rounded-2xl bg-black"
          controls
          playsInline
        />
      </Card>

      <Card>
        <p className="text-sm font-semibold">
          🎯 大事な場面に マーカーを つけよう
        </p>
        <p className="mt-1 text-xs text-kid-ink/60">
          動画を 止めて、下に ラベルを 書いて「ここに つける」を タップ。
          後で タップすると その場面から 再生できるよ。
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <Label>
              いまの 時間:{formatTime(current)} / 最大 {markers.length} / 20
            </Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={80}
              placeholder="例:田中さんが 「むかしは…」と 話した ところ"
            />
          </div>
          <Button
            type="button"
            onClick={addMarker}
            disabled={!label.trim() || markers.length >= 20}
          >
            🎯 ここに つける
          </Button>
        </div>
      </Card>

      {markers.length > 0 && (
        <Card>
          <p className="text-sm font-semibold">🎞️ マーカー 一覧</p>
          <ul className="mt-2 space-y-2">
            {markers.map((m, i) => (
              <li
                key={`${m.t}-${i}`}
                className="flex items-center gap-2 rounded-xl bg-kid-soft p-2 text-sm"
              >
                <button
                  type="button"
                  onClick={() => seek(m.t)}
                  className="rounded-full bg-kid-primary px-2 py-0.5 font-mono text-[11px] text-white hover:bg-kid-primary/90"
                >
                  ▶ {formatTime(m.t)}
                </button>
                <span className="flex-1">{m.label}</span>
                <button
                  type="button"
                  onClick={() => removeMarker(i)}
                  aria-label="消す"
                  className="rounded-full px-2 py-0.5 text-xs text-kid-ink/60 hover:bg-white"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {msg && (
        <p
          className={`rounded-xl p-3 text-sm ${
            msg.kind === 'ok'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {msg.text}
        </p>
      )}

      <Button type="button" onClick={save} disabled={pending} className="w-full">
        {pending ? 'ほぞん中…' : '💾 マーカーを ほぞん'}
      </Button>
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
