import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStudent } from '@/lib/auth/require';
import { getUnitForStudent } from '@/lib/queries/unit';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle } from '@/components/ui/Card';

const AI_LABEL: Record<string, { icon: string; ja: string }> = {
  none: { icon: '—', ja: 'AI は使わないよ' },
  'before-self': { icon: '🤖', ja: '考える前に AI に ひろげてもらう回' },
  'after-self': { icon: '🔁', ja: 'まとめた考えを AI と 突き合わせる回' },
  'ask-missing': { icon: '🔍', ja: '「声が聞こえていないのはだれ?」の 回' },
};

export default async function UnitTopPage({
  params,
}: {
  params: { unitId: string };
}) {
  const { user } = await requireStudent();
  const unit = await getUnitForStudent(params.unitId, user.id);
  if (!unit) notFound();

  const standstillTotal = await prisma.reflectionEntry
    .aggregate({
      where: { unitId: unit.id, userId: user.id },
      _sum: { standstillCount: true },
    })
    .then((r) => r._sum.standstillCount ?? 0);

  const preSurvey = unit.surveys.find((s) => s.kind === 'pre');
  const postSurvey = unit.surveys.find((s) => s.kind === 'post');

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">📘 単元</p>
        <CardTitle className="mt-1">{unit.title}</CardTitle>
        <p className="mt-3 text-base">
          🎯 <strong>ちゅうしんの問い:</strong> {unit.themeQuestion}
        </p>
      </Card>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <ActionLink
          href={`/kids/units/${unit.id}/stance`}
          icon="🗺️"
          title="立場マップ"
          desc="自分は どこの 立場に 近いかな?"
        />
        <ActionLink
          href={`/kids/units/${unit.id}/ask-missing`}
          icon="🔍"
          title="声が聞こえていないのは だれ?"
          desc="AI の応答を みなおして、出てきていない声を さがそう"
          highlight
        />
        <ActionLink
          href={`/kids/units/${unit.id}/reflect`}
          icon="✍️"
          title="ふりかえりを 書く"
          desc={`これまで ${standstillTotal}回 立ち止まれているよ`}
        />
        {preSurvey && (
          <ActionLink
            href={`/kids/units/${unit.id}/survey/pre`}
            icon="📋"
            title="事前 アンケート"
            desc="単元の はじめに こたえるよ"
          />
        )}
        {postSurvey && (
          <ActionLink
            href={`/kids/units/${unit.id}/survey/post`}
            icon="📋"
            title="事後 アンケート"
            desc="単元が 終わったら こたえるよ"
          />
        )}
      </div>

      <section className="mt-8">
        <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
          🤖 この単元で つかえるボット
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {unit.bots.map((ub) => (
            <Link
              key={ub.bot.id}
              href={`/kids/bots/${ub.bot.id}`}
              className="block"
            >
              <Card className="transition-shadow hover:shadow-md">
                <div className="text-3xl">🤖</div>
                <CardTitle className="mt-2 text-base">{ub.bot.name}</CardTitle>
                <p className="mt-1 text-xs text-kid-ink/60">
                  {ub.bot.owner.nickname} さんが 作ったボット
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
          🗓️ 時数のプラン
        </h3>
        <Card>
          <ul className="divide-y divide-kid-ink/5 text-sm">
            {unit.hours.map((h) => {
              const ai = AI_LABEL[h.aiInsertion] ?? AI_LABEL.none!;
              return (
                <li key={h.id} className="flex items-center gap-3 py-2">
                  <span className="w-10 text-center font-mono text-xs text-kid-ink/60">
                    h{h.hourIndex}
                  </span>
                  <span className="flex-1">{h.topic}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      h.aiInsertion === 'ask-missing'
                        ? 'bg-kid-primary/20 text-kid-primary'
                        : h.aiInsertion === 'none'
                          ? 'text-kid-ink/40'
                          : 'bg-kid-soft'
                    }`}
                    title={ai.ja}
                  >
                    {ai.icon} {h.aiInsertion}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>
    </main>
  );
}

function ActionLink({
  href,
  icon,
  title,
  desc,
  highlight,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Card
        className={`transition-shadow hover:shadow-md ${
          highlight ? 'ring-2 ring-kid-primary' : ''
        }`}
      >
        <div className="text-3xl">{icon}</div>
        <CardTitle className="mt-2 text-base">{title}</CardTitle>
        <p className="mt-1 text-sm text-kid-ink/70">{desc}</p>
      </Card>
    </Link>
  );
}
