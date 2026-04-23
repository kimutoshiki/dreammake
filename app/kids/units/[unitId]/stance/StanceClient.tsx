'use client';

import { useState, useTransition } from 'react';
import { recordStance } from '@/lib/actions/stance';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input, Label, Textarea } from '@/components/ui/Input';

type Stance = { id: string; label: string; icon: string };

export function StanceClient({
  unitId,
  stances,
  myLatest,
}: {
  unitId: string;
  stances: Stance[];
  myLatest: {
    stanceId: string | null;
    customLabel: string | null;
    strength: number;
  } | null;
}) {
  const [selected, setSelected] = useState<string | null>(
    myLatest?.stanceId ?? null,
  );
  const [customLabel, setCustomLabel] = useState(myLatest?.customLabel ?? '');
  const [strength, setStrength] = useState(myLatest?.strength ?? 3);
  const [reasoning, setReasoning] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await recordStance(fd);
      if (res.ok) {
        setMsg({ ok: true, text: 'きろくしたよ!' });
      } else {
        setMsg({ ok: false, text: res.message });
      }
    });
  }

  return (
    <Card>
      <CardTitle>いまの 自分の 立場を きろくしよう</CardTitle>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <input type="hidden" name="unitId" value={unitId} />
        <input type="hidden" name="phase" value="mid" />

        <div>
          <Label>立場を えらぶ</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {stances.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelected(s.id);
                  setCustomLabel('');
                }}
                className={`rounded-2xl border-2 p-3 text-left transition-colors ${
                  selected === s.id
                    ? 'border-kid-primary bg-kid-soft'
                    : 'border-kid-ink/10 bg-white hover:bg-kid-soft/50'
                }`}
              >
                <span className="mr-2">{s.icon}</span>
                <span className="font-medium">{s.label}</span>
              </button>
            ))}
          </div>
          <input type="hidden" name="stanceId" value={selected ?? ''} />
        </div>

        <div className="rounded-2xl bg-kid-soft p-4">
          <Label>
            🌱 あたらしい 立場を 書く(どれにも 当てはまらないときは ここ)
          </Label>
          <Input
            name="customLabel"
            value={customLabel}
            onChange={(e) => {
              setCustomLabel(e.target.value);
              if (e.target.value) setSelected(null);
            }}
            maxLength={60}
            placeholder="例:通学路で 毎日 通る 高校生"
          />
        </div>

        <div>
          <Label>どれくらい 強く 思う?(1:すこし〜5:とても)</Label>
          <input
            name="strength"
            type="range"
            min={1}
            max={5}
            value={strength}
            onChange={(e) => setStrength(Number(e.target.value))}
            className="w-full accent-kid-primary"
          />
          <p className="text-center text-sm text-kid-ink/70">
            いま:{'★'.repeat(strength)}{'☆'.repeat(5 - strength)}
          </p>
        </div>

        <div>
          <Label>どうして そう思う?</Label>
          <Textarea
            name="reasoning"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            rows={3}
            required
            maxLength={500}
          />
        </div>

        {msg && (
          <p
            className={`rounded-xl p-3 text-sm ${
              msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {msg.text}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={pending || (!selected && !customLabel.trim()) || !reasoning.trim()}
        >
          {pending ? 'きろく中…' : 'きろくする'}
        </Button>
      </form>
    </Card>
  );
}
