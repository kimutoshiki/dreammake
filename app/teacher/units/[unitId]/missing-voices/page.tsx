import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTeacher } from '@/lib/auth/require';
import { getUnitForTeacher } from '@/lib/queries/unit';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle } from '@/components/ui/Card';

export default async function TeacherMissingVoicesPage({
  params,
}: {
  params: { unitId: string };
}) {
  const { user } = await requireTeacher();
  const unit = await getUnitForTeacher(params.unitId, user.id);
  if (!unit) notFound();

  const hypotheses = await prisma.missingVoiceHypothesis.findMany({
    where: { unitId: unit.id },
    orderBy: { createdAt: 'desc' },
  });
  const userIds = Array.from(new Set(hypotheses.map((h) => h.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, nickname: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.nickname ?? '?']));

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-kid-ink/60">🔍 単元: {unit.title}</p>
            <CardTitle className="mt-1">声の仮説 一覧</CardTitle>
          </div>
          <Link
            href={`/teacher/units/${unit.id}`}
            className="rounded-full bg-kid-soft px-3 py-1 text-xs hover:bg-kid-primary/20"
          >
            ← 単元に戻る
          </Link>
        </div>
        <p className="mt-2 text-sm text-kid-ink/70">
          児童が「声が聞こえていないのはだれ?」で 書いた 仮説。
          多数派に 寄らず、立場選定の 基準を 吟味している 兆しを 読む手がかり。
        </p>
      </Card>

      <div className="mt-4 space-y-2">
        {hypotheses.length === 0 && (
          <Card>
            <p className="text-sm text-kid-ink/70">まだ 仮説は ありません。</p>
          </Card>
        )}
        {hypotheses.map((h) => (
          <Card key={h.id}>
            <div className="flex items-start justify-between">
              <p className="font-medium">{userMap.get(h.userId)}</p>
              <span className="text-xs text-kid-ink/50">
                {new Date(h.createdAt).toLocaleString('ja-JP')}
                {h.shared && ' · 🌐 共有'}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{h.hypothesisText}</p>
            {h.evidence && (
              <p className="mt-1 text-xs text-kid-ink/60">根拠: {h.evidence}</p>
            )}
            {h.askedPrompt && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-kid-ink/60">
                  児童のメモ
                </summary>
                <p className="mt-1 text-kid-ink/80">{h.askedPrompt}</p>
              </details>
            )}
          </Card>
        ))}
      </div>
    </main>
  );
}
