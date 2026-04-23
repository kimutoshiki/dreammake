import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentTeacher } from '@/lib/context/teacher';
import { getUnitForTeacher } from '@/lib/queries/unit';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle } from '@/components/ui/Card';

export default async function TeacherStancesPage({
  params,
}: {
  params: { unitId: string };
}) {
  const { current: user } = await getCurrentTeacher();
  if (!user) return null;
  const unit = await getUnitForTeacher(params.unitId, user.id);
  if (!unit) notFound();

  const snapshots = await prisma.stanceSnapshot.findMany({
    where: { unitId: unit.id },
    orderBy: { createdAt: 'desc' },
    include: { stance: true, user: { select: { id: true, nickname: true } } },
  });

  // 最新ごとの集計
  const latestByUser = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    if (!latestByUser.has(s.userId)) latestByUser.set(s.userId, s);
  }
  const stats = new Map<string, number>();
  const customStats: string[] = [];
  for (const [, s] of latestByUser) {
    if (s.stance) {
      stats.set(s.stance.label, (stats.get(s.stance.label) ?? 0) + 1);
    } else if (s.customLabel) {
      customStats.push(s.customLabel);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-kid-ink/60">🗺️ 単元: {unit.title}</p>
            <CardTitle className="mt-1">立場マップ(クラス)</CardTitle>
          </div>
          <Link
            href={`/teacher/units/${unit.id}`}
            className="rounded-full bg-kid-soft px-3 py-1 text-xs hover:bg-kid-primary/20"
          >
            ← 単元に戻る
          </Link>
        </div>
      </Card>

      <section className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
          🧮 いま(最新の立場)
        </h3>
        <Card>
          <ul className="divide-y divide-kid-ink/5">
            {[...stats.entries()].map(([label, count]) => (
              <li key={label} className="flex items-center gap-3 py-2">
                <span className="flex-1 text-sm">{label}</span>
                <span className="rounded-full bg-kid-soft px-2 py-0.5 text-xs">
                  {count}人
                </span>
                <div className="ml-2 h-2 w-32 overflow-hidden rounded-full bg-kid-soft">
                  <div
                    className="h-full rounded-full bg-kid-primary"
                    style={{
                      width: `${Math.min(100, (count / Math.max(1, latestByUser.size)) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
            {stats.size === 0 && (
              <li className="py-2 text-sm text-kid-ink/60">
                まだ 記録が ありません。
              </li>
            )}
          </ul>
          {customStats.length > 0 && (
            <>
              <h4 className="mt-3 text-xs font-semibold text-kid-ink/60">
                新しく 書かれた 立場(少数でも 保持)
              </h4>
              <div className="mt-1 flex flex-wrap gap-1">
                {customStats.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-kid-primary/10 px-2 py-0.5 text-xs"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      </section>

      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
          🕰️ 時系列(全記録)
        </h3>
        <Card>
          <ul className="divide-y divide-kid-ink/5 text-sm">
            {snapshots.length === 0 && (
              <li className="py-2 text-kid-ink/60">まだ ありません。</li>
            )}
            {snapshots.map((s) => (
              <li key={s.id} className="py-2">
                <div className="flex items-center justify-between">
                  <span>
                    <strong>{s.user.nickname}</strong> →{' '}
                    {s.stance?.label ?? s.customLabel}
                  </span>
                  <span className="text-xs text-kid-ink/50">
                    {s.phase} · {new Date(s.createdAt).toLocaleString('ja-JP')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-kid-ink/70">
                  強さ:{'★'.repeat(s.strength)}
                  {'☆'.repeat(5 - s.strength)} ・ 理由:{s.reasoning}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </main>
  );
}
