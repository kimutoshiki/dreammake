import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentTeacher } from '@/lib/context/teacher';
import { Card, CardTitle } from '@/components/ui/Card';
import { getFeedbackForFieldNotes } from '@/lib/queries/feedback';
import { TeacherFeedbackStampRow } from '@/components/FeedbackStampRow';

export default async function TeacherClassNotebookPage({
  params,
  searchParams,
}: {
  params: { classId: string };
  searchParams: { unitId?: string; student?: string };
}) {
  const { current: teacher } = await getCurrentTeacher();
  if (!teacher) return null;

  const cls = await prisma.class.findFirst({
    where: {
      id: params.classId,
      memberships: { some: { userId: teacher.id, role: 'teacher' } },
    },
    include: {
      memberships: {
        where: { role: 'student' },
        include: {
          user: { select: { id: true, nickname: true, handle: true } },
        },
      },
      units: { select: { id: true, title: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!cls) notFound();

  const studentIds = cls.memberships.map((m) => m.user.id);
  const kidMap = new Map(
    cls.memberships.map((m) => [m.user.id, m.user.nickname ?? m.user.handle ?? '?']),
  );
  const unitIds = cls.units.map((u) => u.id);

  const filterUnitId = searchParams.unitId;
  const filterStudent = searchParams.student;

  const notes = await prisma.fieldNote.findMany({
    where: {
      userId: filterStudent ? filterStudent : { in: studentIds },
      ...(filterUnitId
        ? { unitId: filterUnitId }
        : { OR: [{ unitId: { in: unitIds } }, { unitId: null }] }),
    },
    orderBy: { createdAt: 'desc' },
    include: { unit: { select: { title: true } } },
    take: 200,
  });

  const feedbackMap = await getFeedbackForFieldNotes(
    notes.map((n) => n.id),
    teacher.id,
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-kid-ink/60">📒 クラスの記録ノート</p>
            <CardTitle className="mt-1">{cls.name}</CardTitle>
            <p className="mt-1 text-xs text-kid-ink/60">
              児童 {cls.memberships.length}人 / 直近 {notes.length} 件
            </p>
          </div>
          <Link
            href={`/teacher/classes/${cls.id}`}
            className="rounded-full bg-kid-soft px-3 py-1 text-xs hover:bg-kid-primary/20"
          >
            ← クラス設定へ
          </Link>
        </div>
      </Card>

      <section className="mt-4">
        <Card>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-kid-ink/60">単元:</span>
            <FilterChip
              href={`/teacher/classes/${cls.id}/notebook${filterStudent ? `?student=${filterStudent}` : ''}`}
              active={!filterUnitId}
              label="ぜんぶ"
            />
            {cls.units.map((u) => (
              <FilterChip
                key={u.id}
                href={`/teacher/classes/${cls.id}/notebook?unitId=${u.id}${filterStudent ? `&student=${filterStudent}` : ''}`}
                active={filterUnitId === u.id}
                label={u.title}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-kid-ink/60">児童:</span>
            <FilterChip
              href={`/teacher/classes/${cls.id}/notebook${filterUnitId ? `?unitId=${filterUnitId}` : ''}`}
              active={!filterStudent}
              label="ぜんいん"
            />
            {cls.memberships.map((m) => (
              <FilterChip
                key={m.user.id}
                href={`/teacher/classes/${cls.id}/notebook?student=${m.user.id}${filterUnitId ? `&unitId=${filterUnitId}` : ''}`}
                active={filterStudent === m.user.id}
                label={m.user.nickname ?? '?'}
              />
            ))}
          </div>
        </Card>
      </section>

      {notes.length === 0 ? (
        <Card className="mt-4">
          <p className="text-sm text-kid-ink/70">
            該当する 記録ノートは まだ ありません。
          </p>
        </Card>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {notes.map((n) => {
            const fb = feedbackMap.get(n.id) ?? {
              countByStamp: {},
              myStampIds: [],
            };
            return (
              <Card key={n.id}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">📒 {n.title}</p>
                  {n.docsUrl && (
                    <a
                      href={n.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-kid-accent/10 px-2 py-0.5 text-[11px] text-kid-accent hover:bg-kid-accent/20"
                    >
                      📄 Docs
                    </a>
                  )}
                </div>
                <p className="mt-1 text-xs text-kid-ink/60">
                  {kidMap.get(n.userId) ?? '?'}
                  {n.unit && <> · 単元: {n.unit.title}</>}
                  {n.locationNote && <> · 📍 {n.locationNote}</>}
                </p>
                {n.notes && (
                  <p className="mt-2 line-clamp-3 text-sm">{n.notes}</p>
                )}
                <p className="mt-2 text-[11px] text-kid-ink/50">
                  {new Date(n.createdAt).toLocaleString('ja-JP')}
                </p>
                <div className="mt-3 border-t border-kid-ink/5 pt-2">
                  <TeacherFeedbackStampRow
                    target={{ fieldNoteId: n.id }}
                    myStampIds={fb.myStampIds}
                    allCountByStamp={fb.countByStamp}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs ${
        active
          ? 'bg-kid-primary text-white'
          : 'bg-kid-soft text-kid-ink/80 hover:bg-kid-primary/20'
      }`}
    >
      {label}
    </Link>
  );
}
