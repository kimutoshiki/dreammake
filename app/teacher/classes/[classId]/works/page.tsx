import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentTeacher } from '@/lib/context/teacher';
import { Card, CardTitle } from '@/components/ui/Card';
import { getFeedbackForArtworks } from '@/lib/queries/feedback';
import { TeacherFeedbackStampRow } from '@/components/FeedbackStampRow';

const KIND_LABEL: Record<string, string> = {
  photo: '📷 しゃしん',
  video: '🎥 どうが',
  audio: '🎙️ ろくおん',
  drawing: '🎨 おえかき',
  image: '🖼️ 絵(AI)',
  infographic: '📊 まとめ',
  quiz: '🧩 クイズ',
  music: '🎵 おんがく',
  'mini-app': '🧰 アプリ',
};

const KIND_ORDER = [
  'photo',
  'video',
  'audio',
  'drawing',
  'image',
  'quiz',
  'infographic',
  'music',
  'mini-app',
];

export default async function ClassWorksPage({
  params,
  searchParams,
}: {
  params: { classId: string };
  searchParams: { kind?: string; student?: string };
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
    },
  });
  if (!cls) notFound();

  const studentIds = cls.memberships.map((m) => m.user.id);
  const kidMap = new Map(
    cls.memberships.map((m) => [m.user.id, m.user.nickname ?? m.user.handle ?? '?']),
  );

  const filterKind = searchParams.kind;
  const filterStudent = searchParams.student;

  const works = await prisma.artwork.findMany({
    where: {
      ownerId: filterStudent
        ? filterStudent
        : { in: studentIds },
      ...(filterKind ? { kind: filterKind } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const countByKind = new Map<string, number>();
  for (const w of works) {
    countByKind.set(w.kind, (countByKind.get(w.kind) ?? 0) + 1);
  }

  const feedbackMap = await getFeedbackForArtworks(
    works.map((w) => w.id),
    teacher.id,
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-kid-ink/60">🗂️ クラスの作品</p>
            <CardTitle className="mt-1">{cls.name}</CardTitle>
            <p className="mt-1 text-xs text-kid-ink/60">
              児童 {cls.memberships.length}人 / 直近 {works.length}件
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
            <span className="text-kid-ink/60">種類:</span>
            <FilterChip
              href={`/teacher/classes/${cls.id}/works${filterStudent ? `?student=${filterStudent}` : ''}`}
              active={!filterKind}
              label={`ぜんぶ(${works.length})`}
            />
            {KIND_ORDER.map((k) =>
              countByKind.get(k) ? (
                <FilterChip
                  key={k}
                  href={`/teacher/classes/${cls.id}/works?kind=${k}${filterStudent ? `&student=${filterStudent}` : ''}`}
                  active={filterKind === k}
                  label={`${KIND_LABEL[k] ?? k}(${countByKind.get(k)})`}
                />
              ) : null,
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-kid-ink/60">児童:</span>
            <FilterChip
              href={`/teacher/classes/${cls.id}/works${filterKind ? `?kind=${filterKind}` : ''}`}
              active={!filterStudent}
              label="ぜんいん"
            />
            {cls.memberships.map((m) => (
              <FilterChip
                key={m.user.id}
                href={`/teacher/classes/${cls.id}/works?student=${m.user.id}${filterKind ? `&kind=${filterKind}` : ''}`}
                active={filterStudent === m.user.id}
                label={m.user.nickname ?? '?'}
              />
            ))}
          </div>
        </Card>
      </section>

      {works.length === 0 ? (
        <Card className="mt-4">
          <p className="text-sm text-kid-ink/70">該当する作品はまだありません。</p>
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((w) => {
            const fb = feedbackMap.get(w.id) ?? {
              countByStamp: {},
              myStampIds: [],
            };
            return (
              <Card key={w.id} className="!p-3">
                <WorkView artwork={w} />
                <div className="mt-2 flex items-center justify-between">
                  <p className="truncate text-sm font-medium">{w.title}</p>
                  <span className="rounded-full bg-kid-soft px-2 py-0.5 text-[10px]">
                    {KIND_LABEL[w.kind] ?? w.kind}
                  </span>
                </div>
                <p className="text-[11px] text-kid-ink/50">
                  {kidMap.get(w.ownerId) ?? '?'} ·{' '}
                  {new Date(w.createdAt).toLocaleString('ja-JP')}
                </p>
                <div className="mt-3 border-t border-kid-ink/5 pt-2">
                  <TeacherFeedbackStampRow
                    target={{ artworkId: w.id }}
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

function WorkView({
  artwork,
}: {
  artwork: {
    kind: string;
    imageUrl: string | null;
    videoUrl: string | null;
    audioUrl: string | null;
    audioTranscript: string | null;
    quizSpec: string | null;
  };
}) {
  if (artwork.imageUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={artwork.imageUrl}
        alt=""
        className="aspect-video w-full rounded-xl object-cover"
      />
    );
  }
  if (artwork.videoUrl) {
    return (
      <video
        src={artwork.videoUrl}
        className="aspect-video w-full rounded-xl bg-black"
        controls
        playsInline
      />
    );
  }
  if (artwork.audioUrl) {
    return (
      <div>
        <audio src={artwork.audioUrl} className="w-full" controls />
        {artwork.audioTranscript && (
          <p className="mt-2 max-h-24 overflow-y-auto rounded-xl bg-kid-soft p-2 text-xs leading-relaxed">
            {artwork.audioTranscript}
          </p>
        )}
      </div>
    );
  }
  if (artwork.kind === 'quiz' && artwork.quizSpec) {
    try {
      const spec = JSON.parse(artwork.quizSpec) as {
        questions: Array<{ questionText: string }>;
      };
      return (
        <div className="rounded-xl bg-kid-soft p-3 text-sm">
          <p className="font-semibold">🧩 クイズ({spec.questions.length} もん)</p>
          <ul className="mt-2 space-y-1 text-xs text-kid-ink/70">
            {spec.questions.slice(0, 3).map((q, i) => (
              <li key={i} className="truncate">・{q.questionText}</li>
            ))}
          </ul>
        </div>
      );
    } catch {
      return <div className="text-xs text-kid-ink/60">クイズ</div>;
    }
  }
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-kid-soft text-3xl">
      🎨
    </div>
  );
}
