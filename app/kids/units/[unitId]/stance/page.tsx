import { notFound } from 'next/navigation';
import { getCurrentKid } from '@/lib/context/kid';
import { getUnitForStudent } from '@/lib/queries/unit';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle } from '@/components/ui/Card';
import { StanceClient } from './StanceClient';

export default async function StancePage({
  params,
}: {
  params: { unitId: string };
}) {
  const { current: user } = await getCurrentKid();
  if (!user) return null;
  const unit = await getUnitForStudent(params.unitId, user.id);
  if (!unit) notFound();

  // クラスの立場ごとの投票者数(匿名化、ニックネームのみ)
  const snapshots = await prisma.stanceSnapshot.findMany({
    where: { unitId: unit.id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, nickname: true } } },
  });

  // 最新の立場だけ(児童ごと)
  const latestByUser = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    if (!latestByUser.has(s.userId)) latestByUser.set(s.userId, s);
  }
  const votesByStance = new Map<string, string[]>();
  const customVotes: string[] = [];
  for (const [, snap] of latestByUser) {
    if (snap.stanceId) {
      const arr = votesByStance.get(snap.stanceId) ?? [];
      arr.push(snap.user.nickname ?? '?');
      votesByStance.set(snap.stanceId, arr);
    } else if (snap.customLabel) {
      customVotes.push(`${snap.customLabel}(${snap.user.nickname ?? '?'})`);
    }
  }
  const myLatest = snapshots.find((s) => s.userId === user.id) ?? null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🗺️ 単元: {unit.title}</p>
        <CardTitle className="mt-1">立場マップ</CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          いま 自分は どの立場に 近い?
          友だちの 立場も、少ない 声も、ここに 残そう。
        </p>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {unit.stances.map((s) => {
          const voters = votesByStance.get(s.id) ?? [];
          return (
            <Card key={s.id}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{s.icon ?? '•'}</span>
                <h3 className="font-semibold">{s.label}</h3>
              </div>
              <p className="mt-1 text-sm text-kid-ink/70">{s.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {voters.length === 0 && (
                  <span className="text-xs text-kid-ink/40">まだ だれも</span>
                )}
                {voters.map((n, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-kid-soft px-2 py-0.5 text-xs"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {customVotes.length > 0 && (
        <section className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
            🌱 みんなが 書いた 新しい 立場(少数でも 大切な 声)
          </h3>
          <div className="space-y-1 text-sm">
            {customVotes.map((t, i) => (
              <p key={i} className="rounded-xl bg-white p-2 ring-1 ring-kid-ink/5">
                {t}
              </p>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8">
        <StanceClient
          unitId={unit.id}
          stances={unit.stances.map((s) => ({
            id: s.id,
            label: s.label,
            icon: s.icon ?? '',
          }))}
          myLatest={
            myLatest
              ? {
                  stanceId: myLatest.stanceId,
                  customLabel: myLatest.customLabel,
                  strength: myLatest.strength,
                }
              : null
          }
        />
      </div>
    </main>
  );
}
