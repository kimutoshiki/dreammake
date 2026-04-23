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

  const units = await prisma.unit.findMany({
    where: {
      status: 'active',
      class: {
        memberships: { some: { userId: current.id, role: 'student' } },
      },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true },
  });

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
        <p className="mt-2 text-sm text-kid-ink/70">
          内容を 書き直したり、新しい しゃしん・ろくおん・おえかきを つけたしたり できるよ。
          Docs に 書き出した あとに 変えても、同じ ドキュメントは 変わらないので
          大きな 変更は 新しい ノートに してもいいよ。
        </p>
      </Card>
      <div className="mt-4">
        <EditNotebookClient
          note={{
            id: note.id,
            title: note.title,
            notes: note.notes,
            unitId: note.unitId,
            locationNote: note.locationNote,
          }}
          attachedIds={attachedIds}
          units={units}
          recentArtworks={recentArtworks.map((a) => ({
            ...a,
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
