'use client';

import { useState, useTransition } from 'react';
import { submitSurveyResponse } from '@/lib/actions/survey';
import type { DefaultSurvey, SurveyQuestion } from '@/lib/research/default-surveys';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Input';

export function SurveyClient({
  instrumentId,
  template,
  initialAnswers,
}: {
  instrumentId: string;
  template: DefaultSurvey;
  initialAnswers: Record<string, unknown>;
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function setAnswer(id: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await submitSurveyResponse({ instrumentId, answers });
      if (res.ok) setMsg({ ok: true, text: '送信したよ。ありがとう!' });
      else setMsg({ ok: false, text: res.message });
    });
  }

  return (
    <div className="space-y-3">
      {template.questions.map((q, i) => (
        <Card key={q.id}>
          <p className="text-xs text-kid-ink/50">
            {i + 1} / {template.questions.length}
          </p>
          <p className="mt-1 font-medium">{q.questionJa}</p>
          <div className="mt-3">
            <QuestionInput
              q={q}
              value={answers[q.id]}
              onChange={(v) => setAnswer(q.id, v)}
            />
          </div>
        </Card>
      ))}
      {msg && (
        <p
          className={`rounded-xl p-3 text-sm ${
            msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {msg.text}
        </p>
      )}
      <Button type="button" className="w-full" onClick={submit} disabled={pending}>
        {pending ? '送信中…' : '送信する'}
      </Button>
    </div>
  );
}

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: SurveyQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (q.kind === 'single-choice') {
    return (
      <div className="space-y-2">
        {q.choices?.map((c) => (
          <label
            key={c.id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 ${
              value === c.id
                ? 'border-kid-primary bg-kid-soft'
                : 'border-kid-ink/10 bg-white hover:bg-kid-soft/50'
            }`}
          >
            <input
              type="radio"
              name={q.id}
              checked={value === c.id}
              onChange={() => onChange(c.id)}
              className="accent-kid-primary"
            />
            <span>{c.labelJa}</span>
          </label>
        ))}
      </div>
    );
  }
  if (q.kind === 'likert-5') {
    const v = typeof value === 'number' ? value : 3;
    return (
      <div>
        <input
          type="range"
          min={1}
          max={5}
          value={v}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-kid-primary"
        />
        <div className="mt-1 flex justify-between text-xs text-kid-ink/60">
          <span>1:{q.likertLabels?.min}</span>
          <span className="font-semibold text-kid-ink">
            {'★'.repeat(v)}
            {'☆'.repeat(5 - v)}
          </span>
          <span>5:{q.likertLabels?.max}</span>
        </div>
      </div>
    );
  }
  if (q.kind === 'short-text') {
    return (
      <input
        type="text"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border-2 border-kid-ink/10 bg-white px-4 py-3 outline-none focus:border-kid-primary"
        maxLength={200}
      />
    );
  }
  if (q.kind === 'long-text') {
    return (
      <Textarea
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={800}
      />
    );
  }
  return null;
}
