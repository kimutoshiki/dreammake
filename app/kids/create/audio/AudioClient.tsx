'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { parseJsonResponse } from '@/lib/http/parseJsonResponse';

type Step = 'idle' | 'recording' | 'review' | 'saved';

const MAX_SECONDS = 300;

type SRWindow = Window &
  typeof globalThis & {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  };

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SREvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

export function AudioClient() {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalsRef = useRef<string>('');

  const [step, setStep] = useState<Step>('idle');
  const [title, setTitle] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [srSupported, setSrSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const w = window as SRWindow;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setSrSupported(!!SR);
    return () => cleanup();
  }, []);

  function cleanup() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    try {
      recognitionRef.current?.stop();
    } catch {
      // noop
    }
    recognitionRef.current = null;
  }

  async function start() {
    setError(null);
    setBlob(null);
    setPreviewUrl(null);
    setElapsed(0);
    setTranscript('');
    setInterim('');
    finalsRef.current = '';
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      streamRef.current = stream;

      const mime =
        typeof MediaRecorder !== 'undefined' &&
        MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const type = mime || 'audio/webm';
        const out = new Blob(chunksRef.current, { type });
        setBlob(out);
        setPreviewUrl(URL.createObjectURL(out));
        cleanup();
        setTranscript(finalsRef.current.trim());
        setInterim('');
        setStep('review');
      };
      rec.start();

      // Web Speech(オンデバイス文字起こし)
      const w = window as SRWindow;
      const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      if (SR) {
        const recog = new SR();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'ja-JP';
        recog.onresult = (e: SREvent) => {
          let interimAcc = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (!r) continue;
            const text = r[0]?.transcript ?? '';
            if (r.isFinal) {
              finalsRef.current += text;
            } else {
              interimAcc += text;
            }
          }
          setTranscript(finalsRef.current);
          setInterim(interimAcc);
        };
        recog.onerror = (e) => {
          if (e.error && e.error !== 'no-speech') {
            // iOS Safari で たまに起きるけど 止めない
            console.warn('speech error', e.error);
          }
        };
        recog.onend = () => {
          // 連続録音中に 自動で切れることが iOS にある → 再起動
          if (recorderRef.current?.state === 'recording') {
            try {
              recog.start();
            } catch {
              // noop
            }
          }
        };
        recognitionRef.current = recog;
        try {
          recog.start();
        } catch {
          // noop
        }
      }

      setStep('recording');
      const startedAt = Date.now();
      tickRef.current = setInterval(() => {
        const e = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(e);
        if (e >= MAX_SECONDS) stop();
      }, 500);
    } catch (e) {
      setError(
        e instanceof Error ? `マイクを 使えなかったよ: ${e.message}` : 'しっぱい',
      );
    }
  }

  function stop() {
    try {
      recognitionRef.current?.stop();
    } catch {
      // noop
    }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }

  async function save() {
    if (!blob) return;
    setPending(true);
    setError(null);
    try {
      const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
      const file = new File([blob], `audio.${ext}`, { type: blob.type });
      const fd = new FormData();
      fd.set('kind', 'audio');
      fd.set('title', title || '(名前なし)');
      fd.set('durationSec', String(elapsed));
      fd.set('transcript', transcript);
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

  function exportCsv() {
    const rows = [
      ['title', 'duration_sec', 'transcript', 'created_at'],
      [
        title || '(名前なし)',
        String(elapsed),
        transcript.replace(/"/g, '""'),
        new Date().toISOString(),
      ],
    ];
    const csv =
      '﻿' /* Excel の文字化け防止 BOM */ +
      rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'recording').replace(/[^\w\-一-龥ぁ-んァ-ン]/g, '_')}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyTsv() {
    const tsv = [
      'title\tduration_sec\ttranscript\tcreated_at',
      [
        title || '(名前なし)',
        elapsed,
        transcript.replace(/\t/g, ' ').replace(/\n/g, ' '),
        new Date().toISOString(),
      ].join('\t'),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      alert('コピーしたよ。Google スプレッドシートに はりつけてね。');
    } catch {
      alert('コピーに しっぱいしたよ。');
    }
  }

  function restart() {
    setBlob(null);
    setPreviewUrl(null);
    setSavedUrl(null);
    setTitle('');
    setElapsed(0);
    setTranscript('');
    setInterim('');
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
      {!srSupported && (
        <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          このブラウザでは 文字おこしが 動かないよ。iPad の Safari や
          Chrome で ためしてね。録音は できるよ。
        </p>
      )}

      {step === 'idle' && (
        <div className="text-center">
          <div className="text-6xl">🎙️</div>
          <p className="mt-3 text-sm text-kid-ink/70">
            ボタンを おしたら マイクが つくよ
          </p>
          <Button type="button" className="mt-4" onClick={start}>
            ろくおん スタート
          </Button>
        </div>
      )}

      {step === 'recording' && (
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-red-500 px-3 py-1 text-sm font-medium text-white">
              ● ろくおん中 {mm}:{ss}
            </span>
            <Button type="button" variant="danger" onClick={stop}>
              ストップ
            </Button>
          </div>

          <div className="mt-4 rounded-2xl bg-kid-soft p-3 text-sm leading-relaxed">
            <p className="text-xs text-kid-ink/60">
              👂 きこえた ことば(リアルタイム)
            </p>
            <p className="mt-2 whitespace-pre-wrap">
              {transcript || <span className="opacity-50">話して みよう…</span>}
              {interim && (
                <span className="text-kid-ink/40"> {interim}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {step === 'review' && previewUrl && (
        <div>
          <audio src={previewUrl} className="w-full" controls />
          <div className="mt-4 space-y-3">
            <div>
              <Label>名前を つけよう</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="例:お店の人への インタビュー"
              />
            </div>
            <div>
              <Label>文字おこし(しゅうせい できるよ)</Label>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={6}
                maxLength={6000}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={save}
                disabled={pending}
                className="flex-1"
              >
                {pending ? 'ほぞん中…' : 'ほぞんする'}
              </Button>
              <Button type="button" variant="ghost" onClick={exportCsv}>
                📥 CSV にする
              </Button>
              <Button type="button" variant="ghost" onClick={copyTsv}>
                📋 スプシに はりつけ用に コピー
              </Button>
              <Button type="button" variant="ghost" onClick={restart}>
                とり直す
              </Button>
            </div>
            <p className="text-xs text-kid-ink/60">
              💡 CSV は 表計算アプリ(Google スプレッドシート / Numbers / Excel)に
              そのまま 読み込めるよ。
            </p>
          </div>
        </div>
      )}

      {step === 'saved' && savedUrl && (
        <div className="text-center">
          <p className="text-lg font-semibold">🎉 ほぞんしたよ!</p>
          <audio src={savedUrl} className="mt-3 w-full" controls />
          {transcript && (
            <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-kid-soft p-3 text-left text-sm">
              {transcript}
            </p>
          )}
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
