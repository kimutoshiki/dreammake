import { notFound } from 'next/navigation';
import { getCurrentKid } from '@/lib/context/kid';
import { getUnitForStudent } from '@/lib/queries/unit';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle } from '@/components/ui/Card';
import { AskMissingClient } from './AskMissingClient';

export default async function AskMissingPage({
  params,
}: {
  params: { unitId: string };
}) {
  const { current: user } = await getCurrentKid();
  if (!user) return null;
  const unit = await getUnitForStudent(params.unitId, user.id);
  if (!unit) notFound();

  const myHypotheses = await prisma.missingVoiceHypothesis.findMany({
    where: { unitId: unit.id, userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const sharedFromClass = await prisma.missingVoiceHypothesis.findMany({
    where: { unitId: unit.id, shared: true, NOT: { userId: user.id } },
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: {
      unit: { select: { title: true } },
    },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🔍 単元: {unit.title}</p>
        <CardTitle className="mt-1">
          声が 聞こえていないのは だれ?
        </CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          AI に聞いてみた 応答を ふりかえって、
          「ここには 出てこなかった こえ」を いっしょに 考えよう。
        </p>
      </Card>

      <div className="mt-4">
        <AskMissingClient
          unitId={unit.id}
          themeQuestion={unit.themeQuestion}
        />
      </div>

      {myHypotheses.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
            🌱 これまで じぶんが 書いた 仮説
          </h3>
          <div className="space-y-2">
            {myHypotheses.map((h) => (
              <Card key={h.id}>
                <p className="text-sm">{h.hypothesisText}</p>
                {h.evidence && (
                  <p className="mt-1 text-xs text-kid-ink/60">根拠: {h.evidence}</p>
                )}
                <p className="mt-1 text-[11px] text-kid-ink/50">
                  {h.shared ? '🌐 クラスに共有ずみ' : '🔒 じぶんだけ'}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {sharedFromClass.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
            🌐 クラスの 仮説
          </h3>
          <div className="space-y-2">
            {sharedFromClass.map((h) => (
              <Card key={h.id}>
                <p className="text-sm">{h.hypothesisText}</p>
                {h.evidence && (
                  <p className="mt-1 text-xs text-kid-ink/60">根拠: {h.evidence}</p>
                )}
                <p className="mt-1 text-[11px] text-kid-ink/50">
                  ── だれかの しつもんより
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
