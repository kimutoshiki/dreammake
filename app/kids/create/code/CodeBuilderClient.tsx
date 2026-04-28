'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import {
  createProgramArtwork,
  type Command,
  type ProgramSpec,
} from '@/lib/actions/program';

const HEROES = ['🐢', '🐱', '🐭', '🐰', '🦊', '🐻'];
const GRID = 5;

type Heading = 0 | 1 | 2 | 3; // 0=上, 1=右, 2=下, 3=左
const ARROW: Record<Heading, string> = { 0: '⬆︎', 1: '➡︎', 2: '⬇︎', 3: '⬅︎' };

type Step = {
  x: number;
  y: number;
  heading: Heading;
  say?: string;
};

function step(prev: Step, c: Exclude<Command, { kind: 'repeat' }>): Step {
  if (c.kind === 'left') return { ...prev, heading: ((prev.heading + 3) % 4) as Heading, say: undefined };
  if (c.kind === 'right') return { ...prev, heading: ((prev.heading + 1) % 4) as Heading, say: undefined };
  if (c.kind === 'say') return { ...prev, say: c.text };
  // forward
  let { x, y } = prev;
  if (prev.heading === 0) y -= 1;
  else if (prev.heading === 1) x += 1;
  else if (prev.heading === 2) y += 1;
  else x -= 1;
  x = Math.max(0, Math.min(GRID - 1, x));
  y = Math.max(0, Math.min(GRID - 1, y));
  return { x, y, heading: prev.heading, say: undefined };
}

function flatten(commands: Command[]): Array<Exclude<Command, { kind: 'repeat' }>> {
  const out: Array<Exclude<Command, { kind: 'repeat' }>> = [];
  for (const c of commands) {
    if (c.kind === 'repeat') {
      for (let i = 0; i < c.times; i++) for (const inner of c.body) out.push(inner);
    } else {
      out.push(c);
    }
  }
  return out;
}

const COMMAND_LABEL: Record<Command['kind'], { emoji: string; label: string }> = {
  forward: { emoji: '🟢', label: 'まえに すすむ' },
  left: { emoji: '↩︎', label: 'ひだりに まわる' },
  right: { emoji: '↪︎', label: 'みぎに まわる' },
  say: { emoji: '💬', label: 'いう' },
  repeat: { emoji: '🔁', label: 'くりかえす' },
};

export function CodeBuilderClient() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [hero, setHero] = useState('🐢');
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [goalX, setGoalX] = useState(GRID - 1);
  const [goalY, setGoalY] = useState(GRID - 1);
  const [commands, setCommands] = useState<Command[]>([]);
  const [running, setRunning] = useState(false);
  const [cur, setCur] = useState<Step>({ x: 0, y: 0, heading: 1 });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reached, setReached] = useState(false);

  // 主人公の 開始位置を 反映
  useEffect(() => {
    if (!running) setCur({ x: startX, y: startY, heading: 1 });
  }, [startX, startY, running]);

  function add(c: Command) {
    if (commands.length >= 40) return;
    setCommands([...commands, c]);
  }
  function remove(i: number) {
    setCommands(commands.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= commands.length) return;
    const next = [...commands];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setCommands(next);
  }
  function clear() {
    setCommands([]);
    setReached(false);
  }

  async function run() {
    setRunning(true);
    setReached(false);
    let s: Step = { x: startX, y: startY, heading: 1 };
    setCur(s);
    const flat = flatten(commands);
    for (const c of flat) {
      await new Promise((r) => setTimeout(r, 350));
      s = step(s, c);
      setCur({ ...s });
      if (s.x === goalX && s.y === goalY) {
        setReached(true);
        break;
      }
    }
    setRunning(false);
  }

  async function save() {
    setError(null);
    if (!title.trim()) {
      setError('タイトルを 入れてね');
      return;
    }
    if (commands.length === 0) {
      setError('めいれい を 1 つ いじょう ならべてね');
      return;
    }
    setPending(true);
    const spec: ProgramSpec = {
      title: title.trim(),
      hero,
      goal: '🎯',
      startX,
      startY,
      goalX,
      goalY,
      commands,
    };
    const res = await createProgramArtwork(spec);
    setPending(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.push('/kids/gallery');
    router.refresh();
  }

  return (
    <Card className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>タイトル</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="れい:カメさん ゴールへ いこう"
            maxLength={60}
          />
        </div>
        <div>
          <Label>主人公</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {HEROES.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHero(h)}
                className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xl ${
                  hero === h ? 'bg-kid-primary text-white' : 'bg-kid-soft hover:bg-kid-primary/20'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <Grid
          hero={hero}
          cur={cur}
          startX={startX}
          startY={startY}
          goalX={goalX}
          goalY={goalY}
          editable={!running}
          onSetStart={(x, y) => { setStartX(x); setStartY(y); }}
          onSetGoal={(x, y) => { setGoalX(x); setGoalY(y); }}
        />
        <div>
          <Label>めいれい(タップで 追加 — {commands.length}/40)</Label>
          <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <CmdButton emoji="🟢" label="まえに" onClick={() => add({ kind: 'forward' })} />
            <CmdButton emoji="↩︎" label="ひだり" onClick={() => add({ kind: 'left' })} />
            <CmdButton emoji="↪︎" label="みぎ" onClick={() => add({ kind: 'right' })} />
            <CmdButton
              emoji="💬"
              label="いう"
              onClick={() => {
                const t = window.prompt('なんて いう?', 'こんにちは!');
                if (t && t.trim()) add({ kind: 'say', text: t.trim().slice(0, 40) });
              }}
            />
            <CmdButton
              emoji="🔁"
              label="くりかえす"
              onClick={() => {
                const n = Number(window.prompt('なんかい くりかえす?(2〜10)', '3'));
                if (Number.isFinite(n) && n >= 2 && n <= 10) {
                  add({
                    kind: 'repeat',
                    times: n,
                    body: [{ kind: 'forward' }],
                  });
                }
              }}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs text-kid-ink/60">めいれい の じゅんばん</p>
        {commands.length === 0 ? (
          <p className="mt-1 rounded-2xl bg-kid-soft p-3 text-sm text-kid-ink/60">
            まだ ない。うえから ボタンを タップ!
          </p>
        ) : (
          <ol className="mt-1 space-y-1">
            {commands.map((c, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-2xl bg-kid-soft px-3 py-2 text-sm"
              >
                <span className="text-base">{COMMAND_LABEL[c.kind].emoji}</span>
                <span className="flex-1">
                  {c.kind === 'say'
                    ? `「${c.text}」と いう`
                    : c.kind === 'repeat'
                      ? `${c.times} かい くりかえす(まえに すすむ × ${c.body.length})`
                      : COMMAND_LABEL[c.kind].label}
                </span>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  className="rounded-full px-2 hover:bg-white"
                  aria-label="うえへ"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  className="rounded-full px-2 hover:bg-white"
                  aria-label="した へ"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded-full px-2 text-red-500 hover:bg-white"
                  aria-label="けす"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={run} disabled={running || commands.length === 0}>
          {running ? '▶︎ うごいてるよ…' : '▶︎ じっこう'}
        </Button>
        <Button variant="ghost" onClick={clear} disabled={running}>
          🗑 ぜんぶ けす
        </Button>
        <Button variant="ghost" onClick={save} disabled={pending || running}>
          {pending ? 'ほぞん中…' : '💾 ほぞん'}
        </Button>
      </div>

      {reached && (
        <p className="text-sm font-semibold text-emerald-600">🎉 ゴールに とうちゃく!</p>
      )}
      {cur.say && <p className="text-sm">💬 {cur.say}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </Card>
  );
}

function CmdButton({
  emoji,
  label,
  onClick,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center rounded-2xl bg-kid-soft p-3 transition hover:bg-kid-primary/20 active:scale-95"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="mt-1 text-xs">{label}</span>
    </button>
  );
}

function Grid({
  hero,
  cur,
  startX,
  startY,
  goalX,
  goalY,
  editable,
  onSetStart,
  onSetGoal,
}: {
  hero: string;
  cur: Step;
  startX: number;
  startY: number;
  goalX: number;
  goalY: number;
  editable: boolean;
  onSetStart: (x: number, y: number) => void;
  onSetGoal: (x: number, y: number) => void;
}) {
  const [picking, setPicking] = useState<'start' | 'goal' | null>(null);
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const isHero = cur.x === x && cur.y === y;
      const isStart = startX === x && startY === y;
      const isGoal = goalX === x && goalY === y;
      cells.push(
        <button
          key={`${x},${y}`}
          type="button"
          disabled={!editable || !picking}
          onClick={() => {
            if (picking === 'start') onSetStart(x, y);
            if (picking === 'goal') onSetGoal(x, y);
            setPicking(null);
          }}
          className={`flex aspect-square items-center justify-center rounded-md border text-2xl transition ${
            isHero
              ? 'border-kid-primary bg-kid-primary/10'
              : 'border-kid-ink/10 bg-white'
          } ${picking ? 'cursor-pointer hover:bg-kid-soft' : ''}`}
        >
          {isHero ? (
            <span className="relative">
              {hero}
              <span className="absolute -right-3 -top-2 text-xs">{ARROW[cur.heading]}</span>
            </span>
          ) : isGoal ? (
            '🎯'
          ) : isStart ? (
            <span className="text-xs text-kid-ink/40">start</span>
          ) : (
            ''
          )}
        </button>,
      );
    }
  }
  return (
    <div>
      <div className="grid w-56 grid-cols-5 gap-1 sm:w-72">{cells}</div>
      <div className="mt-2 flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setPicking(picking === 'start' ? null : 'start')}
          className={`rounded-full px-3 py-1 ${
            picking === 'start' ? 'bg-kid-primary text-white' : 'bg-kid-soft'
          }`}
          disabled={!editable}
        >
          📍 スタート
        </button>
        <button
          type="button"
          onClick={() => setPicking(picking === 'goal' ? null : 'goal')}
          className={`rounded-full px-3 py-1 ${
            picking === 'goal' ? 'bg-kid-primary text-white' : 'bg-kid-soft'
          }`}
          disabled={!editable}
        >
          🎯 ゴール
        </button>
      </div>
    </div>
  );
}
