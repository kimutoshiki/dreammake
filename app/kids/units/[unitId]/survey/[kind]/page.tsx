import { notFound } from 'next/navigation';
import { getCurrentKid } from '@/lib/context/kid';
import { getUnitForStudent } from '@/lib/queries/unit';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle } from '@/components/ui/Card';
import type { DefaultSurvey } from '@/lib/research/default-surveys';
import { SurveyClient } from './SurveyClient';

export default async function SurveyPage({
  params,
}: {
  params: { unitId: string; kind: string };
}) {
  const kind = params.kind;
  if (kind !== 'pre' && kind !== 'post') notFound();

  const { current: user } = await getCurrentKid();
  if (!user) return null;
  const unit = await getUnitForStudent(params.unitId, user.id);
  if (!unit) notFound();

  const instrument = await prisma.surveyInstrument.findUnique({
    where: { unitId_kind: { unitId: unit.id, kind } },
  });
  if (!instrument) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <Card>
          <CardTitle>アンケートは まだ 用意されていないよ</CardTitle>
          <p className="mt-2 text-sm text-kid-ink/70">
            せんせいが じゅんびしたら 回答できるよ。
          </p>
        </Card>
      </main>
    );
  }

  const existing = await prisma.surveyResponse.findUnique({
    where: {
      instrumentId_userId: { instrumentId: instrument.id, userId: user.id },
    },
  });

  const template = JSON.parse(instrument.questions) as DefaultSurvey;
  const initial = existing
    ? (JSON.parse(existing.answers) as Record<string, unknown>)
    : {};

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <Card>
        <p className="text-xs text-kid-ink/60">
          📋 {kind === 'pre' ? '事前' : '事後'} アンケート
        </p>
        <CardTitle className="mt-1">{template.title}</CardTitle>
        <p className="mt-2 text-sm text-kid-ink/80">{template.introJa}</p>
        {existing && (
          <p className="mt-2 rounded-xl bg-green-50 p-2 text-xs text-green-700">
            ✅ 一度 こたえているよ。上書きできるよ。
          </p>
        )}
      </Card>
      <div className="mt-4">
        <SurveyClient
          instrumentId={instrument.id}
          template={template}
          initialAnswers={initial}
        />
      </div>
    </main>
  );
}
