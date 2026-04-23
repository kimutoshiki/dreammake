import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentTeacher } from '@/lib/context/teacher';
import { Card, CardTitle } from '@/components/ui/Card';

export default async function TeacherHome() {
  const { current: user } = await getCurrentTeacher();
  if (!user) return null;

  const memberships = await prisma.classMembership.findMany({
    where: { userId: user.id, role: 'teacher' },
    include: {
      class: {
        include: {
          units: { orderBy: { updatedAt: 'desc' } },
          _count: { select: { memberships: true } },
        },
      },
    },
  });

  const recentIncidents = await prisma.incidentReport.findMany({
    where: { severity: { in: ['alert', 'warn'] } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h2 className="text-2xl font-bold">こんにちは、{user.nickname ?? '先生'}さん</h2>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {memberships.map((m) => (
          <Card key={m.id}>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{m.class.name}</CardTitle>
                <p className="mt-1 text-xs text-kid-ink/60">
                  児童 {m.class._count.memberships - 1}人 / 単元 {m.class.units.length}
                </p>
              </div>
              <Link
                href={`/teacher/classes/${m.class.id}`}
                className="rounded-full bg-kid-soft px-3 py-1 text-xs hover:bg-kid-primary/20"
                title="クラス設定・Google スプレッドシート連携"
              >
                ⚙️ 設定
              </Link>
            </div>
            <ul className="mt-3 space-y-2">
              {m.class.units.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/teacher/units/${u.id}`}
                    className="block rounded-xl bg-kid-soft p-3 text-sm hover:bg-kid-primary/10"
                  >
                    <span className="font-medium">{u.title}</span>
                    <span className="ml-2 text-xs text-kid-ink/60">
                      {u.status}
                    </span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={`/teacher/units/new?classId=${m.class.id}`}
                  className="block rounded-xl border-2 border-dashed border-kid-ink/20 p-3 text-sm text-kid-ink/60 hover:border-kid-primary"
                >
                  ➕ 新しい単元を作る
                </Link>
              </li>
              <li>
                <Link
                  href={`/teacher/classes/${m.class.id}/works`}
                  className="block rounded-xl border-2 border-dashed border-kid-ink/20 p-3 text-sm text-kid-ink/60 hover:border-kid-primary"
                >
                  🗂️ クラスの作品を 見る
                </Link>
              </li>
            </ul>
          </Card>
        ))}
      </section>

      <section className="mt-8">
        <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
          🚨 気になる通知
        </h3>
        <Card>
          {recentIncidents.length === 0 ? (
            <p className="text-sm text-kid-ink/60">最近は ありません</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentIncidents.map((i) => (
                <li
                  key={i.id}
                  className={`rounded-xl p-3 ${
                    i.severity === 'alert' ? 'bg-red-50' : 'bg-amber-50'
                  }`}
                >
                  <strong>[{i.severity}]</strong> {i.kind}:{' '}
                  <span className="text-kid-ink/80">{i.summary}</span>
                  <div className="text-xs text-kid-ink/50">
                    {new Date(i.createdAt).toLocaleString('ja-JP')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </main>
  );
}
