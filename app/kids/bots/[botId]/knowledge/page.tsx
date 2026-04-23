import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStudent } from '@/lib/auth/require';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle } from '@/components/ui/Card';
import { AddKnowledgeForm } from './AddKnowledgeForm';

export default async function KnowledgePage({
  params,
}: {
  params: { botId: string };
}) {
  const { user } = await requireStudent();
  const bot = await prisma.bot.findUnique({
    where: { id: params.botId },
    include: {
      knowledgeCards: { orderBy: { order: 'asc' } },
      sources: true,
    },
  });
  if (!bot) notFound();
  if (bot.ownerId !== user.id) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>📚 {bot.name} に おしえよう</CardTitle>
          <Link
            href={`/kids/bots/${bot.id}`}
            className="rounded-full bg-kid-soft px-3 py-1 text-xs hover:bg-kid-primary/20"
          >
            ← ボットに もどる
          </Link>
        </div>
        <p className="mt-2 text-sm text-kid-ink/70">
          しらべたことを Q&A で おしえてね。<strong>どこから しらべたかの 出典は 必ず 書いてね。</strong>
        </p>
      </Card>

      <div className="mt-4">
        <Card>
          <h3 className="text-base font-semibold">📝 いまあるナレッジ</h3>
          {bot.knowledgeCards.length === 0 ? (
            <p className="mt-2 text-sm text-kid-ink/70">まだ ないよ。下から ついかしてね。</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {bot.knowledgeCards.map((c) => (
                <li key={c.id} className="rounded-2xl bg-kid-soft p-3 text-sm">
                  {c.question && <p className="font-semibold">Q: {c.question}</p>}
                  <p className="mt-1">A: {c.answer}</p>
                  <p className="mt-1 text-xs text-kid-ink/60">
                    📚 出典:{' '}
                    {(JSON.parse(c.sourceIds || '[]') as string[])
                      .map((sid) => bot.sources.find((s) => s.id === sid)?.title ?? '?')
                      .join('、')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <AddKnowledgeForm botId={bot.id} />
      </div>
    </main>
  );
}
