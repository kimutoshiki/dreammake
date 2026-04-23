'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { getJourney, type JourneyRange } from '@/lib/queries/journey';
import { postFieldNoteToClassDoc } from '@/lib/integrations/sheets';

/**
 * 「わたしの学びジャーニー」を Google Docs に書き出す。
 * field-note と 同じ Apps Script エンドポイントを使う(同じ Doc 構造)。
 */
export async function exportJourneyToDocs(range: JourneyRange) {
  const { current: kid } = await getCurrentKid();
  if (!kid) {
    return { ok: false as const, message: '児童が 選ばれていないよ' };
  }

  const j = await getJourney(kid.id, range);

  const membership = await prisma.classMembership.findFirst({
    where: { userId: kid.id, role: 'student' },
    select: { classId: true, class: { select: { name: true } } },
  });
  if (!membership) {
    return { ok: false as const, message: 'クラスが みつかりませんでした' };
  }

  const rangeLabel =
    range === 'week' ? '1 週間' : range === 'month' ? '1 ヶ月' : 'ぜんぶ';

  const lines: string[] = [];
  lines.push(`【まとめ】${rangeLabel}の 活動`);
  lines.push(
    `ふりかえり ${j.totals.reflections}件 / 立ち止まり ${j.totals.standstillTotal}回 / 立場の記録 ${j.totals.stanceSnaps}件 / 声の仮説 ${j.totals.hypotheses}件 / ボット対話 ${j.totals.conversations}回 / 記録ノート ${j.totals.fieldNotes}件 / さくひん ${j.totals.artworks}件 / 書いた文字 ${j.totals.totalWords}`,
  );
  if (j.reflections.length > 0) {
    lines.push('');
    lines.push('【ふりかえり の あゆみ】');
    for (const r of j.reflections.slice(0, 12)) {
      lines.push(
        `・${new Date(r.createdAt).toLocaleDateString('ja-JP')}(単元:${r.unit?.title ?? '—'}、立ち止まり ${r.standstillCount}回)`,
      );
      lines.push(`  「${r.prompt}」`);
      lines.push(`  ${r.text}`);
    }
  }
  if (j.hypotheses.length > 0) {
    lines.push('');
    lines.push('【声の仮説】');
    for (const h of j.hypotheses.slice(0, 8)) {
      lines.push(
        `・${new Date(h.createdAt).toLocaleDateString('ja-JP')} / ${h.unit?.title ?? '—'}: ${h.hypothesisText}`,
      );
    }
  }
  if (j.stanceSnaps.length > 0) {
    lines.push('');
    lines.push('【立場の うごき】');
    for (const s of j.stanceSnaps.slice(0, 10)) {
      lines.push(
        `・${new Date(s.createdAt).toLocaleDateString('ja-JP')} / ${s.stance?.label ?? s.customLabel ?? '?'}(強さ ${s.strength}):${s.reasoning}`,
      );
    }
  }
  if (j.fieldNotes.length > 0) {
    lines.push('');
    lines.push('【記録ノート】');
    for (const n of j.fieldNotes.slice(0, 10)) {
      lines.push(
        `・${new Date(n.createdAt).toLocaleDateString('ja-JP')} / ${n.title}${n.docsUrl ? ` (Docs: ${n.docsUrl})` : ''}`,
      );
    }
  }

  const notes = lines.join('\n');
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? '';
  const absolute = (u: string | null | undefined) =>
    u ? (u.startsWith('http') ? u : `${base}${u}`) : null;
  const photoUrls = j.artworks
    .filter((a) => (a.kind === 'photo' || a.kind === 'image') && a.imageUrl)
    .slice(0, 10)
    .map((a) => absolute(a.imageUrl)!)
    .filter(Boolean);
  const drawingUrls = j.artworks
    .filter((a) => a.kind === 'drawing' && a.imageUrl)
    .slice(0, 10)
    .map((a) => absolute(a.imageUrl)!)
    .filter(Boolean);

  const result = await postFieldNoteToClassDoc(membership.classId, {
    timestamp: new Date().toISOString(),
    student: { nickname: kid.nickname, handle: kid.handle },
    className: membership.class.name,
    unitTitle: null,
    title: `わたしの学びジャーニー(${rangeLabel})`,
    notes,
    locationNote: null,
    audioTranscript: null,
    audioUrl: null,
    photoUrls,
    drawingUrls,
  });

  if (!result.ok) {
    return { ok: false as const, message: result.reason };
  }

  await prisma.auditLog.create({
    data: {
      actorId: kid.id,
      action: 'docs-export',
      target: `Journey:${range}`,
      meta: JSON.stringify({ docsUrl: result.docUrl, range }),
    },
  });

  return { ok: true as const, docsUrl: result.docUrl };
}
