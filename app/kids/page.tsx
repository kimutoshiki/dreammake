import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { Card, CardTitle } from '@/components/ui/Card';

type Tile = {
  href: string;
  icon: string;
  title: string;
  desc: string;
  needsNet?: boolean;
  disabled?: boolean;
};

const CREATIVE_APPS: Tile[] = [
  { href: '/kids/create/photo', icon: '📷', title: 'しゃしん', desc: 'カメラで しゃしんを とる' },
  { href: '/kids/create/video', icon: '🎥', title: 'どうが', desc: 'カメラで どうがを とる' },
  {
    href: '/kids/create/audio',
    icon: '🎙️',
    title: 'ろくおん + もじおこし',
    desc: '声を ろくおんして 文字に する',
  },
  {
    href: '/kids/create/image',
    icon: '🖼️',
    title: 'AI に 絵を かいてもらう',
    desc: 'ことばで つたえると 絵に してくれる',
    needsNet: true,
  },
  { href: '/kids/create/draw', icon: '🎨', title: 'おえかき', desc: '指や Apple Pencil で かく' },
  {
    href: '/kids/create/quiz',
    icon: '🧩',
    title: 'クイズを つくる',
    desc: 'もんだいと こたえを ならべる',
  },
  {
    href: '/kids/create/music',
    icon: '🎵',
    title: 'おんがくを つくる',
    desc: 'ドラムと メロディで 2 小節',
  },
  {
    href: '/kids/notebook',
    icon: '📒',
    title: '記録ノート',
    desc: '写真・録音・絵・ことばを 1 枚に まとめる',
  },
  {
    href: '/kids/journey',
    icon: '🗓️',
    title: 'わたしの あゆみ',
    desc: 'これまでに つくったものを ふりかえる',
  },
  {
    href: '/kids/create/game',
    icon: '🎮',
    title: 'ゲームを つくる',
    desc: 'もうすこしで 使えるよ',
    disabled: true,
  },
  {
    href: '/kids/gallery',
    icon: '🗂️',
    title: 'マイさくひん',
    desc: 'これまで 作ったもの ぜんぶ',
  },
];

export default async function KidsHomePage() {
  const { current } = await getCurrentKid();
  if (!current) return null;

  const myBots = await prisma.bot.findMany({
    where: { ownerId: current.id },
    include: { _count: { select: { knowledgeCards: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 6,
  });

  const recentArtworks = await prisma.artwork.findMany({
    where: { ownerId: current.id },
    orderBy: { createdAt: 'desc' },
    take: 4,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h2 className="text-2xl font-bold">こんにちは、{current.nickname}さん 👋</h2>
      <p className="mt-1 text-sm text-kid-ink/70">
        きょうは なにを つくる?下から えらんで はじめよう。
      </p>

      <section className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-kid-ink/70">🛠️ つくる・あそぶ</h3>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CREATIVE_APPS.map((app) => {
            const body = (
              <Card
                className={`relative h-full transition-shadow ${
                  app.disabled ? 'cursor-not-allowed opacity-50' : 'hover:shadow-md'
                }`}
              >
                {app.needsNet && (
                  <span
                    className="absolute right-3 top-3 rounded-full bg-kid-accent/10 px-2 py-0.5 text-[10px] text-kid-accent"
                    title="インターネットが 必要だよ"
                  >
                    Wi-Fi
                  </span>
                )}
                <div className="text-4xl">{app.icon}</div>
                <CardTitle className="mt-2 text-base">{app.title}</CardTitle>
                <p className="mt-1 text-xs text-kid-ink/70">{app.desc}</p>
              </Card>
            );
            return app.disabled ? (
              <div key={app.href}>{body}</div>
            ) : (
              <Link key={app.href} href={app.href} className="block">
                {body}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-kid-ink/70">
            🤖 マイボット
            <span className="ml-2 rounded-full bg-kid-accent/10 px-2 py-0.5 text-[10px] text-kid-accent">
              Wi-Fi
            </span>
          </h3>
          <Link
            href="/kids/bots/new"
            className="rounded-full bg-kid-soft px-4 py-1 text-sm font-medium hover:bg-kid-primary/20"
          >
            ➕ あたらしく つくる
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {myBots.length === 0 ? (
            <Card>
              <p className="text-sm text-kid-ink/70">
                まだ ボットが ないよ。「➕ あたらしく つくる」から はじめよう!
              </p>
            </Card>
          ) : (
            myBots.map((b) => (
              <Link key={b.id} href={`/kids/bots/${b.id}`} className="block">
                <Card className="transition-shadow hover:shadow-md">
                  <div className="text-3xl">🤖</div>
                  <CardTitle className="mt-2 text-base">{b.name}</CardTitle>
                  <p className="mt-1 text-xs text-kid-ink/60">
                    ナレッジカード {b._count.knowledgeCards}枚
                  </p>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>

      {recentArtworks.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-kid-ink/70">🎨 さいきんの さくひん</h3>
            <Link href="/kids/gallery" className="text-xs text-kid-primary underline">
              ぜんぶ 見る →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recentArtworks.map((a) => (
              <Card key={a.id} className="!p-2 text-center">
                <ArtworkThumb artwork={a} />
                <p className="mt-1 truncate text-xs">{a.title}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ArtworkThumb({
  artwork,
}: {
  artwork: {
    kind: string;
    imageUrl: string | null;
    videoUrl: string | null;
    audioUrl: string | null;
  };
}) {
  if (artwork.imageUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={artwork.imageUrl}
        alt=""
        className="aspect-square w-full rounded-xl object-cover"
      />
    );
  }
  const emoji =
    artwork.videoUrl ? '🎥' : artwork.audioUrl ? '🎙️' : artwork.kind === 'quiz' ? '🧩' : '🎨';
  return (
    <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-kid-soft text-3xl">
      {emoji}
    </div>
  );
}
