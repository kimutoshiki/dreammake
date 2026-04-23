'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';

const PALETTE = [
  '#2E2A27',
  '#FF8C42',
  '#FF5A5F',
  '#FFD166',
  '#7BAE68',
  '#06D6A0',
  '#8FB9E3',
  '#118AB2',
  '#3D405B',
  '#C77DFF',
  '#F8EDD3',
  '#FFFFFF',
];

const WIDTHS = [2, 5, 10, 18, 30];

type Photo = { id: string; title: string; url: string };

export function DrawClient({ photos = [] }: { photos?: Photo[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(PALETTE[1]!);
  const [width, setWidth] = useState(5);
  const [erasing, setErasing] = useState(false);
  const [title, setTitle] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);

  // キャンバスの 解像度を ビューポートに合わせて初期化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const wPx = Math.min(canvas.clientWidth, 1200);
    const hPx = Math.round(wPx * 0.66);
    canvas.width = wPx * ratio;
    canvas.height = hPx * ratio;
    canvas.style.height = `${hPx}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, wPx, hPx);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  async function applyBackground(url: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const wPx = Math.min(canvas.clientWidth, 1200);
    const hPx = Math.round(wPx * 0.66);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 既存のストロークは 一旦 ホワイトで クリア(透明ではなく、白で塗り直す → 写真の上から描ける)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.scale(ratio, ratio);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('画像を 読み込めなかったよ'));
    });
    // cover で 敷く
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(wPx / iw, hPx / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (wPx - dw) / 2;
    const dy = (hPx - dh) / 2;
    // うっすら 敷く(50% 透明)ので、児童の 線が 見やすい
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

    setBackgroundUrl(url);
    setShowPhotoPicker(false);
  }

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointerPos(e);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.fillStyle = erasing ? '#FFFFFF' : color;
    ctx.arc(
      lastPointRef.current.x,
      lastPointRef.current.y,
      width / 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = pointerPos(e);
    const last = lastPointRef.current ?? p;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = erasing ? '#FFFFFF' : color;
    const pressure =
      e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.6;
    ctx.lineWidth = Math.max(1, width * (0.6 + pressure));
    ctx.stroke();
    lastPointRef.current = p;
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastPointRef.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // noop
    }
  }

  function clearAll() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.scale(ratio, ratio);
    setBackgroundUrl(null);
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPending(true);
    setError(null);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const fd = new FormData();
      fd.set('kind', 'drawing');
      fd.set('title', title || '(名前なし)');
      fd.set('dataUrl', dataUrl);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'ほぞんに しっぱい');
      setSaved(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      {error && (
        <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="block w-full touch-none rounded-2xl border-2 border-kid-ink/10 bg-white"
        style={{ touchAction: 'none' }}
      />

      {photos.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant={backgroundUrl ? 'primary' : 'ghost'}
            onClick={() => setShowPhotoPicker((v) => !v)}
          >
            📷 {backgroundUrl ? 'しゃしんを かえる' : 'しゃしんを かさねる'}
          </Button>
          {backgroundUrl && (
            <Button type="button" variant="ghost" onClick={clearAll}>
              🗑️ しゃしんを けす
            </Button>
          )}
        </div>
      )}

      {showPhotoPicker && (
        <div className="mt-3 rounded-2xl bg-kid-soft p-3">
          <p className="text-xs text-kid-ink/60">
            取材で とった しゃしんから えらんで、その上に かけるよ
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyBackground(p.url)}
                className="overflow-hidden rounded-xl border-2 border-kid-ink/10 hover:border-kid-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.title}
                  className="aspect-square w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`color ${c}`}
            onClick={() => {
              setColor(c);
              setErasing(false);
            }}
            className={`h-10 w-10 rounded-full border-2 ${
              !erasing && color === c
                ? 'border-kid-primary ring-2 ring-kid-primary'
                : 'border-kid-ink/10'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <button
          type="button"
          onClick={() => setErasing(true)}
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white text-xl ${
            erasing ? 'border-kid-primary ring-2 ring-kid-primary' : 'border-kid-ink/10'
          }`}
          aria-label="けしゴム"
        >
          🧽
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-kid-ink/60">ふとさ:</span>
        {WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWidth(w)}
            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
              width === w
                ? 'border-kid-primary bg-kid-soft ring-2 ring-kid-primary'
                : 'border-kid-ink/10 bg-white'
            }`}
          >
            <span
              className="block rounded-full bg-kid-ink"
              style={{ width: `${Math.min(24, w)}px`, height: `${Math.min(24, w)}px` }}
            />
          </button>
        ))}
        <Button type="button" variant="ghost" onClick={clearAll} className="ml-auto">
          🗑️ 全部けす
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <Label>名前を つけよう</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
          />
        </div>
        <Button type="button" onClick={save} disabled={pending} className="w-full">
          {pending ? 'ほぞん中…' : 'ほぞんする'}
        </Button>
      </div>

      {saved && (
        <div className="mt-4 rounded-2xl bg-green-50 p-3 text-sm text-green-700">
          🎉 ほぞんしたよ!
          <a href="/kids/gallery" className="ml-2 underline">
            マイさくひんで みる →
          </a>
        </div>
      )}
    </Card>
  );
}
