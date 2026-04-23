import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentKid } from '@/lib/context/kid';
import { getUnitForStudent } from '@/lib/queries/unit';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle } from '@/components/ui/Card';

/**
 * 単元まとめビュー。
 * LLM を呼ばず、DB だけで「この単元で何が起きたか」を視覚化する。
 * - 立場の分布(バー + 少数派ハイライト)
 * - 立ち止まりの言葉ランキング
 * - 「声が聞こえていないのはだれ?」で出た候補の一覧(クラス内共有ぶん)
 * - これまでの AI 呼び出し回数
 */
export default async function UnitSummaryPage({
  params,
}: {
  params: { unitId: string };
}) {
  const { current: user } = await getCurrentKid();
  if (!user) return null;
  const unit = await getUnitForStudent(params.unitId, user.id);
  if (!unit) notFound();

  // 立場分布
  const snapshots = await prisma.stanceSnapshot.findMany({
    where: { unitId: unit.id },
    orderBy: { createdAt: 'desc' },
    include: { stance: true },
  });
  const latestByUser = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) if (!latestByUser.has(s.userId)) latestByUser.set(s.userId, s);
  const dist = new Map<string, number>();
  for (const [, s] of latestByUser) {
    const label = s.stance?.label ?? s.customLabel ?? '(ひみつ)';
    dist.set(label, (dist.get(label) ?? 0) + 1);
  }
  const sortedDist = [...dist.entries()].sort((a, b) => b[1] - a[1]);
  const totalVoters = latestByUser.size;

  // 立ち止まりの言葉
  const reflections = await prisma.reflectionEntry.findMany({
    where: { unitId: unit.id },
  });
  const wordCount = new Map<string, number>();
  for (const r of reflections) {
    const marks = JSON.parse(r.standstillWords || '[]') as Array<{ term: string }>;
    for (const m of marks) {
      wordCount.set(m.term, (wordCount.get(m.term) ?? 0) + 1);
    }
  }
  const topWords = [...wordCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const totalStandstills = [...wordCount.values()].reduce((a, b) => a + b, 0);

  // 声の仮説(クラスに共有されているもの)
  const sharedHypotheses = await prisma.missingVoiceHypothesis.findMany({
    where: { unitId: unit.id, shared: true },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  // AI 呼び出しの回数(単元に関するもの大まかに)
  const llmCalls = await prisma.auditLog.count({
    where: {
      action: 'llm-call',
      OR: [
        { target: { contains: `Unit:${unit.id}` } },
        // Bot 経由は直接 unit を含まないので、簡易集計のみ
      ],
    },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">📊 単元のまとめ</p>
        <CardTitle className="mt-1">{unit.title}</CardTitle>
        <p className="mt-2 text-sm">🎯 {unit.themeQuestion}</p>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat label="立場を きろくした人" value={totalVoters} suffix="人" />
        <Stat label="ふりかえり" value={reflections.length} />
        <Stat label="立ち止まりの言葉" value={totalStandstills} suffix="回" />
        <Stat label="声の仮説(共有)" value={sharedHypotheses.length} />
      </div>

      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
          🗺️ 立場の 分布(最新)
        </h3>
        <Card>
          {sortedDist.length === 0 ? (
            <p className="text-sm text-kid-ink/70">まだ きろくが ないよ。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {sortedDist.map(([label, count], i) => {
                const isMax = i === 0;
                const isMin = count === sortedDist[sortedDist.length - 1]![1] && i !== 0;
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className={`flex-1 ${
                        isMin ? 'font-semibold text-kid-primary' : ''
                      }`}
                    >
                      {isMin && '🌱 '}
                      {label}
                      {isMax && (
                        <span className="ml-1 rounded-full bg-kid-soft px-2 py-0.5 text-[10px]">
                          多数
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-kid-ink/60">{count}人</span>
                    <div className="h-2 w-40 overflow-hidden rounded-full bg-kid-soft">
                      <div
                        className={`h-full rounded-full ${
                          isMin ? 'bg-kid-leaf' : 'bg-kid-primary'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (count / Math.max(1, totalVoters)) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
          ✨ 立ち止まれた 言葉(クラス全体)
        </h3>
        <Card>
          {topWords.length === 0 ? (
            <p className="text-sm text-kid-ink/70">
              まだ 立ち止まり 語が 見つかっていないよ。ふりかえりを 書いてみよう!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topWords.map(([term, count]) => {
                const size =
                  count >= 5 ? 'text-xl' : count >= 3 ? 'text-base' : 'text-sm';
                return (
                  <span
                    key={term}
                    className={`rounded-full bg-kid-primary/10 px-3 py-1 ${size}`}
                  >
                    {term} <span className="text-xs text-kid-ink/60">×{count}</span>
                  </span>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
          🔍 まだ 聞こえていない かもしれない 声(クラスの 仮説)
        </h3>
        <Card>
          {sharedHypotheses.length === 0 ? (
            <p className="text-sm text-kid-ink/70">
              まだ 共有された 仮説が ないよ。
              <Link
                href={`/kids/units/${unit.id}/ask-missing`}
                className="ml-1 text-kid-primary underline"
              >
                「声が聞こえていないのはだれ?」で 書いてみよう →
              </Link>
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {sharedHypotheses.map((h) => (
                <li key={h.id} className="rounded-xl bg-kid-soft p-3">
                  <p>{h.hypothesisText}</p>
                  {h.evidence && (
                    <p className="mt-1 text-xs text-kid-ink/60">
                      根拠:{h.evidence}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
          🤖 単元で AI に 聞いた 回数(目安)
        </h3>
        <Card>
          <p className="text-sm">
            「声が聞こえていないのはだれ?」機能で AI を 呼んだ 回数:
            <strong className="ml-2 text-kid-primary">{llmCalls}</strong> 回
          </p>
          <p className="mt-2 text-xs text-kid-ink/60">
            ボットとの 対話の 回数は 別に 数えているよ(プライバシーのため 児童ごとの 集計は 出していない)。
          </p>
        </Card>
      </section>

      <div className="mt-8 text-center">
        <Link
          href={`/kids/units/${unit.id}`}
          className="inline-block rounded-full bg-kid-soft px-6 py-2 text-sm hover:bg-kid-primary/20"
        >
          ← 単元トップに もどる
        </Link>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-kid-ink/5">
      <p className="text-xs text-kid-ink/60">{label}</p>
      <p className="mt-1 text-2xl font-bold text-kid-primary">
        {value}
        {suffix && <span className="ml-0.5 text-sm">{suffix}</span>}
      </p>
    </div>
  );
}
