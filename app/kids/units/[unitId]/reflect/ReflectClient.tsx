'use client';

import { useState, useTransition } from 'react';
import { saveReflection } from '@/lib/actions/reflection';
import {
  detectStandstillWords,
  encouragementFor,
} from '@/lib/research/standstill-rules';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label, Textarea } from '@/components/ui/Input';

export function ReflectClient({ unitId }: { unitId: string }) {
  const [text, setText] = useState('');
  const [prompt, setPrompt] = useState('きょう 気づいたこと / まよったこと');
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    count: number;
    encouragement: string;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 入力中のライブ検出(クライアントでルールのみ動かす)
  const liveDetection = detectStandstillWords(text);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim()) return;
    setErr(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveReflection(fd);
      if (!result.ok) {
        setErr(result.message);
        return;
      }
      setFeedback({
        count: result.standstillCount,
        encouragement: encouragementFor(result.standstillCount, 'middle'),
      });
      setText('');
    });
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <input type="hidden" name="unitId" value={unitId} />
        <input type="hidden" name="phase" value="during" />
        <div>
          <Label>今日の 問い</Label>
          <select
            name="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full rounded-xl border-2 border-kid-ink/10 bg-white px-4 py-3 outline-none focus:border-kid-primary"
          >
            <option>きょう 気づいたこと / まよったこと</option>
            <option>まだ 聞こえていない こえは だれだと 思う?</option>
            <option>きょうの 対話で、ほんとうに そうかな?と 思った ところは?</option>
            <option>もし あなたが ◯◯の 立場 だったら、どう 思うかな?</option>
          </select>
        </div>
        <div>
          <Label>じぶんの ことばで 書いてみよう</Label>
          <Textarea
            name="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={4000}
            placeholder="例:お店の人は こまっているかも。でも ベビーカーの 人も こまる。もしかしたら…"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-kid-soft p-3 text-sm">
          <span>
            ✨ 立ち止まりメーター:{' '}
            <strong>{liveDetection.total}</strong> 回(書きながら 見つかった数)
          </span>
          <span className="text-xs text-kid-ink/60">{text.length}文字</span>
        </div>

        {liveDetection.matches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {liveDetection.matches.map((m, i) => (
              <span
                key={i}
                className="rounded-full bg-kid-primary/10 px-2 py-0.5 text-xs"
              >
                {m.term}
              </span>
            ))}
          </div>
        )}

        {err && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>
        )}

        <Button type="submit" className="w-full" disabled={pending || !text.trim()}>
          {pending ? 'ほぞん中…' : 'ほぞんする'}
        </Button>

        {feedback && (
          <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
            {feedback.encouragement}
          </p>
        )}
      </form>
    </Card>
  );
}
