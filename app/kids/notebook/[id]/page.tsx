import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { Card, CardTitle } from '@/components/ui/Card';
import { NoteDetailClient } from './NoteDetailClient';

export default async function NotebookDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { current } = await getCurrentKid();
  if (!current) return null;

  const note = await prisma.fieldNote.findUnique({
    where: { id: params.id },
    include: { unit: { select: { id: true, title: true } } },
  });
  if (!note || note.userId !== current.id) notFound();

  const ids: string[] = JSON.parse(note.artworkIds || '[]');
  const arts =
    ids.length > 0
      ? await prisma.artwork.findMany({
          where: { id: { in: ids }, ownerId: current.id },
          select: {
            id: true,
            kind: true,
            title: true,
            imageUrl: true,
            audioUrl: true,
            audioTranscript: true,
          },
        })
      : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-kid-ink/60">📒 記録ノート</p>
            <CardTitle className="mt-1">{note.title}</CardTitle>
            {note.unit && (
              <p className="mt-1 text-xs text-kid-ink/60">
                単元: {note.unit.title}
              </p>
            )}
            {note.locationNote && (
              <p className="mt-1 text-xs text-kid-ink/60">
                📍 {note.locationNote}
              </p>
            )}
            <p className="mt-1 text-[11px] text-kid-ink/50">
              {new Date(note.createdAt).toLocaleString('ja-JP')}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Link
              href={`/kids/notebook/${note.id}/edit`}
              className="rounded-full bg-kid-primary/10 px-3 py-1 text-xs text-kid-primary hover:bg-kid-primary/20"
            >
              ✏️ へんしゅう
            </Link>
            <Link
              href="/kids/notebook"
              className="rounded-full bg-kid-soft px-3 py-1 text-xs hover:bg-kid-primary/20"
            >
              ← 一覧へ
            </Link>
          </div>
        </div>
      </Card>

      {note.notes && (
        <Card className="mt-4">
          <p className="text-xs font-semibold text-kid-ink/70">【気づき】</p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{note.notes}</p>
        </Card>
      )}

      {arts.length > 0 && (
        <section className="mt-4 space-y-4">
          {arts.map((a) => (
            <Card key={a.id} className="!p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{a.title}</p>
                <span className="rounded-full bg-kid-soft px-2 py-0.5 text-[10px]">
                  {a.kind === 'photo'
                    ? '📷 しゃしん'
                    : a.kind === 'drawing'
                      ? '🎨 おえかき'
                      : '🎙️ ろくおん'}
                </span>
              </div>
              {a.imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={a.imageUrl}
                  alt=""
                  className="mt-2 w-full rounded-xl"
                />
              )}
              {a.audioUrl && (
                <div className="mt-2">
                  <audio src={a.audioUrl} className="w-full" controls />
                  {a.audioTranscript && (
                    <p className="mt-2 rounded-xl bg-kid-soft p-2 text-xs leading-relaxed">
                      {a.audioTranscript}
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </section>
      )}

      <div className="mt-6">
        <NoteDetailClient
          noteId={note.id}
          docsUrl={note.docsUrl}
          docsExportedAt={note.docsExportedAt?.toISOString() ?? null}
        />
      </div>
    </main>
  );
}
