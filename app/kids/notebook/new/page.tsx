import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { Card, CardTitle } from '@/components/ui/Card';
import { NewNotebookClient } from './NewNotebookClient';

export default async function NewNotebookPage() {
  const { current } = await getCurrentKid();
  if (!current) return null;

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

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">📒 新しい ノート</p>
        <CardTitle className="mt-1">取材を 1 まいに まとめよう</CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          先に 📷 しゃしん・🎙️ ろくおん・🎨 おえかき で さくひんを 作っておくと、
          このノートに 添付できるよ。
        </p>
      </Card>
      <div className="mt-4">
        <NewNotebookClient
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
