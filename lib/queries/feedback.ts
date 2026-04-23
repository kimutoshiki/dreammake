import { prisma } from '@/lib/prisma';

export type FeedbackMap = Map<
  string,
  { countByStamp: Record<string, number>; myStampIds: string[] }
>;

/**
 * 指定した artworkId / fieldNoteId たちへの フィードバックを
 * 一括取得。教員視点では 「自分の押したスタンプ」も 返す。
 */
export async function getFeedbackForArtworks(
  artworkIds: string[],
  teacherId: string | null,
): Promise<FeedbackMap> {
  const map: FeedbackMap = new Map();
  if (artworkIds.length === 0) return map;
  const rows = await prisma.feedback.findMany({
    where: { artworkId: { in: artworkIds } },
    select: { artworkId: true, stamp: true, teacherId: true },
  });
  for (const r of rows) {
    if (!r.artworkId) continue;
    const cur = map.get(r.artworkId) ?? { countByStamp: {}, myStampIds: [] };
    cur.countByStamp[r.stamp] = (cur.countByStamp[r.stamp] ?? 0) + 1;
    if (teacherId && r.teacherId === teacherId) cur.myStampIds.push(r.stamp);
    map.set(r.artworkId, cur);
  }
  return map;
}

export async function getFeedbackForFieldNotes(
  noteIds: string[],
  teacherId: string | null,
): Promise<FeedbackMap> {
  const map: FeedbackMap = new Map();
  if (noteIds.length === 0) return map;
  const rows = await prisma.feedback.findMany({
    where: { fieldNoteId: { in: noteIds } },
    select: { fieldNoteId: true, stamp: true, teacherId: true },
  });
  for (const r of rows) {
    if (!r.fieldNoteId) continue;
    const cur = map.get(r.fieldNoteId) ?? { countByStamp: {}, myStampIds: [] };
    cur.countByStamp[r.stamp] = (cur.countByStamp[r.stamp] ?? 0) + 1;
    if (teacherId && r.teacherId === teacherId) cur.myStampIds.push(r.stamp);
    map.set(r.fieldNoteId, cur);
  }
  return map;
}
