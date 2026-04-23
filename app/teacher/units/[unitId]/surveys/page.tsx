import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentTeacher } from '@/lib/context/teacher';
import { getUnitForTeacher } from '@/lib/queries/unit';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle } from '@/components/ui/Card';
import type { DefaultSurvey } from '@/lib/research/default-surveys';

export default async function TeacherSurveysPage({
  params,
}: {
  params: { unitId: string };
}) {
  const { current: user } = await getCurrentTeacher();
  if (!user) return null;
  const unit = await getUnitForTeacher(params.unitId, user.id);
  if (!unit) notFound();

  const instruments = await prisma.surveyInstrument.findMany({
    where: { unitId: unit.id },
    orderBy: { kind: 'asc' },
    include: { responses: true },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-kid-ink/60">📋 単元: {unit.title}</p>
            <CardTitle className="mt-1">事前/事後 アンケート結果</CardTitle>
          </div>
          <Link
            href={`/teacher/units/${unit.id}`}
            className="rounded-full bg-kid-soft px-3 py-1 text-xs hover:bg-kid-primary/20"
          >
            ← 単元に戻る
          </Link>
        </div>
      </Card>

      {instruments.length === 0 && (
        <Card className="mt-4">
          <p className="text-sm text-kid-ink/70">
            まだ アンケートが 作成されていません。単元ページで「既定テンプレで作成」を 押してください。
          </p>
        </Card>
      )}

      {instruments.map((inst) => {
        const template = JSON.parse(inst.questions) as DefaultSurvey;
        return (
          <section key={inst.id} className="mt-4">
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {inst.kind === 'pre' ? '🟢 事前' : '🔵 事後'}:{' '}
                  {template.title}
                </h3>
                <span className="rounded-full bg-kid-soft px-2 py-0.5 text-xs">
                  回答 {inst.responses.length}
                </span>
              </div>
              <ul className="mt-3 space-y-3 text-sm">
                {template.questions.map((q) => {
                  const values = inst.responses
                    .map((r) => {
                      const a = JSON.parse(r.answers) as Record<string, unknown>;
                      return a[q.id];
                    })
                    .filter((v) => v !== undefined && v !== '');
                  if (q.kind === 'likert-5') {
                    const nums = values.filter(
                      (v): v is number => typeof v === 'number',
                    );
                    const avg =
                      nums.length > 0
                        ? nums.reduce((a, b) => a + b, 0) / nums.length
                        : null;
                    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                    for (const n of nums) if (dist[n] !== undefined) dist[n]! += 1;
                    return (
                      <li key={q.id} className="rounded-xl bg-kid-soft p-3">
                        <p className="font-medium">{q.questionJa}</p>
                        <p className="mt-1 text-xs text-kid-ink/60">
                          平均 {avg?.toFixed(2) ?? '—'} / N={nums.length}
                        </p>
                        <div className="mt-1 flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <div
                              key={n}
                              className="flex flex-1 flex-col items-center"
                            >
                              <div
                                className="w-full rounded bg-kid-primary/70"
                                style={{
                                  height: `${Math.max(
                                    2,
                                    (dist[n]! / Math.max(1, nums.length)) * 40,
                                  )}px`,
                                }}
                              />
                              <span className="text-[10px] text-kid-ink/50">
                                {n}:{dist[n]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </li>
                    );
                  }
                  if (q.kind === 'single-choice') {
                    const counts = new Map<string, number>();
                    for (const v of values) {
                      const s = typeof v === 'string' ? v : '';
                      counts.set(s, (counts.get(s) ?? 0) + 1);
                    }
                    return (
                      <li key={q.id} className="rounded-xl bg-kid-soft p-3">
                        <p className="font-medium">{q.questionJa}</p>
                        <ul className="mt-1 space-y-1 text-xs">
                          {q.choices?.map((c) => (
                            <li
                              key={c.id}
                              className="flex items-center justify-between"
                            >
                              <span>{c.labelJa}</span>
                              <span className="text-kid-ink/60">
                                {counts.get(c.id) ?? 0}人
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  }
                  // text: 列挙
                  return (
                    <li key={q.id} className="rounded-xl bg-white p-3 ring-1 ring-kid-ink/5">
                      <p className="font-medium">{q.questionJa}</p>
                      <ul className="mt-1 space-y-1 text-xs text-kid-ink/80">
                        {values.length === 0 && (
                          <li className="text-kid-ink/40">まだ 回答が ありません</li>
                        )}
                        {values.map((v, i) => (
                          <li key={i}>・{String(v)}</li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        );
      })}

      <p className="mt-6 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
        ⚠️ 読み方の注意:N が 小さい 段階では 分布の ばらつきが 大きい可能性が あります。
        エピソード記述(児童個人の 具体的な変化)と あわせて 解釈してください。
      </p>
    </main>
  );
}
