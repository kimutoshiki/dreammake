'use client';

import { useState, useTransition } from 'react';
import { createQuizArtwork, type QuizSpec } from '@/lib/actions/quiz';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Label, Textarea } from '@/components/ui/Input';

type Q = {
  questionText: string;
  options: string[]; // 常に 4 個(空欄は送信時に除外)
  correctIndex: number;
  hint: string;
};

function emptyQuestion(): Q {
  return { questionText: '', options: ['', '', '', ''], correctIndex: 0, hint: '' };
}

export function QuizBuilderClient() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [questions, setQuestions] = useState<Q[]>([emptyQuestion()]);
  const [playing, setPlaying] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function updateQ(idx: number, patch: Partial<Q>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    );
  }
  function updateOption(qIdx: number, optIdx: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, j) => (j === optIdx ? value : o)) }
          : q,
      ),
    );
  }
  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }
  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function buildSpec(): QuizSpec | null {
    if (!title.trim()) return null;
    const cleaned = questions.map((q) => {
      const opts = q.options.map((o) => o.trim()).filter(Boolean);
      return {
        questionText: q.questionText.trim(),
        options: opts,
        correctIndex: Math.min(q.correctIndex, Math.max(0, opts.length - 1)),
        hint: q.hint.trim() || undefined,
      };
    });
    const valid = cleaned.filter((q) => q.questionText && q.options.length >= 2);
    if (valid.length === 0) return null;
    return {
      title: title.trim(),
      description: description.trim() || undefined,
      questions: valid,
      isPublic,
    };
  }

  function save() {
    setMsg(null);
    const spec = buildSpec();
    if (!spec) {
      setMsg({ kind: 'err', text: 'もんだいを 1つ いじょう 入れてね' });
      return;
    }
    startTransition(async () => {
      const res = await createQuizArtwork(spec);
      if (res.ok) {
        setMsg({ kind: 'ok', text: '🎉 クイズを ほぞんしたよ!' });
      } else {
        setMsg({ kind: 'err', text: res.message });
      }
    });
  }

  const spec = buildSpec();

  return (
    <div className="space-y-4">
      <Card>
        <Label>クイズの なまえ</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
          placeholder="例:町の ひみつ クイズ"
        />
        <div className="mt-3">
          <Label>かんたんな せつめい(任意)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={400}
          />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-5 w-5 accent-kid-primary"
          />
          クラスで みんなが 遊べるように 公開する
        </label>
      </Card>

      {questions.map((q, i) => (
        <Card key={i}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">もんだい {i + 1}</p>
            {questions.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeQuestion(i)}
              >
                🗑️ 消す
              </Button>
            )}
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <Label>もんだい</Label>
              <Input
                value={q.questionText}
                onChange={(e) => updateQ(i, { questionText: e.target.value })}
                maxLength={200}
                placeholder="例:商店街は いつ できた?"
              />
            </div>
            <div>
              <Label>こたえの こうほ(空欄は 無視されるよ)</Label>
              <div className="space-y-2">
                {q.options.map((o, j) => (
                  <label
                    key={j}
                    className={`flex items-center gap-2 rounded-xl border-2 p-2 ${
                      q.correctIndex === j
                        ? 'border-green-500 bg-green-50'
                        : 'border-kid-ink/10'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`correct-${i}`}
                      checked={q.correctIndex === j}
                      onChange={() => updateQ(i, { correctIndex: j })}
                      className="h-5 w-5 accent-green-600"
                    />
                    <span className="w-6 text-center text-sm text-kid-ink/60">
                      {'ABCD'[j]}
                    </span>
                    <Input
                      value={o}
                      onChange={(e) => updateOption(i, j, e.target.value)}
                      maxLength={100}
                      placeholder={j === q.correctIndex ? 'これが 正解!' : 'こたえの こうほ'}
                    />
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-kid-ink/60">
                緑の ◉ が 正解。どれか 1 つに チェック。
              </p>
            </div>
            <div>
              <Label>ヒント(任意)</Label>
              <Input
                value={q.hint}
                onChange={(e) => updateQ(i, { hint: e.target.value })}
                maxLength={200}
                placeholder="例:むかしの 写真を よく 見て"
              />
            </div>
          </div>
        </Card>
      ))}

      <Button type="button" variant="ghost" onClick={addQuestion} className="w-full">
        ➕ もんだいを たす
      </Button>

      {msg && (
        <p
          className={`rounded-xl p-3 text-sm ${
            msg.kind === 'ok'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={pending || !spec}>
          {pending ? 'ほぞん中…' : '💾 ほぞんする'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setPlaying(true)}
          disabled={!spec}
        >
          ▶️ ためしに あそぶ
        </Button>
      </div>

      {playing && spec && (
        <QuizPlayer spec={spec} onClose={() => setPlaying(false)} />
      )}
    </div>
  );
}

function QuizPlayer({ spec, onClose }: { spec: QuizSpec; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = spec.questions[index];
  if (!q || done) {
    return (
      <Card>
        <p className="text-lg font-semibold">🎉 おつかれさま!</p>
        <p className="mt-2 text-sm">
          {score} / {spec.questions.length} もん せいかい
        </p>
        <Button type="button" variant="ghost" className="mt-3" onClick={onClose}>
          作成に もどる
        </Button>
      </Card>
    );
  }
  const answered = picked !== null;
  return (
    <Card>
      <p className="text-xs text-kid-ink/60">
        おためしプレイ {index + 1} / {spec.questions.length}
      </p>
      <p className="mt-2 text-base font-medium">{q.questionText}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {q.options.map((o, j) => {
          const isPick = picked === j;
          const isAns = j === q.correctIndex;
          return (
            <button
              key={j}
              type="button"
              disabled={answered}
              onClick={() => {
                if (answered) return;
                setPicked(j);
                if (isAns) setScore((s) => s + 1);
              }}
              className={`rounded-2xl border-2 p-3 text-left ${
                !answered
                  ? 'border-kid-ink/10 bg-white hover:bg-kid-soft'
                  : isAns
                    ? 'border-green-500 bg-green-50'
                    : isPick
                      ? 'border-red-400 bg-red-50'
                      : 'border-kid-ink/5 bg-white opacity-60'
              }`}
            >
              {'ABCD'[j]}. {o}
            </button>
          );
        })}
      </div>
      {q.hint && !answered && (
        <p className="mt-3 text-xs text-kid-ink/60">💡 ヒント:{q.hint}</p>
      )}
      {answered && (
        <div className="mt-3 flex items-center justify-between">
          <p
            className={`rounded-full px-3 py-1 text-sm ${
              picked === q.correctIndex
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {picked === q.correctIndex ? 'せいかい!' : 'ちがったよ'}
          </p>
          <Button
            type="button"
            onClick={() => {
              if (index + 1 >= spec.questions.length) setDone(true);
              else {
                setIndex(index + 1);
                setPicked(null);
              }
            }}
          >
            {index + 1 >= spec.questions.length ? 'けっか' : 'つぎへ →'}
          </Button>
        </div>
      )}
    </Card>
  );
}
