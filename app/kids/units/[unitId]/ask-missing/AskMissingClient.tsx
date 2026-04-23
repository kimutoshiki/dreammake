'use client';

import { useState, useTransition } from 'react';
import { saveMissingVoiceHypothesis } from '@/lib/actions/missing-voice';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Label, Textarea } from '@/components/ui/Input';

type Probed = {
  prominentInRecentExchange: Array<{ label: string; whyProminent: string }>;
  possiblyMissingVoices: Array<{
    label: string;
    whyMightBeMissing: string;
    suggestedProbe: string;
  }>;
  invitation: string;
  sourceHint: string;
};

export function AskMissingClient({
  unitId,
  themeQuestion,
}: {
  unitId: string;
  themeQuestion: string;
}) {
  const [childNote, setChildNote] = useState('');
  const [probed, setProbed] = useState<Probed | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [hypothesis, setHypothesis] = useState('');
  const [evidence, setEvidence] = useState('');
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [askPending, startAsk] = useTransition();
  const [savePending, startSave] = useTransition();

  async function askAI() {
    setError(null);
    setProbed(null);
    startAsk(async () => {
      const res = await fetch(`/api/units/${unitId}/missing-voice`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          recentExchange: [],
          childNote,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'うまく 読み込めなかったよ');
        return;
      }
      const data = (await res.json()) as Probed;
      setProbed(data);
    });
  }

  function togglePick(label: string) {
    setPicked((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
    );
    // 仮説のテキストが空なら、選んだラベルを土台にする
    if (!hypothesis && !picked.includes(label)) {
      setHypothesis(
        `${label} の こえが 聞こえていないかもしれない。なぜかというと…`,
      );
    }
  }

  async function save() {
    if (!hypothesis.trim()) {
      setError('かせつを 書いてから 保存しようね');
      return;
    }
    setError(null);
    setSavedMsg(null);
    startSave(async () => {
      const result = await saveMissingVoiceHypothesis({
        unitId,
        askedPrompt: childNote,
        aiResponseDigest: probed
          ? JSON.stringify(probed.possiblyMissingVoices)
          : '',
        hypothesisText: hypothesis,
        evidence: evidence || undefined,
        shared,
      });
      if (result.ok) {
        setSavedMsg('ほぞんしたよ!');
        setHypothesis('');
        setEvidence('');
        setPicked([]);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle className="text-base">1. きになる ことを 書こう</CardTitle>
        <p className="mt-1 text-xs text-kid-ink/60">
          中心の問い:{themeQuestion}
        </p>
        <Label>どんな ことが きになっている?(書かなくても OK)</Label>
        <Textarea
          rows={2}
          value={childNote}
          onChange={(e) => setChildNote(e.target.value)}
          maxLength={400}
          placeholder="例:みんな お店のことばかり 話していた 気がする"
        />
        <Button
          type="button"
          className="mt-3 w-full"
          disabled={askPending}
          onClick={askAI}
        >
          {askPending ? '考えてるよ…' : '🤖 AI に きいてみる'}
        </Button>
      </Card>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {probed && (
        <>
          <Card>
            <CardTitle className="text-base">
              2. AI が かえした「強く 出ていた 立場」
            </CardTitle>
            <ul className="mt-2 space-y-2 text-sm">
              {probed.prominentInRecentExchange.map((p, i) => (
                <li key={i} className="rounded-xl bg-kid-soft p-3">
                  <p className="font-medium">{p.label}</p>
                  <p className="mt-1 text-xs text-kid-ink/60">
                    {p.whyProminent}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTitle className="text-base">
              3. 出てこなかったかもしれない 声(仮説)
            </CardTitle>
            <p className="mt-1 text-xs text-kid-ink/60">
              どれが 気になる?タップして 選んでみよう(いくつでも OK)
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {probed.possiblyMissingVoices.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => togglePick(v.label)}
                  className={`rounded-2xl border-2 p-3 text-left transition-colors ${
                    picked.includes(v.label)
                      ? 'border-kid-primary bg-kid-soft'
                      : 'border-kid-ink/10 bg-white hover:bg-kid-soft/50'
                  }`}
                >
                  <p className="font-medium text-sm">🔍 {v.label}</p>
                  <p className="mt-1 text-xs text-kid-ink/70">
                    {v.whyMightBeMissing}
                  </p>
                  <p className="mt-1 text-xs text-kid-ink/60">
                    🌱 つぎ:{v.suggestedProbe}
                  </p>
                </button>
              ))}
            </div>
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              ⚠️ これは AI の「仮説」。本当に 出ていなかったかは あなたが 確かめよう。
            </p>
            <p className="mt-2 text-sm italic">{probed.invitation}</p>
          </Card>

          <Card>
            <CardTitle className="text-base">
              4. じぶんの ことばで かせつを 書こう
            </CardTitle>
            <Label>だれの こえが 聞こえていないと 思う?なぜ?</Label>
            <Textarea
              rows={3}
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              maxLength={800}
            />
            <Label>こんき(どこで そう思った?)</Label>
            <Textarea
              rows={2}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              maxLength={800}
            />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={shared}
                onChange={(e) => setShared(e.target.checked)}
                className="h-5 w-5 accent-kid-primary"
              />
              クラスに みんなと 共有する
            </label>
            <Button
              type="button"
              className="mt-3 w-full"
              disabled={savePending}
              onClick={save}
            >
              {savePending ? 'ほぞん中…' : 'ほぞんする'}
            </Button>
            {savedMsg && (
              <p className="mt-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
                {savedMsg}
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
