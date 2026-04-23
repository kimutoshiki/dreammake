import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { Card, CardTitle } from '@/components/ui/Card';

const KIND_LABEL: Record<string, string> = {
  photo: '📷 しゃしん',
  video: '🎥 どうが',
  audio: '🎙️ ろくおん',
  drawing: '🎨 おえかき',
  image: '🖼️ 絵',
  infographic: '📊 まとめ',
  quiz: '🧩 クイズ',
  music: '🎵 おんがく',
  'mini-app': '🧰 アプリ',
};

export default async function GalleryPage() {
  const { current: user } = await getCurrentKid();
  if (!user) return null;

  const works = await prisma.artwork.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-kid-ink/60">🗂️ じぶんの さくひん</p>
            <CardTitle className="mt-1">マイさくひん</CardTitle>
          </div>
          <Link
            href="/kids"
            className="rounded-full bg-kid-soft px-3 py-1 text-xs hover:bg-kid-primary/20"
          >
            ← ハブへ
          </Link>
        </div>
        <p className="mt-2 text-sm text-kid-ink/70">
          これまでに 作った {works.length} こ の さくひんだよ。
        </p>
      </Card>

      {works.length === 0 ? (
        <Card className="mt-4">
          <p className="text-sm text-kid-ink/70">
            まだ なにも 作っていないよ。
            <Link href="/kids" className="ml-2 text-kid-primary underline">
              なにか 作ってみよう →
            </Link>
          </p>
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((w) => (
            <Card key={w.id} className="!p-3">
              <ArtworkView artwork={w} />
              <div className="mt-2 flex items-center justify-between">
                <p className="truncate text-sm font-medium">{w.title}</p>
                <span className="rounded-full bg-kid-soft px-2 py-0.5 text-[10px]">
                  {KIND_LABEL[w.kind] ?? w.kind}
                </span>
              </div>
              <p className="text-[11px] text-kid-ink/50">
                {new Date(w.createdAt).toLocaleString('ja-JP')}
              </p>
              {w.kind === 'video' && (
                <Link
                  href={`/kids/gallery/video/${w.id}`}
                  className="mt-2 inline-block text-[11px] text-kid-primary underline"
                >
                  🎯 大事な場面に マーカーを つける →
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function ArtworkView({
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
