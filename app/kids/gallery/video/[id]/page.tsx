import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { Card, CardTitle } from '@/components/ui/Card';
import { parseVideoMarkers } from '@/lib/video/markers';
import { VideoMarkerClient } from './VideoMarkerClient';

export default async function VideoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { current } = await getCurrentKid();
  if (!current) return null;

  const art = await prisma.artwork.findUnique({
    where: { id: params.id },
  });
  if (!art || art.ownerId !== current.id || art.kind !== 'video') notFound();

  const markers = parseVideoMarkers(art.videoScript);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-kid-ink/60">🎥 どうが</p>
            <CardTitle className="mt-1">{art.title}</CardTitle>
            <p className="mt-1 text-[11px] text-kid-ink/50">
              {new Date(art.createdAt).toLocaleString('ja-JP')}
              {art.videoDurationSec && ` · ${art.videoDurationSec} 秒`}
            </p>
          </div>
          <Link
            href="/kids/gallery"
            className="rounded-full bg-kid-soft px-3 py-1 text-xs hover:bg-kid-primary/20"
          >
            ← マイさくひん
          </Link>
        </div>
      </Card>

      <div className="mt-4">
        {art.videoUrl && (
          <VideoMarkerClient
            artworkId={art.id}
            videoUrl={art.videoUrl}
            initialMarkers={markers}
          />
        )}
      </div>
    </main>
  );
}
