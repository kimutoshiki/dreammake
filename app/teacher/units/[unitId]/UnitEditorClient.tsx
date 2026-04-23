'use client';

import { useState, useTransition } from 'react';
import {
  addStance,
  updateHourAI,
  updateUnitStatus,
} from '@/lib/actions/unit';
import { ensureDefaultSurveys } from '@/lib/actions/survey';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input, Label, Textarea } from '@/components/ui/Input';

type Hour = {
  id: string;
  hourIndex: number;
  topic: string;
  aiInsertion: 'none' | 'before-self' | 'after-self' | 'ask-missing';
};

const AI_OPTIONS: Hour['aiInsertion'][] = [
  'none',
  'before-self',
  'after-self',
  'ask-missing',
];

export function UnitEditorClient({
  unitId,
  status,
  hours,
  stances,
  hasPre,
  hasPost,
}: {
  unitId: string;
  status: string;
  hours: Hour[];
  stances: Array<{ id: string; label: string; summary: string; icon: string }>;
  hasPre: boolean;
  hasPost: boolean;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function changeStatus(next: 'draft' | 'active' | 'closed') {
    startTransition(async () => {
      const res = await updateUnitStatus({ unitId, status: next });
      if (res.ok) setCurrentStatus(next);
    });
  }

  function changeAI(hourId: string, next: Hour['aiInsertion']) {
    startTransition(async () => {
      await updateHourAI({ hourId, aiInsertion: next });
    });
  }

  function makeSurveys() {
    setMsg(null);
    startTransition(async () => {
      const res = await ensureDefaultSurveys(unitId);
      setMsg(res.ok ? '既定テンプレで 事前/事後 を作りました。' : 'エラーが起きました。');
    });
  }

  async function addStanceFn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addStance(fd);
      (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>⚙️ 単元の公開状態</CardTitle>
        <div className="mt-3 flex gap-2">
          {(['draft', 'active', 'closed'] as const).map((s) => (
            <Button
              key={s}
              type="button"
              variant={currentStatus === s ? 'primary' : 'ghost'}
              onClick={() => changeStatus(s)}
              disabled={pending || currentStatus === s}
            >
              {s === 'draft' ? '下書き' : s === 'active' ? '公開中' : '終了'}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-kid-ink/60">
          「公開中」にすると、児童のホームに 表示されます。
        </p>
      </Card>

      <Card>
        <CardTitle>🗓️ 時数と AI 挿入タイミング</CardTitle>
        <ul className="mt-3 divide-y divide-kid-ink/5">
          {hours.map((h) => (
            <li key={h.id} className="flex items-center gap-3 py-2">
              <span className="w-12 text-center font-mono text-xs text-kid-ink/60">
                h{h.hourIndex}
              </span>
              <span className="flex-1 text-sm">{h.topic}</span>
              <select
                value={h.aiInsertion}
                onChange={(e) =>
                  changeAI(h.id, e.target.value as Hour['aiInsertion'])
                }
                className="rounded-xl border-2 border-kid-ink/10 bg-white px-2 py-1 text-xs focus:border-kid-primary"
              >
                {AI_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-kid-ink/60">
          💡 推奨: before-self を 1 回、after-self を 1 回、ask-missing を 1〜2 回 配置
        </p>
      </Card>

      <Card>
        <CardTitle>🎭 立場(初期提示)</CardTitle>
        <ul className="mt-3 space-y-2 text-sm">
          {stances.map((s) => (
            <li key={s.id} className="rounded-xl bg-kid-soft p-2">
              <span className="mr-2">{s.icon}</span>
              <strong>{s.label}</strong>:
              <span className="ml-2 text-kid-ink/70">{s.summary}</span>
            </li>
          ))}
        </ul>
        <form onSubmit={addStanceFn} className="mt-4 space-y-3">
          <input type="hidden" name="unitId" value={unitId} />
          <div className="grid gap-3 sm:grid-cols-[80px_1fr]">
            <div>
              <Label>絵文字</Label>
              <Input name="icon" maxLength={4} placeholder="🐟" />
            </div>
            <div>
              <Label>立場のラベル</Label>
              <Input name="label" required maxLength={60} />
            </div>
          </div>
          <div>
            <Label>立場の要約(1〜2行)</Label>
            <Textarea name="summary" rows={2} maxLength={300} />
          </div>
          <Button type="submit" variant="ghost" disabled={pending}>
            立場を追加
          </Button>
        </form>
        <p className="mt-2 text-xs text-kid-ink/60">
          💡 非人間(動物・川・将来世代)を 1〜2 個含めると、
          「出てこないのはだれ?」の気づきが起こりやすくなります。
        </p>
      </Card>

      <Card>
        <CardTitle>📋 事前/事後 アンケート</CardTitle>
        <p className="mt-1 text-sm text-kid-ink/70">
          既定テンプレ(測定の 3 軸を含む)で pre/post を作成します。
          作成後、この単元の状態を「公開中」にすると 児童が回答できます。
        </p>
        <div className="mt-3 flex gap-3 text-sm">
          <span
            className={`rounded-full px-3 py-1 ${
              hasPre ? 'bg-green-100 text-green-700' : 'bg-kid-soft text-kid-ink/60'
            }`}
          >
            事前: {hasPre ? '作成済み' : '未作成'}
          </span>
          <span
            className={`rounded-full px-3 py-1 ${
              hasPost ? 'bg-green-100 text-green-700' : 'bg-kid-soft text-kid-ink/60'
            }`}
          >
            事後: {hasPost ? '作成済み' : '未作成'}
          </span>
        </div>
        {(!hasPre || !hasPost) && (
          <Button
            type="button"
            className="mt-3"
            onClick={makeSurveys}
            disabled={pending}
          >
            ✨ 既定テンプレで 作成
          </Button>
        )}
        {msg && (
          <p className="mt-2 rounded-xl bg-green-50 p-2 text-xs text-green-700">
            {msg}
          </p>
        )}
      </Card>
    </div>
  );
}
