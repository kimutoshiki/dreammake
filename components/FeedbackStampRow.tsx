'use client';

import { useState, useTransition } from 'react';
import { toggleFeedbackStamp } from '@/lib/actions/feedback';
import { FEEDBACK_STAMPS } from '@/lib/feedback/stamps';

/**
 * 教員用:児童の Artwork または FieldNote に スタンプを押す行。
 * `myStampIds` に この教員が 押したもの、
 * `allCountByStamp` に すべての教員の 合計数を 渡す。
 */
export function TeacherFeedbackStampRow({
  target,
  myStampIds,
  allCountByStamp,
}: {
  target: { artworkId?: string; fieldNoteId?: string };
  myStampIds: string[];
  allCountByStamp: Record<string, number>;
}) {
  const [mine, setMine] = useState<Set<string>>(new Set(myStampIds));
  const [counts, setCounts] = useState<Record<string, number>>(allCountByStamp);
  const [pending, startTransition] = useTransition();

  function toggle(stamp: string) {
    const was = mine.has(stamp);
    // 楽観的更新
    setMine((prev) => {
      const next = new Set(prev);
      if (was) next.delete(stamp);
      else next.add(stamp);
      return next;
    });
    setCounts((prev) => ({
      ...prev,
      [stamp]: Math.max(0, (prev[stamp] ?? 0) + (was ? -1 : 1)),
    }));
    startTransition(async () => {
      await toggleFeedbackStamp({
        artworkId: target.artworkId,
        fieldNoteId: target.fieldNoteId,
        stamp: stamp as 'like' | 'wow' | 'think' | 'grow' | 'cheer',
      });
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {FEEDBACK_STAMPS.map((s) => {
        const isMine = mine.has(s.id);
        const count = counts[s.id] ?? 0;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(s.id)}
            disabled={pending}
            aria-pressed={isMine}
            className={`inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-xs ${
              isMine
                ? 'border-kid-primary bg-kid-primary/10'
                : 'border-kid-ink/10 bg-white hover:bg-kid-soft'
            }`}
            title={s.label}
          >
            <span className="text-base">{s.emoji}</span>
            <span>{s.label}</span>
            {count > 0 && (
              <span className="rounded-full bg-kid-soft px-1.5 text-[10px]">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 児童用:読み取り専用。押されたスタンプのみ表示。
 */
export function FeedbackStampBadges({
  countByStamp,
}: {
  countByStamp: Record<string, number>;
}) {
  const entries = FEEDBACK_STAMPS.filter((s) => (countByStamp[s.id] ?? 0) > 0);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map((s) => (
        <span
          key={s.id}
          className="inline-flex items-center gap-0.5 rounded-full bg-kid-primary/10 px-2 py-0.5 text-[11px]"
          title={s.label}
        >
          {s.emoji}
          {(countByStamp[s.id] ?? 0) > 1 && (
            <span className="text-[10px]">×{countByStamp[s.id]}</span>
          )}
        </span>
      ))}
    </div>
  );
}
