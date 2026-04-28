'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { parseJsonResponse } from '@/lib/http/parseJsonResponse';

type Step = 'idle' | 'camera' | 'captured' | 'saved';

export function PhotoClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 960 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStep('camera');
    } catch (e) {
      setError(
        e instanceof Error
          ? `カメラを 使えなかったよ: ${e.message}`
          : 'カメラを 使えなかったよ',
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 960;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const url = canvas.toDataURL('image/jpeg', 0.9);
    setDataUrl(url);
    stopCamera();
    setStep('captured');
  }

  async function save() {
    if (!dataUrl) return;
    setPending(true);
    setError(null);
    try {
      // data URL → Blob → File(カメラ撮影経路を audio/video と揃える)
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      const fd = new FormData();
      fd.set('kind', 'photo');
      fd.set('title', title || '(名前なし)');
      fd.set('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await parseJsonResponse<{ url: string }>(res);
      if (!res.ok || !data.url) throw new Error(data?.error ?? 'ほぞんに しっぱい');
      setSavedUrl(data.url);
      setStep('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  function restart() {
    setDataUrl(null);
    setSavedUrl(null);
    setTitle('');
    setStep('idle');
  }

  return (
    <Card>
      {error && (
        <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {step === 'idle' && (
        <div className="text-center">
          <div className="text-6xl">📷</div>
          <p className="mt-3 text-sm text-kid-ink/70">
            ボタンを おすと カメラが つくよ
          </p>
          <Button type="button" className="mt-4" onClick={startCamera}>
            カメラを スタート
          </Button>
        </div>
      )}

      {step === 'camera' && (
        <div>
          <video
            ref={videoRef}
            className="w-full rounded-2xl bg-black"
            playsInline
            muted
          />
          <div className="mt-3 flex gap-2">
            <Button type="button" className="flex-1" onClick={capture}>
              📸 シャッター
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                stopCamera();
                setStep('idle');
              }}
            >
              やめる
            </Button>
          </div>
        </div>
      )}

      {step === 'captured' && dataUrl && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="" className="w-full rounded-2xl" />
          <div className="mt-4 space-y-3">
            <div>
              <Label>名前を つけよう</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="例:商店街のパンやさん"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1"
                onClick={save}
                disabled={pending}
              >
                {pending ? 'ほぞん中…' : 'ほぞんする'}
              </Button>
              <Button type="button" variant="ghost" onClick={restart}>
                とり直す
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'saved' && savedUrl && (
        <div className="text-center">
          <p className="text-lg font-semibold">🎉 ほぞんしたよ!</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={savedUrl} alt="" className="mt-3 w-full rounded-2xl" />
          <div className="mt-4 flex justify-center gap-2">
            <Button type="button" variant="ghost" onClick={restart}>
              もう いちど とる
            </Button>
            <a
              href="/kids/gallery"
              className="inline-flex items-center rounded-2xl bg-kid-primary px-6 py-2 text-sm font-medium text-white hover:bg-kid-primary/90"
            >
              マイさくひんへ
            </a>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </Card>
  );
}
