import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentKid } from '@/lib/context/kid';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle } from '@/components/ui/Card';
import { ChatClient } from './ChatClient';

export default async function BotDetailPage({
  params,
}: {
  params: { botId: string };
}) {
  const { current: user } = await getCurrentKid();
  if (!user) return null;
  const bot = await prisma.bot.findUnique({
    where: { id: params.botId },
    include: {
      owner: true,
      knowledgeCards: { orderBy: { order: 'asc' } },
      sources: true,
    },
  });
  if (!bot) notFound();

  // 所有者 or 公開ボット(同クラスなら閲覧可、簡易実装)
  const isOwner = bot.ownerId === user.id;
  if (!bot.isPublic && !isOwner) notFound();

  const sourcesByCardId = new Map<string, { id: string; title: string }[]>();
  for (const card of bot.knowledgeCards) {
    const ids: string[] = JSON.parse(card.sourceIds || '[]');
    sourcesByCardId.set(
      card.id,
      ids
        .map((id) => bot.sources.find((s) => s.id === id))
        .filter((s): s is NonNullable<typeof s> => !!s)
        .map((s) => ({ id: s.id, title: s.title })),
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-kid-ink/60">🤖 ボット</p>
            <CardTitle className="mt-1">{bot.name}</CardTitle>
            <p className="mt-1 text-sm text-kid-ink/70">
              テーマ: {bot.topic} / 作った人: {bot.owner.nickname}
            </p>
          </div>
          {isOwner && (
            <Link
              href={`/kids/bots/${bot.id}/knowledge`}
              className="rounded-full bg-kid-soft px-3 py-1 text-xs hover:bg-kid-primary/20"
            >
              ナレッジを編集
            </Link>
          )}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-kid-soft p-3 text-sm">
            ✨ とくい: {bot.strengths || '(未記入)'}
          </div>
          <div className="rounded-xl bg-white p-3 text-sm ring-1 ring-kid-ink/5">
            🤔 にがて: {bot.weaknesses || '(未記入)'}
          </div>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-kid-ink/70">
            📚 出典 {bot.sources.length}件
          </summary>
          <ul className="mt-2 space-y-1 text-sm">
            {bot.sources.map((s) => (
              <li key={s.id} className="text-kid-ink/80">
                ・{s.title}
                {s.authorOrWho && ` (${s.authorOrWho})`}
              </li>
            ))}
          </ul>
        </details>
      </Card>

      <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
        ⚠️ AI は まちがえることが あるよ。
        大事なことは 本や せんせいにも きいてみよう。
      </div>

      <div className="mt-4">
        <ChatClient botId={bot.id} botName={bot.name} />
      </div>
    </main>
  );
}
