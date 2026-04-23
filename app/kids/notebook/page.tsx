import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { Card, CardTitle } from '@/components/ui/Card';

export default async function NotebookListPage() {
  const { current } = await getCurrentKid();
  if (!current) return null;

  const notes = await prisma.fieldNote.findMany({
    where: { userId: current.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-kid-ink/60">📒 記録ノート</p>
            <CardTitle className="mt-1">取材・観察の きろく</CardTitle>
            <p className="mt-2 text-sm text-kid-ink/70">
              しゃしん・ろくおん・おえかき・ことばを 1 まいの カードに まとめるよ。
              ネットが 無くても 使えるよ。
            </p>
          </div>
          <Link
            href="/kids/notebook/new"
            className="rounded-full bg-kid-primary px-4 py-2 text-sm font-medium text-white hover:bg-kid-primary/90"
          >
            ➕ 新しいノート
          </Link>
        </div>
      </Card>

      {notes.length === 0 ? (
        <Card className="mt-4">
          <p className="text-sm text-kid-ink/70">
            まだ ノートは ないよ。「➕ 新しいノート」から はじめよう!
          </p>
          <p className="mt-2 text-xs text-kid-ink/60">
            📷 しゃしん・🎙️ ろくおん・🎨 おえかき を さきに つくってから ノートを
            作ると、添付が えらべて 楽しいよ。
          </p>
        </Card>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {notes.map((n) => (
            <Link key={n.id} href={`/kids/notebook/${n.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <div className="text-3xl">📒</div>
                <CardTitle className="mt-2 text-base">{n.title}</CardTitle>
                {n.locationNote && (
                  <p className="mt-1 text-xs text-kid-ink/60">📍 {n.locationNote}</p>
                )}
                <p className="mt-2 line-clamp-2 text-sm text-kid-ink/80">
                  {n.notes || '(メモなし)'}
                </p>
                <p className="mt-2 text-[11px] text-kid-ink/50">
                  {new Date(n.createdAt).toLocaleString('ja-JP')}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
