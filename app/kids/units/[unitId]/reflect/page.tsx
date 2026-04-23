import { notFound } from 'next/navigation';
import { getCurrentKid } from '@/lib/context/kid';
import { getUnitForStudent } from '@/lib/queries/unit';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle } from '@/components/ui/Card';
import { ReflectClient } from './ReflectClient';

export default async function ReflectPage({
  params,
}: {
  params: { unitId: string };
}) {
  const { current: user } = await getCurrentKid();
  if (!user) return null;
  const unit = await getUnitForStudent(params.unitId, user.id);
  if (!unit) notFound();

  const entries = await prisma.reflectionEntry.findMany({
    where: { unitId: unit.id, userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  const totalStandstill = entries.reduce((s, e) => s + e.standstillCount, 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">✍️ 単元: {unit.title}</p>
        <CardTitle className="mt-1">ふりかえりを 書こう</CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">
          今日の 気づき、まよい、ほんとうかな?と 思ったことを 書いてみよう。
          「でも」「なぜ」「別の見方をすれば」など、
          <strong> 立ち止まった ことばは 自動で 見つけてハイライトするよ。</strong>
          (成績ではないよ、自分のための 記録だよ。)
        </p>
      </Card>

      <div className="mt-4">
        <ReflectClient unitId={unit.id} />
      </div>

      <section className="mt-8">
        <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
          📝 これまでの じぶんの ふりかえり
          <span className="ml-2 rounded-full bg-kid-soft px-2 py-0.5 text-xs">
            立ち止まり 合計 {totalStandstill}回
          </span>
        </h3>
        <div className="space-y-2">
          {entries.length === 0 && (
            <Card>
              <p className="text-sm text-kid-ink/70">まだ 1つも ないよ。</p>
            </Card>
          )}
          {entries.map((e) => {
            const marks = JSON.parse(
              e.standstillWords || '[]',
            ) as Array<{ position: { start: number; end: number } }>;
            return (
              <Card key={e.id}>
                <p className="text-xs text-kid-ink/60">{e.prompt}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {renderWithHighlights(e.text, marks)}
                </p>
                <p className="mt-2 text-xs text-kid-ink/50">
                  立ち止まり {e.standstillCount}回 / {e.wordCount}文字
                </p>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function renderWithHighlights(
  text: string,
  marks: Array<{ position: { start: number; end: number } }>,
) {
  if (marks.length === 0) return text;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  const sorted = [...marks].sort(
    (a, b) => a.position.start - b.position.start,
  );
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i]!;
    if (m.position.start < cursor) continue; // overlap skip
    parts.push(text.slice(cursor, m.position.start));
    parts.push(
      <mark
        key={`m-${i}`}
        className="rounded bg-kid-primary/15 px-0.5 text-kid-ink"
      >
        {text.slice(m.position.start, m.position.end)}
      </mark>,
    );
    cursor = m.position.end;
  }
  parts.push(text.slice(cursor));
  return parts;
}
