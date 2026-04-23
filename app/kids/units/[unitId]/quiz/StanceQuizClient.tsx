'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type Quiz = {
  reasoning: string;
  answerLabel: string;
  options: string[];
};

export function StanceQuizClient({ quizzes }: { quizzes: Quiz[] }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const [done, setDone] = useState(false);

  const current = quizzes[index];
  if (!current || done) {
    return (
      <Card>
        <p className="text-lg font-semibold">🎉 おわり!</p>
        <p className="mt-2 text-sm">
          あたり: {score.right} / ぜんぶ: {quizzes.length}
        </p>
        <p className="mt-2 text-xs text-kid-ink/60">
          ぴったり 当てることよりも、「なんで そう思ったのかな?」と
          考えることが 大切だよ。
        </p>
        <Button
          type="button"
          variant="ghost"
          className="mt-4"
          onClick={() => {
            setIndex(0);
            setPicked(null);
            setScore({ right: 0, wrong: 0 });
            setDone(false);
          }}
        >
          もう いちど
        </Button>
      </Card>
    );
  }

  const answerLabel = current.answerLabel;
  const isAnswered = picked !== null;
  const isRight = picked === answerLabel;

  function pick(option: string) {
    if (isAnswered) return;
    setPicked(option);
    setScore((prev) =>
      option === answerLabel
        ? { ...prev, right: prev.right + 1 }
        : { ...prev, wrong: prev.wrong + 1 },
    );
  }

  function next() {
    if (index + 1 >= quizzes.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
      setPicked(null);
    }
  }

  return (
    <Card>
      <p className="text-xs text-kid-ink/50">
        もんだい {index + 1} / {quizzes.length}
      </p>
      <p className="mt-2 rounded-2xl bg-kid-soft p-4 text-base leading-relaxed">
        「{current.reasoning}」
      </p>
      <p className="mt-3 text-sm text-kid-ink/70">
        これは、どの 立場から 書かれた 文かな?
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {current.options.map((o) => {
          const isPick = picked === o;
          const isAns = o === current.answerLabel;
          return (
            <button
              key={o}
              type="button"
              disabled={isAnswered}
              onClick={() => pick(o)}
              className={`rounded-2xl border-2 p-3 text-left transition-colors ${
                !isAnswered
                  ? 'border-kid-ink/10 bg-white hover:bg-kid-soft/60'
                  : isAns
                    ? 'border-green-500 bg-green-50'
                    : isPick
                      ? 'border-red-400 bg-red-50'
                      : 'border-kid-ink/5 bg-white opacity-60'
              }`}
            >
              {o}
              {isAnswered && isAns && ' ✅'}
              {isAnswered && isPick && !isAns && ' ✖'}
            </button>
          );
        })}
      </div>
      {isAnswered && (
        <div className="mt-4 flex items-center justify-between">
          <p
            className={`rounded-full px-3 py-1 text-sm ${
              isRight ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isRight
              ? 'せいかい!'
              : `ちがったよ。こたえは「${current.answerLabel}」`}
          </p>
          <Button type="button" onClick={next}>
            {index + 1 >= quizzes.length ? 'けっか' : 'つぎへ →'}
          </Button>
        </div>
      )}
    </Card>
  );
}
