import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { Card, CardTitle } from '@/components/ui/Card';
import { DrawClient } from './DrawClient';

export default async function DrawPage() {
  const { current } = await getCurrentKid();
  const photos = current
    ? await prisma.artwork.findMany({
        where: { ownerId: current.id, kind: 'photo' },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { id: true, title: true, imageUrl: true },
      })
    : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🎨 おえかき</p>
        <CardTitle className="mt-1">じぶんで かいてみよう</CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          指でも、Apple Pencil でも かけるよ。筆の ふとさや 色は 下で かえられるよ。
          <strong>取材で とった しゃしんの 上に かくこと</strong>も できるよ。
        </p>
      </Card>
      <div className="mt-4">
        <DrawClient
          photos={photos.map((p) => ({
            id: p.id,
            title: p.title,
            url: p.imageUrl ?? '',
          }))}
        />
      </div>
    </main>
  );
}
