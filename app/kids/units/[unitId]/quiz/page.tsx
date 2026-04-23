import { notFound } from 'next/navigation';
import { getCurrentKid } from '@/lib/context/kid';
import { getUnitForStudent } from '@/lib/queries/unit';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle } from '@/components/ui/Card';
import { StanceQuizClient } from './StanceQuizClient';

export default async function StanceQuizPage({
  params,
}: {
  params: { unitId: string };
}) {
  const { current: user } = await getCurrentKid();
  if (!user) return null;
  const unit = await getUnitForStudent(params.unitId, user.id);
  if (!unit) notFound();

  // 全員の「最新のスタンス」を集計(匿名化、ニックネーム のみ)
  const snapshots = await prisma.stanceSnapshot.findMany({
    where: { unitId: unit.id },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { nickname: true, avatarSeed: true } },
      stance: true,
    },
  });
  const latestByUser = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    if (!latestByUser.has(s.userId)) latestByUser.set(s.userId, s);
  }
  const latest = [...latestByUser.values()];
  const labelCount = new Map<string, number>();
  for (const s of latest) {
    const label = s.stance?.label ?? s.customLabel ?? '(ひみつ)';
    labelCount.set(label, (labelCount.get(label) ?? 0) + 1);
  }
  const totalVoters = latest.length;

  // 少数派さがし用データ
  const distribution = [...labelCount.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.count - b.count);
  const minority = distribution[0] ?? null;

  // クイズ問題:理由文 → 立場
  type Quiz = {
    reasoning: string;
    answerLabel: string;
    options: string[];
  };
  const uniqueLabels = [...labelCount.keys()];
  const quizzes: Quiz[] = latest
    .filter((s) => s.reasoning && s.reasoning.length >= 4)
    .slice(0, 6)
    .map((s) => {
      const answer = s.stance?.label ?? s.customLabel ?? '(ひみつ)';
      const distractors = uniqueLabels
        .filter((l) => l !== answer)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const options = [answer, ...distractors].sort(() => Math.random() - 0.5);
      return { reasoning: s.reasoning, answerLabel: answer, options };
    });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🎮 単元: {unit.title}</p>
        <CardTitle className="mt-1">立場クイズ・少数派さがし</CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          みんなの 書いた「なぜ そう思う?」から、その人の 立場を あててみよう。
          下では 少数派の 声も 大切に のこしているよ。
        </p>
      </Card>

      {totalVoters === 0 ? (
        <Card className="mt-4">
          <p className="text-sm text-kid-ink/70">
            まだ 立場が きろくされていないよ。立場マップから きろくしてきてね。
          </p>
        </Card>
      ) : (
        <>
          <section className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
              🎯 これは だれの 立場?
            </h3>
            {quizzes.length === 0 ? (
              <Card>
                <p className="text-sm text-kid-ink/70">
                  クイズを 作るには もう少し たくさんの 立場の 記録が ひつようだよ。
                </p>
              </Card>
            ) : (
              <StanceQuizClient quizzes={quizzes} />
            )}
          </section>

          <section className="mt-8">
            <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
              🔎 少数派さがし
            </h3>
            <Card>
              <p className="text-sm text-kid-ink/70">
                クラスの {totalVoters} 人の 今の 立場:
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {distribution.map((d) => (
                  <li key={d.label} className="flex items-center gap-3">
                    <span
                      className={`flex-1 ${
                        minority && d.label === minority.label
                          ? 'font-semibold text-kid-primary'
                          : ''
                      }`}
                    >
                      {d.label}
                    </span>
                    <span className="rounded-full bg-kid-soft px-2 py-0.5 text-xs">
                      {d.count}人
                    </span>
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-kid-soft">
                      <div
                        className="h-full rounded-full bg-kid-primary"
                        style={{
                          width: `${Math.min(
                            100,
                            (d.count / Math.max(1, totalVoters)) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {minority && minority.count === 1 && (
                <p className="mt-4 rounded-xl bg-kid-primary/10 p-3 text-sm">
                  🌱 たった 1 人の 声が あるね:
                  <strong className="ml-1">{minority.label}</strong>
                  。少ないからこそ 大切に 聞こうね。
                </p>
              )}
            </Card>
          </section>
        </>
      )}
    </main>
  );
}
