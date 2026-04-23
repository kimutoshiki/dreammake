import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { Card, CardTitle } from '@/components/ui/Card';
import { EditNotebookClient } from './EditNotebookClient';

export default async function EditNotebookPage({
  params,
}: {
  params: { id: string };
}) {
  const { current } = await getCurrentKid();
  if (!current) return null;

  const note = await prisma.fieldNote.findUnique({
    where: { id: params.id },
  });
  if (!note || note.userId !== current.id) notFound();

  const recentArtworks = await prisma.artwork.findMany({
    where: {
      ownerId: current.id,
      kind: { in: ['photo', 'drawing', 'audio'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 24,
    select: {
      id: true,
      kind: true,
      title: true,
      imageUrl: true,
      audioUrl: true,
      audioTranscript: true,
      createdAt: true,
    },
  });

  const attachedIds: string[] = JSON.parse(note.artworkIds || '[]');

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">📒 記録ノートの へんしゅう</p>
        <CardTitle className="mt-1">{note.title}</CardTitle>
      </Card>
      <div className="mt-4">
        <EditNotebookClient
          note={{
            id: note.id,
            title: note.title,
            notes: note.notes,
            locationNote: note.locationNote,
          }}
          attachedIds={attachedIds}
          recentArtworks={recentArtworks.map((a) => ({
            ...a,
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
