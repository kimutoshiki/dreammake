'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { createGameArtwork, type GameSpec } from '@/lib/actions/game';

const EMOJI_BANK = [
  '🐸', '🐰', '🐢', '🦊', '🐻', '🐼', '🐨', '🦁',
  '🐯', '🐮', '🐷', '🐔', '🐧', '🐦', '🦄', '🐝',
  '🍎', '🍌', '🍓', '🍇', '⭐', '🌟', '🎵', '🎈',
];
const BAD_BANK = ['💣', '👻', '⚡', '🦂', '🌶️', '☠️'];

const SPEED_LABEL: Record<GameSpec['speed'], string> = {
  slow: 'ゆっくり',
  medium: 'ふつう',
  fast: 'はやい',
};
const SPEED_INTERVAL_MS: Record<GameSpec['speed'], number> = {
  slow: 1500,
  medium: 950,
  fast: 600,
};

type Phase = 'edit' | 'play' | 'done';

export function GameMakerClient() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [good, setGood] = useState<string[]>(['🐸', '🐰', '🐢']);
  const [bad, setBad] = useState<string[]>(['💣']);
  const [duration, setDuration] = useState<GameSpec['durationSec']>(30);
  const [speed, setSpeed] = useState<GameSpec['speed']>('medium');
  const [phase, setPhase] = useState<Phase>('edit');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(arr: string[], setArr: (a: string[]) => void, e: string, max: number) {
    if (arr.includes(e)) setArr(arr.filter((x) => x !== e));
    else if (arr.length < max) setArr([...arr, e]);
  }

  async function save() {
    setError(null);
    if (!title.trim()) {
      setError('タイトルを 入れてね');
      return;
    }
    if (good.length === 0) {
      setError('でてくる 絵文字を 1 つ いじょう えらんでね');
      return;
    }
    setPending(true);
    const res = await createGameArtwork({
      title: title.trim(),
      goodEmojis: good,
      badEmojis: bad,
      durationSec: duration,
      speed,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.push('/kids/gallery');
    router.refresh();
  }

  if (phase === 'play' || phase === 'done') {
    return (
      <Card>
        <PlayBoard
          good={good}
          bad={bad}
          duration={duration}
          intervalMs={SPEED_INTERVAL_MS[speed]}
          onFinish={() => setPhase('done')}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setPhase('edit')}>
            ← つくり なおす
          </Button>
          {phase === 'done' && (
            <Button onClick={() => setPhase('play')}>🔁 もう一回 あそぶ</Button>
          )}
          <Button onClick={save} disabled={pending}>
            {pending ? 'ほぞん中…' : '💾 ほぞんして マイさくひんに'}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <div>
        <Label>タイトル</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="れい:カエルを たくさん タップ!"
          maxLength={60}
        />
      </div>

      <div>
        <Label>でてくる もの(タップ で +1 てん) — {good.length}/8</Label>
        <div className="mt-1 flex flex-wrap gap-2">
          {EMOJI_BANK.map((e) => {
            const on = good.includes(e);
            return (
              <button
                key={e}
                type="button"
                onClick={() => toggle(good, setGood, e, 8)}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition ${
                  on
                    ? 'bg-kid-primary text-white shadow'
                    : 'bg-kid-soft hover:bg-kid-primary/20'
                }`}
                aria-pressed={on}
              >
                {e}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>タップしては だめ な もの(任意) — {bad.length}/4</Label>
        <div className="mt-1 flex flex-wrap gap-2">
          {BAD_BANK.map((e) => {
            const on = bad.includes(e);
            return (
              <button
                key={e}
                type="button"
                onClick={() => toggle(bad, setBad, e, 4)}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition ${
                  on
                    ? 'bg-red-500 text-white shadow'
                    : 'bg-kid-soft hover:bg-red-200'
                }`}
                aria-pressed={on}
              >
                {e}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>じかん</Label>
          <div className="mt-1 flex gap-2">
            {[30, 60, 90].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDuration(s as GameSpec['durationSec'])}
                className={`flex-1 rounded-2xl px-3 py-2 text-sm transition ${
                  duration === s
                    ? 'bg-kid-primary text-white'
                    : 'bg-kid-soft hover:bg-kid-primary/20'
                }`}
              >
                {s} びょう
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>はやさ</Label>
          <div className="mt-1 flex gap-2">
            {(['slow', 'medium', 'fast'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`flex-1 rounded-2xl px-3 py-2 text-sm transition ${
                  speed === s
                    ? 'bg-kid-primary text-white'
                    : 'bg-kid-soft hover:bg-kid-primary/20'
                }`}
              >
                {SPEED_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setPhase('play')} disabled={good.length === 0}>
          ▶︎ あそんで みる
        </Button>
        <Button variant="ghost" onClick={save} disabled={pending}>
          {pending ? 'ほぞん中…' : '💾 つくって ほぞん'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </Card>
  );
}

type Spawn = {
  id: number;
  emoji: string;
  isBad: boolean;
  x: number; // 0..1
  y: number; // 0..1
  bornAt: number;
  ttlMs: number;
};

function PlayBoard({
  good,
  bad,
  duration,
  intervalMs,
  onFinish,
}: {
  good: string[];
  bad: string[];
  duration: number;
  intervalMs: number;
  onFinish: () => void;
}) {
  const [score, setScore] = useState(0);
  const [remainSec, setRemainSec] = useState(duration);
  const [spawns, setSpawns] = useState<Spawn[]>([]);
  const finished = remainSec <= 0;
  const idRef = useRef(0);

  useEffect(() => {
    if (finished) return;
    const tick = setInterval(() => setRemainSec((s) => Math.max(0, s - 1)), 1000);
    const spawn = setInterval(() => {
      const useBad = bad.length > 0 && Math.random() < 0.25;
      const pool = useBad ? bad : good;
      const emoji = pool[Math.floor(Math.random() * pool.length)]!;
      const ttlMs = Math.max(700, intervalMs * 1.4);
      idRef.current += 1;
      const sp: Spawn = {
        id: idRef.current,
        emoji,
        isBad: useBad,
        x: Math.random() * 0.85,
        y: Math.random() * 0.78,
        bornAt: Date.now(),
        ttlMs,
      };
      setSpawns((cur) => [...cur, sp]);
      setTimeout(() => {
        setSpawns((cur) => cur.filter((s) => s.id !== sp.id));
      }, ttlMs);
    }, intervalMs);
    return () => {
      clearInterval(tick);
      clearInterval(spawn);
    };
  }, [bad, good, intervalMs, finished]);

  useEffect(() => {
    if (finished) onFinish();
  }, [finished, onFinish]);

  function tap(s: Spawn) {
    setSpawns((cur) => cur.filter((x) => x.id !== s.id));
    setScore((sc) => sc + (s.isBad ? -2 : 1));
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="rounded-full bg-kid-soft px-3 py-1">
          ⏱️ のこり {remainSec} びょう
        </span>
        <span className="rounded-full bg-kid-primary px-3 py-1 text-white">
          スコア {score}
        </span>
      </div>
      <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-2xl bg-gradient-to-b from-sky-100 to-emerald-100">
        {spawns.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => tap(s)}
            className="absolute flex h-14 w-14 items-center justify-center text-3xl transition active:scale-90"
            style={{
              left: `${s.x * 100}%`,
              top: `${s.y * 100}%`,
              filter: s.isBad ? 'drop-shadow(0 0 4px #ef4444)' : 'none',
            }}
            aria-label={s.isBad ? 'タップしないで' : 'タップ'}
          >
            {s.emoji}
          </button>
        ))}
        {finished && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
            <p className="text-2xl font-bold">おわり!</p>
            <p className="mt-1 text-sm">スコア {score}</p>
          </div>
        )}
      </div>
    </div>
  );
}
