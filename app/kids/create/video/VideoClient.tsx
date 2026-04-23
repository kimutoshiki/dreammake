'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';

type Step = 'idle' | 'recording' | 'review' | 'saved';

const MAX_SECONDS = 180;

export function VideoClient() {
  const previewRef = useRef<HTMLVideoElement>(null);
  const reviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [step, setStep] = useState<Step>('idle');
  const [title, setTitle] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    return () => cleanup();
  }, []);

  function cleanup() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  function pickMimeType() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    for (const c of candidates) {
      if (
        typeof MediaRecorder !== 'undefined' &&
        MediaRecorder.isTypeSupported(c)
      ) {
        return c;
      }
    }
    return '';
  }

  async function start() {
    setError(null);
    setBlob(null);
    setPreviewUrl(null);
    setElapsed(0);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 },
        audio: true,
      });
      streamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        await previewRef.current.play();
      }

      const mime = pickMimeType();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const type = mime || 'video/webm';
        const out = new Blob(chunksRef.current, { type });
        setBlob(out);
        setPreviewUrl(URL.createObjectURL(out));
        cleanup();
        setStep('review');
      };
      rec.start();
      setStep('recording');

      const startedAt = Date.now();
      tickRef.current = setInterval(() => {
        const e = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(e);
        if (e >= MAX_SECONDS) stop();
      }, 500);
    } catch (e) {
      setError(
        e instanceof Error ? `カメラ/マイクを 使えなかったよ: ${e.message}` : 'しっぱい',
      );
    }
  }

  function stop() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }

  async function save() {
    if (!blob) return;
    setPending(true);
    setError(null);
    try {
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `video.${ext}`, { type: blob.type });
      const fd = new FormData();
      fd.set('kind', 'video');
      fd.set('title', title || '(名前なし)');
      fd.set('durationSec', String(elapsed));
      fd.set('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'ほぞんに しっぱい');
      setSavedUrl(data.url);
      setStep('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  function restart() {
    setBlob(null);
    setPreviewUrl(null);
    setSavedUrl(null);
    setTitle('');
    setElapsed(0);
    setStep('idle');
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <Card>
      {error && (
        <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {step === 'idle' && (
        <div className="text-center">
          <div className="text-6xl">🎥</div>
          <p className="mt-3 text-sm text-kid-ink/70">
            ボタンを おすと カメラ + マイクが つくよ
          </p>
          <Button type="button" className="mt-4" onClick={start}>
            ろくが スタート
          </Button>
        </div>
      )}

      {step === 'recording' && (
        <div>
          <video
            ref={previewRef}
            className="w-full rounded-2xl bg-black"
            playsInline
            muted
          />
          <div className="mt-3 flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-red-500 px-3 py-1 text-sm font-medium text-white">
              ● ろくが中 {mm}:{ss} / 03:00
            </span>
            <Button type="button" variant="danger" onClick={stop}>
              ストップ
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && previewUrl && (
        <div>
          <video
            ref={reviewRef}
            src={previewUrl}
            className="w-full rounded-2xl bg-black"
            controls
            playsInline
          />
          <div className="mt-4 space-y-3">
            <div>
              <Label>名前を つけよう</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="例:川の 音"
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
          <video
            src={savedUrl}
            className="mt-3 w-full rounded-2xl bg-black"
            controls
            playsInline
          />
          <div className="mt-4 flex justify-center gap-2">
            <Button type="button" variant="ghost" onClick={restart}>
              もう いちど
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
    </Card>
  );
}
