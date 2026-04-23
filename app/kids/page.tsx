import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { Card, CardTitle } from '@/components/ui/Card';

export default async function KidsHomePage() {
  const { current } = await getCurrentKid();
  if (!current) return null;

  const memberships = await prisma.classMembership.findMany({
    where: { userId: current.id, role: 'student' },
    include: {
      class: {
        include: {
          units: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  const myBots = await prisma.bot.findMany({
    where: { ownerId: current.id },
    include: { _count: { select: { knowledgeCards: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h2 className="text-2xl font-bold">
        こんにちは、{current.nickname}さん 👋
      </h2>

      <section className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-kid-ink/70">
          📘 いまの 単元
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {memberships.flatMap((m) =>
            m.class.units.map((u) => (
              <Link
                key={u.id}
                href={`/kids/units/${u.id}`}
                className="block"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <div className="text-xs text-kid-ink/60">{m.class.name}</div>
                  <CardTitle className="mt-1">{u.title}</CardTitle>
                  <p className="mt-2 text-sm text-kid-ink/80">
                    🎯 {u.themeQuestion}
                  </p>
                </Card>
              </Link>
            )),
          )}
          {memberships.every((m) => m.class.units.length === 0) && (
            <Card>
              <p className="text-sm text-kid-ink/70">
                まだ 公開されている単元が ないよ。せんせいが 単元を 公開したら ここに 出るよ。
              </p>
            </Card>
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-kid-ink/70">🤖 マイボット</h3>
          <Link
            href="/kids/bots/new"
            className="rounded-full bg-kid-soft px-4 py-1 text-sm font-medium hover:bg-kid-primary/20"
          >
            ➕ あたらしく つくる
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {myBots.length === 0 && (
            <Card>
              <p className="text-sm text-kid-ink/70">
                まだボットがないよ。「➕ あたらしく つくる」から はじめよう!
              </p>
            </Card>
          )}
          {myBots.map((b) => (
            <Link key={b.id} href={`/kids/bots/${b.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <div className="text-3xl">🤖</div>
                <CardTitle className="mt-2 text-base">{b.name}</CardTitle>
                <p className="mt-1 text-xs text-kid-ink/60">
                  ナレッジカード {b._count.knowledgeCards}枚
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
