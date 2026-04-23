'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { audioBufferToWav } from '@/lib/music/wav-encoder';

// 8 ステップ × 4 ドラム + 8 ステップ メロディ(ペンタトニック 5 音階 + 休符)
const STEPS = 8;
const DRUMS = [
  { id: 'kick', label: 'バスドラ', emoji: '🥁' },
  { id: 'snare', label: 'スネア', emoji: '🪘' },
  { id: 'hat', label: 'ハイハット', emoji: '🔔' },
  { id: 'clap', label: 'クラップ', emoji: '👏' },
] as const;

// ペンタトニック(ヨナ抜き)= 小学生でも 不協和に なりにくい
const MELODY_NOTES = [
  { id: 'rest', label: '—', midi: null as number | null },
  { id: 'C5', label: 'ド', midi: 72 },
  { id: 'D5', label: 'レ', midi: 74 },
  { id: 'E5', label: 'ミ', midi: 76 },
  { id: 'G5', label: 'ソ', midi: 79 },
  { id: 'A5', label: 'ラ', midi: 81 },
] as const;

type DrumId = (typeof DRUMS)[number]['id'];
type NoteId = (typeof MELODY_NOTES)[number]['id'];

type Pattern = {
  bpm: number;
  drums: Record<DrumId, boolean[]>;
  melody: NoteId[]; // 長さ STEPS
};

function emptyPattern(): Pattern {
  return {
    bpm: 100,
    drums: {
      kick: [true, false, false, false, true, false, false, false],
      snare: [false, false, true, false, false, false, true, false],
      hat: [true, true, true, true, true, true, true, true],
      clap: [false, false, false, false, false, false, false, false],
    },
    melody: ['C5', 'rest', 'E5', 'rest', 'G5', 'rest', 'E5', 'rest'],
  };
}

import type * as ToneNamespace from 'tone';
type ToneNS = typeof ToneNamespace;

export function MusicMakerClient() {
  const [pattern, setPattern] = useState<Pattern>(emptyPattern());
  const [playing, setPlaying] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState('たのしい');
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toneRef = useRef<ToneNS | null>(null);
  const seqRef = useRef<{ dispose: () => void; start: (t: number) => void } | null>(
    null,
  );
  const instrumentsRef = useRef<{
    kick: InstanceType<ToneNS['MembraneSynth']>;
    snare: InstanceType<ToneNS['NoiseSynth']>;
    hat: InstanceType<ToneNS['MetalSynth']>;
    clap: InstanceType<ToneNS['NoiseSynth']>;
    melody: InstanceType<ToneNS['Synth']>;
  } | null>(null);

  // 停止中に パターン更新 → 即 bpm 反映
  useEffect(() => {
    if (toneRef.current) {
      toneRef.current.getTransport().bpm.value = pattern.bpm;
    }
  }, [pattern.bpm]);

  async function ensureTone() {
    if (!toneRef.current) {
      const mod = await import('tone');
      toneRef.current = mod;
    }
    const Tone = toneRef.current;
    await Tone.start();
    if (!instrumentsRef.current) {
      instrumentsRef.current = {
        kick: new Tone.MembraneSynth({ volume: -6 }).toDestination(),
        snare: new Tone.NoiseSynth({
          noise: { type: 'white' },
          envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
          volume: -10,
        }).toDestination(),
        hat: new Tone.MetalSynth({
          envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
          volume: -24,
        } as ConstructorParameters<ToneNS['MetalSynth']>[0]).toDestination(),
        clap: new Tone.NoiseSynth({
          noise: { type: 'pink' },
          envelope: { attack: 0.005, decay: 0.15, sustain: 0 },
          volume: -12,
        }).toDestination(),
        melody: new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 },
          volume: -8,
        }).toDestination(),
      };
    }
    return Tone;
  }

  async function togglePlay() {
    setError(null);
    try {
      const Tone = await ensureTone();
      const transport = Tone.getTransport();
      if (playing) {
        transport.stop();
        seqRef.current?.dispose();
        seqRef.current = null;
        setPlaying(false);
        setStepIdx(-1);
        return;
      }
      transport.bpm.value = pattern.bpm;

      const indices = Array.from({ length: STEPS }, (_, i) => i);
      const seq = new Tone.Sequence<number>(
        (time, step) => {
          const inst = instrumentsRef.current!;
          if (pattern.drums.kick[step]) inst.kick.triggerAttackRelease('C2', '8n', time);
          if (pattern.drums.snare[step]) inst.snare.triggerAttackRelease('16n', time);
          if (pattern.drums.hat[step]) inst.hat.triggerAttackRelease('32n', time);
          if (pattern.drums.clap[step]) inst.clap.triggerAttackRelease('16n', time);
          const noteId = pattern.melody[step]!;
          const midi = MELODY_NOTES.find((n) => n.id === noteId)?.midi;
          if (midi != null) {
            inst.melody.triggerAttackRelease(
              Tone.Frequency(midi, 'midi').toNote(),
              '8n',
              time,
            );
          }
          Tone.getDraw().schedule(() => setStepIdx(step), time);
        },
        indices,
        '8n',
      );
      seq.start(0);
      seqRef.current = seq;
      transport.start();
      setPlaying(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function toggleDrum(drumId: DrumId, step: number) {
    setPattern((prev) => ({
      ...prev,
      drums: {
        ...prev.drums,
        [drumId]: prev.drums[drumId].map((v, i) => (i === step ? !v : v)),
      },
    }));
  }

  function cycleMelody(step: number) {
    setPattern((prev) => {
      const current = prev.melody[step];
      const idx = MELODY_NOTES.findIndex((n) => n.id === current);
      const next = MELODY_NOTES[(idx + 1) % MELODY_NOTES.length]!;
      return {
        ...prev,
        melody: prev.melody.map((v, i) => (i === step ? next.id : v)) as NoteId[],
      };
    });
  }

  function setBpm(v: number) {
    setPattern((p) => ({ ...p, bpm: Math.max(60, Math.min(160, v)) }));
  }

  async function saveAsWav() {
    setSaving(true);
    setError(null);
    setSavedUrl(null);
    try {
      const Tone = await ensureTone();
      // 1 ループ分(8 ステップ × 8n = 4 拍 = 60/bpm * 4 秒)× 2 周で 2 小節に
      const loopSec = (60 / pattern.bpm) * 4;
      const totalSec = loopSec * 2 + 0.3; // 少し 余韻

      const rendered = await Tone.Offline(async () => {
        const kick = new Tone.MembraneSynth({ volume: -6 }).toDestination();
        const snare = new Tone.NoiseSynth({
          noise: { type: 'white' },
          envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
          volume: -10,
        }).toDestination();
        const hat = new Tone.MetalSynth({
          envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
          volume: -24,
        } as ConstructorParameters<ToneNS['MetalSynth']>[0]).toDestination();
        const clap = new Tone.NoiseSynth({
          noise: { type: 'pink' },
          envelope: { attack: 0.005, decay: 0.15, sustain: 0 },
          volume: -12,
        }).toDestination();
        const melody = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 },
          volume: -8,
        }).toDestination();

        const transport = Tone.getTransport();
        transport.bpm.value = pattern.bpm;

        const stepSec = loopSec / STEPS;
        for (let loop = 0; loop < 2; loop++) {
          for (let s = 0; s < STEPS; s++) {
            const t = loop * loopSec + s * stepSec;
            if (pattern.drums.kick[s]) kick.triggerAttackRelease('C2', '8n', t);
            if (pattern.drums.snare[s]) snare.triggerAttackRelease('16n', t);
            if (pattern.drums.hat[s]) hat.triggerAttackRelease('32n', t);
            if (pattern.drums.clap[s]) clap.triggerAttackRelease('16n', t);
            const midi = MELODY_NOTES.find((n) => n.id === pattern.melody[s])?.midi;
            if (midi != null) {
              melody.triggerAttackRelease(
                Tone.Frequency(midi, 'midi').toNote(),
                '8n',
                t,
              );
            }
          }
        }
        transport.start(0);
      }, totalSec);

      // ToneAudioBuffer → AudioBuffer
      type ToneAudioBufferLike = { get: () => AudioBuffer | null };
      const audioBuf =
        (rendered as unknown as ToneAudioBufferLike).get?.() ??
        (rendered as unknown as AudioBuffer);
      const wavBlob = audioBufferToWav(audioBuf as AudioBuffer);

      // upload API に 送る
      const file = new File([wavBlob], 'music.wav', { type: 'audio/wav' });
      const fd = new FormData();
      fd.set('kind', 'audio');
      fd.set('title', `🎵 ${title || '名前なし'}(${mood})`);
      fd.set('durationSec', String(Math.ceil(totalSec)));
      fd.set('transcript', `ドラム+メロディ / ${pattern.bpm}BPM / ${mood}`);
      fd.set('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'ほぞんに しっぱい');
      setSavedUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={togglePlay}>
            {playing ? '⏹ とめる' : '▶️ ならす'}
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-kid-ink/60">テンポ:</span>
            <input
              type="range"
              min={60}
              max={160}
              value={pattern.bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-32 accent-kid-primary"
            />
            <span className="w-12 font-mono">{pattern.bpm}</span>
          </div>
          <Button type="button" variant="ghost" onClick={() => setPattern(emptyPattern())}>
            🔁 リセット
          </Button>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold">🥁 ドラム(タップで ON/OFF)</p>
        <div className="mt-3 space-y-2">
          {DRUMS.map((d) => (
            <div key={d.id} className="flex items-center gap-2">
              <span className="w-28 text-sm">
                {d.emoji} {d.label}
              </span>
              <div className="grid flex-1 grid-cols-8 gap-1">
                {pattern.drums[d.id].map((on, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDrum(d.id, i)}
                    aria-pressed={on}
                    className={`h-10 rounded-lg border-2 ${
                      on
                        ? 'border-kid-primary bg-kid-primary'
                        : 'border-kid-ink/10 bg-white'
                    } ${stepIdx === i ? 'ring-2 ring-kid-accent' : ''}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold">🎶 メロディ(タップで 音を きりかえ)</p>
        <p className="mt-1 text-xs text-kid-ink/60">
          — は 休符、ド・レ・ミ・ソ・ラ が 順番に きりかわるよ
        </p>
        <div className="mt-3 grid grid-cols-8 gap-1">
          {pattern.melody.map((n, i) => {
            const note = MELODY_NOTES.find((x) => x.id === n)!;
            return (
              <button
                key={i}
                type="button"
                onClick={() => cycleMelody(i)}
                className={`flex h-12 flex-col items-center justify-center rounded-lg border-2 ${
                  n === 'rest'
                    ? 'border-kid-ink/10 bg-kid-soft text-kid-ink/50'
                    : 'border-kid-primary bg-kid-primary/10 text-kid-primary'
                } ${stepIdx === i ? 'ring-2 ring-kid-accent' : ''}`}
              >
                <span className="text-base font-semibold">{note.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold">💾 ほぞん(2 小節の WAV に する)</p>
        <div className="mt-3 space-y-3">
          <div>
            <Label>なまえ</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="例:まちの あさ"
            />
          </div>
          <div>
            <Label>きもち(タグ)</Label>
            <div className="flex flex-wrap gap-2">
              {['たのしい', 'しずか', 'さびしい', 'げんき', 'たいせつ'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`rounded-full border-2 px-3 py-1 text-sm ${
                    mood === m
                      ? 'border-kid-primary bg-kid-soft'
                      : 'border-kid-ink/10 bg-white hover:bg-kid-soft/50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}
          {savedUrl && (
            <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
              🎉 ほぞんしたよ!
              <audio src={savedUrl} className="mt-2 w-full" controls />
              <a
                href="/kids/gallery"
                className="mt-2 inline-block text-kid-primary underline"
              >
                マイさくひんで みる →
              </a>
            </div>
          )}
          <Button
            type="button"
            onClick={saveAsWav}
            disabled={saving}
            className="w-full"
          >
            {saving ? '書き出し中…' : '💾 WAV で ほぞん'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
