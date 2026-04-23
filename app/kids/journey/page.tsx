import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { Card, CardTitle } from '@/components/ui/Card';

const ART_KIND_LABEL: Record<string, string> = {
  photo: '📷 しゃしん',
  video: '🎥 どうが',
  audio: '🎙️ ろくおん',
  drawing: '🎨 おえかき',
  image: '🖼️ AI絵',
  quiz: '🧩 クイズ',
  music: '🎵 おんがく',
  'mini-app': '🧰 アプリ',
};

type Range = 'week' | 'month' | 'all';

function sinceFor(range: Range): Date | null {
  const d = new Date();
  if (range === 'week') {
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (range === 'month') {
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  return null;
}

export default async function JourneyPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const { current } = await getCurrentKid();
  if (!current) return null;

  const rangeParam = searchParams.range;
  const range: Range =
    rangeParam === 'month' ? 'month' : rangeParam === 'all' ? 'all' : 'week';

  const since = sinceFor(range);
  const dateFilter = since ? { gte: since } : undefined;

  const [artworks, fieldNotes, bots] = await Promise.all([
    prisma.artwork.findMany({
      where: { ownerId: current.id, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.fieldNote.findMany({
      where: { userId: current.id, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.bot.findMany({
      where: { ownerId: current.id, ...(dateFilter ? { updatedAt: dateFilter } : {}) },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { knowledgeCards: true } } },
    }),
  ]);

  const artworkCounts: Record<string, number> = {};
  for (const a of artworks) {
    artworkCounts[a.kind] = (artworkCounts[a.kind] ?? 0) + 1;
  }

  const rangeLabel =
    range === 'week' ? 'この 1 週間' : range === 'month' ? 'この 1 ヶ月' : 'ぜんぶ';

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🗓️ わたしの あゆみ</p>
        <CardTitle className="mt-1">
          {current.nickname}さんの {rangeLabel}
        </CardTitle>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <RangeChip current={range} target="week" label="1 週間" />
          <RangeChip current={range} target="month" label="1 ヶ月" />
          <RangeChip current={range} target="all" label="ぜんぶ" />
        </div>
      </Card>

      <section className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="🎨 さくひん" value={artworks.length} />
        <Stat label="📒 ノート" value={fieldNotes.length} />
        <Stat label="🤖 ボット" value={bots.length} />
      </section>

      {Object.keys(artworkCounts).length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
            🎨 さくひんの うちわけ
          </h3>
          <Card>
            <div className="flex flex-wrap gap-2">
              {Object.entries(artworkCounts).map(([k, n]) => (
                <span key={k} className="rounded-full bg-kid-soft px-3 py-1 text-sm">
                  {ART_KIND_LABEL[k] ?? k} × {n}
                </span>
              ))}
            </div>
          </Card>
        </section>
      )}

      {artworks.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
            🖼️ さいきんの さくひん
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {artworks.slice(0, 8).map((a) => (
              <Card key={a.id} className="!p-2 text-center">
                {a.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={a.imageUrl}
                    alt=""
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-kid-soft text-3xl">
                    {a.videoUrl ? '🎥' : a.audioUrl ? '🎙️' : a.kind === 'quiz' ? '🧩' : '🎨'}
                  </div>
                )}
                <p className="mt-1 truncate text-xs">{a.title}</p>
              </Card>
            ))}
          </div>
          <Link
            href="/kids/gallery"
            className="mt-3 inline-block text-xs text-kid-primary underline"
          >
            マイさくひんで ぜんぶ 見る →
          </Link>
        </section>
      )}

      {fieldNotes.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
            📒 記録ノート
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {fieldNotes.slice(0, 6).map((n) => (
              <Link key={n.id} href={`/kids/notebook/${n.id}`} className="block">
                <Card className="hover:shadow-md">
                  <p className="text-sm font-medium">📒 {n.title}</p>
                  <p className="mt-1 text-xs text-kid-ink/60">
                    {new Date(n.createdAt).toLocaleDateString('ja-JP')}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {bots.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">🤖 マイボット</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {bots.map((b) => (
              <Link key={b.id} href={`/kids/bots/${b.id}`} className="block">
                <Card className="hover:shadow-md">
                  <p className="text-sm font-medium">🤖 {b.name}</p>
                  <p className="mt-1 text-xs text-kid-ink/60">
                    ナレッジカード {b._count.knowledgeCards}枚
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function RangeChip({
  current,
  target,
  label,
}: {
  current: Range;
  target: Range;
  label: string;
}) {
  return (
    <Link
      href={`/kids/journey?range=${target}`}
      className={`rounded-full px-3 py-1 text-xs ${
        current === target
          ? 'bg-kid-primary text-white'
          : 'bg-kid-soft text-kid-ink/80 hover:bg-kid-primary/20'
      }`}
    >
      {label}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-kid-ink/5">
      <p className="text-xs text-kid-ink/60">{label}</p>
      <p className="mt-1 text-2xl font-bold text-kid-primary">{value}</p>
    </div>
  );
}
