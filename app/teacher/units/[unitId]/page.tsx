import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireTeacher } from '@/lib/auth/require';
import { getUnitForTeacher } from '@/lib/queries/unit';
import { Card, CardTitle } from '@/components/ui/Card';
import { UnitEditorClient } from './UnitEditorClient';

export default async function TeacherUnitPage({
  params,
}: {
  params: { unitId: string };
}) {
  const { user } = await requireTeacher();
  const unit = await getUnitForTeacher(params.unitId, user.id);
  if (!unit) notFound();

  const reflectionCount = await prisma.reflectionEntry.count({
    where: { unitId: unit.id },
  });
  const standstillSum = await prisma.reflectionEntry
    .aggregate({
      where: { unitId: unit.id },
      _sum: { standstillCount: true },
    })
    .then((r) => r._sum.standstillCount ?? 0);
  const missingVoiceCount = await prisma.missingVoiceHypothesis.count({
    where: { unitId: unit.id },
  });
  const stanceSnapshotCount = await prisma.stanceSnapshot.count({
    where: { unitId: unit.id },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">
          📘 単元 / {unit.class.name} / 状態:{unit.status}
        </p>
        <CardTitle className="mt-1">{unit.title}</CardTitle>
        <p className="mt-2 text-sm">🎯 {unit.themeQuestion}</p>
        {unit.researchMode && (
          <p className="mt-2 text-xs text-emerald-700">🔬 研究モード ON</p>
        )}
      </Card>

      <section className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="ふりかえり" value={reflectionCount} />
        <Stat label="立ち止まり 合計" value={standstillSum} />
        <Stat label="声の仮説" value={missingVoiceCount} />
        <Stat label="立場 記録" value={stanceSnapshotCount} />
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href={`/teacher/units/${unit.id}/reflections`} className="block">
          <Card className="hover:shadow-md">
            <h3 className="font-semibold">📝 児童の ふりかえりを 見る</h3>
            <p className="mt-1 text-sm text-kid-ink/70">
              立ち止まりの言葉を ハイライト済みで 閲覧
            </p>
          </Card>
        </Link>
        <Link href={`/teacher/units/${unit.id}/surveys`} className="block">
          <Card className="hover:shadow-md">
            <h3 className="font-semibold">📋 事前/事後 アンケート</h3>
            <p className="mt-1 text-sm text-kid-ink/70">
              既定テンプレ生成 + 回答の集計
            </p>
          </Card>
        </Link>
        <Link href={`/teacher/units/${unit.id}/missing-voices`} className="block">
          <Card className="hover:shadow-md">
            <h3 className="font-semibold">🔍 声の仮説 一覧</h3>
            <p className="mt-1 text-sm text-kid-ink/70">
              「AIに出てこないのはだれ?」で 児童が 書いた仮説
            </p>
          </Card>
        </Link>
        <Link href={`/teacher/units/${unit.id}/stances`} className="block">
          <Card className="hover:shadow-md">
            <h3 className="font-semibold">🗺️ 立場マップ</h3>
            <p className="mt-1 text-sm text-kid-ink/70">
              クラスの 立場分布(時系列)
            </p>
          </Card>
        </Link>
      </section>

      <div className="mt-6">
        <UnitEditorClient
          unitId={unit.id}
          status={unit.status}
          hours={unit.hours.map((h) => ({
            id: h.id,
            hourIndex: h.hourIndex,
            topic: h.topic,
            aiInsertion: h.aiInsertion as 'none' | 'before-self' | 'after-self' | 'ask-missing',
          }))}
          stances={unit.stances.map((s) => ({
            id: s.id,
            label: s.label,
            summary: s.summary,
            icon: s.icon ?? '',
          }))}
          hasPre={unit.surveys.some((s) => s.kind === 'pre')}
          hasPost={unit.surveys.some((s) => s.kind === 'post')}
        />
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-kid-ink/5">
      <p className="text-xs text-kid-ink/60">{label}</p>
      <p className="mt-1 text-2xl font-bold text-kid-primary">{value}</p>
    </div>
  );
}
