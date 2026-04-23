import Link from 'next/link';
import { getCurrentKid } from '@/lib/context/kid';
import { getJourney, type JourneyRange } from '@/lib/queries/journey';
import { Card, CardTitle } from '@/components/ui/Card';
import { JourneyExportClient } from './JourneyExportClient';

const ART_KIND_LABEL: Record<string, string> = {
  photo: '📷 しゃしん',
  video: '🎥 どうが',
  audio: '🎙️ ろくおん',
  drawing: '🎨 おえかき',
  image: '🖼️ AI絵',
  quiz: '🧩 クイズ',
  music: '🎵 おんがく',
  'mini-app': '🧰 アプリ',
  infographic: '📊 まとめ',
};

export default async function JourneyPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const { current } = await getCurrentKid();
  if (!current) return null;

  const rangeParam = searchParams.range;
  const range: JourneyRange =
    rangeParam === 'month' ? 'month' : rangeParam === 'all' ? 'all' : 'week';

  const j = await getJourney(current.id, range);

  const rangeLabel =
    range === 'week' ? 'この 1 週間' : range === 'month' ? 'この 1 ヶ月' : 'ぜんぶ';

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">🗓️ わたしの 学びジャーニー</p>
        <CardTitle className="mt-1">
          {current.nickname}さんの {rangeLabel}
        </CardTitle>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <RangeChip current={range} target="week" label="1 週間" />
          <RangeChip current={range} target="month" label="1 ヶ月" />
          <RangeChip current={range} target="all" label="ぜんぶ" />
        </div>
      </Card>

      <section className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="📝 ふりかえり" value={j.totals.reflections} />
        <Stat label="✨ 立ち止まり" value={j.totals.standstillTotal} suffix="回" />
        <Stat label="🗺️ 立場の記録" value={j.totals.stanceSnaps} />
        <Stat label="🔍 声の仮説" value={j.totals.hypotheses} />
        <Stat label="🤖 ボット対話" value={j.totals.conversations} />
        <Stat label="📒 記録ノート" value={j.totals.fieldNotes} />
        <Stat label="🎨 さくひん" value={j.totals.artworks} />
        <Stat label="📚 書いた文字" value={j.totals.totalWords} suffix="文字" />
      </section>

      {Object.keys(j.totals.artworkCounts).length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
            🎨 さくひんの うちわけ
          </h3>
          <Card>
            <div className="flex flex-wrap gap-2">
              {Object.entries(j.totals.artworkCounts).map(([k, n]) => (
                <span
                  key={k}
                  className="rounded-full bg-kid-soft px-3 py-1 text-sm"
                >
                  {ART_KIND_LABEL[k] ?? k} × {n}
                </span>
              ))}
            </div>
          </Card>
        </section>
      )}

      {j.reflections.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
            📝 ふりかえりの あゆみ
          </h3>
          <div className="space-y-2">
            {j.reflections.slice(0, 8).map((r) => (
              <Card key={r.id}>
                <p className="text-xs text-kid-ink/60">
                  {r.unit?.title ?? '単元なし'} · {r.prompt} ·{' '}
                  {new Date(r.createdAt).toLocaleDateString('ja-JP')}
                </p>
                <p className="mt-1 text-sm">{r.text}</p>
                <p className="mt-2 text-[11px] text-kid-ink/50">
                  立ち止まり {r.standstillCount}回 / {r.wordCount}文字
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {j.hypotheses.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
            🔍 声の仮説(AI に出てこないのは だれ?)
          </h3>
          <div className="space-y-2">
            {j.hypotheses.slice(0, 5).map((h) => (
              <Card key={h.id}>
                <p className="text-xs text-kid-ink/60">
                  {h.unit?.title ?? '単元なし'} ·{' '}
                  {new Date(h.createdAt).toLocaleDateString('ja-JP')}
                </p>
                <p className="mt-1 text-sm">{h.hypothesisText}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {j.stanceSnaps.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
            🗺️ 立場の うごき
          </h3>
          <Card>
            <ul className="space-y-2 text-sm">
              {j.stanceSnaps.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>
                    <strong>
                      {s.stance?.label ?? s.customLabel ?? '?'}
                    </strong>
                    <span className="ml-2 text-xs text-kid-ink/60">
                      強さ:{'★'.repeat(s.strength)}
                      {'☆'.repeat(5 - s.strength)}
                    </span>
                  </span>
                  <span className="text-xs text-kid-ink/50">
                    {new Date(s.createdAt).toLocaleDateString('ja-JP')}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {j.fieldNotes.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-kid-ink/70">
            📒 記録ノート
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {j.fieldNotes.slice(0, 6).map((n) => (
              <Link
                key={n.id}
                href={`/kids/notebook/${n.id}`}
                className="block"
              >
                <Card className="hover:shadow-md">
                  <p className="text-sm font-medium">📒 {n.title}</p>
                  <p className="mt-1 text-xs text-kid-ink/60">
                    {n.unit?.title ?? '単元なし'} ·{' '}
                    {new Date(n.createdAt).toLocaleDateString('ja-JP')}
                  </p>
                  {n.docsUrl && (
                    <p className="mt-1 text-[10px] text-kid-accent">
                      📄 Docs に書き出し済み
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <JourneyExportClient range={range} rangeLabel={rangeLabel} />
      </section>
    </main>
  );
}

function RangeChip({
  current,
  target,
  label,
}: {
  current: JourneyRange;
  target: JourneyRange;
  label: string;
}) {
  return (
    <Link
      href={`/kids/journey?range=${target}`}
      className={`rounded-full px-3 py-1 text-xs ${
        current === target
          ? 'bg-kid-primary text-white'
          : 'bg-kid-soft text-kid-ink/80 hover:bg-kid-primary/20'
      }`}
    >
      {label}
    </Link>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-kid-ink/5">
      <p className="text-xs text-kid-ink/60">{label}</p>
      <p className="mt-1 text-2xl font-bold text-kid-primary">
        {value}
        {suffix && <span className="ml-0.5 text-sm">{suffix}</span>}
      </p>
    </div>
  );
}
