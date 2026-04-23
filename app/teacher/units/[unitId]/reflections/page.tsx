import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentTeacher } from '@/lib/context/teacher';
import { getUnitForTeacher } from '@/lib/queries/unit';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle } from '@/components/ui/Card';
import { HighlightedText } from '@/components/HighlightedText';

export default async function TeacherReflectionsPage({
  params,
}: {
  params: { unitId: string };
}) {
  const { current: user } = await getCurrentTeacher();
  if (!user) return null;
  const unit = await getUnitForTeacher(params.unitId, user.id);
  if (!unit) notFound();

  const entries = await prisma.reflectionEntry.findMany({
    where: { unitId: unit.id },
    orderBy: { createdAt: 'desc' },
    include: { unit: { select: { title: true } } },
  });

  // ユーザー情報を別途取得(モデルに直接 relation がないため)
  const userIds = Array.from(new Set(entries.map((e) => e.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, nickname: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.nickname ?? '?']));

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-kid-ink/60">📝 単元: {unit.title}</p>
            <CardTitle className="mt-1">ふりかえり 一覧</CardTitle>
          </div>
          <Link
            href={`/teacher/units/${unit.id}`}
            className="rounded-full bg-kid-soft px-3 py-1 text-xs hover:bg-kid-primary/20"
          >
            ← 単元に戻る
          </Link>
        </div>
        <p className="mt-2 text-sm text-kid-ink/70">
          ハイライト = 立ち止まりの言葉。児童の思考が動いた場面の 手がかりとして。
        </p>
      </Card>

      <div className="mt-4 space-y-2">
        {entries.length === 0 && (
          <Card>
            <p className="text-sm text-kid-ink/70">まだ ふりかえりは ありません。</p>
          </Card>
        )}
        {entries.map((e) => {
          const marks = JSON.parse(e.standstillWords || '[]') as Array<{
            position: { start: number; end: number };
            term: string;
            category: string;
          }>;
          return (
            <Card key={e.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{userMap.get(e.userId)}</p>
                  <p className="text-xs text-kid-ink/60">
                    {e.prompt} / {new Date(e.createdAt).toLocaleString('ja-JP')}
                  </p>
                </div>
                <span className="rounded-full bg-kid-soft px-2 py-0.5 text-xs">
                  立ち止まり {e.standstillCount}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">
                <HighlightedText text={e.text} marks={marks} />
              </p>
              {marks.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {marks.map((m, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-kid-primary/10 px-2 py-0.5 text-[11px] text-kid-ink/70"
                    >
                      {m.term} · {m.category}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
