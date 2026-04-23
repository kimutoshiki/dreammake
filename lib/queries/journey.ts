/**
 * 児童の「学びジャーニー」= ある期間の活動をすべて束ねた まとめデータ。
 */
import { prisma } from '@/lib/prisma';

export type JourneyRange = 'week' | 'month' | 'all';

export function rangeSince(range: JourneyRange): Date | null {
  const d = new Date();
  if (range === 'week') {
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (range === 'month') {
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  return null;
}

export async function getJourney(userId: string, range: JourneyRange) {
  const since = rangeSince(range);
  const dateFilter = since ? { gte: since } : undefined;

  const [artworks, reflections, hypotheses, stanceSnaps, conversations, fieldNotes] =
    await Promise.all([
      prisma.artwork.findMany({
        where: { ownerId: userId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.reflectionEntry.findMany({
        where: { userId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        include: { unit: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.missingVoiceHypothesis.findMany({
        where: { userId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        include: { unit: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stanceSnapshot.findMany({
        where: { userId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        include: { stance: true, unit: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.conversation.findMany({
        where: { userId, ...(dateFilter ? { startedAt: dateFilter } : {}) },
        orderBy: { startedAt: 'desc' },
        include: { bot: { select: { name: true } } },
      }),
      prisma.fieldNote.findMany({
        where: { userId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        include: { unit: { select: { title: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

  const standstillTotal = reflections.reduce((s, r) => s + r.standstillCount, 0);
  const totalWords = reflections.reduce((s, r) => s + r.wordCount, 0);

  const artworkCounts: Record<string, number> = {};
  for (const a of artworks) {
    artworkCounts[a.kind] = (artworkCounts[a.kind] ?? 0) + 1;
  }

  return {
    range,
    since,
    artworks,
    reflections,
    hypotheses,
    stanceSnaps,
    conversations,
    fieldNotes,
    totals: {
      artworks: artworks.length,
      artworkCounts,
      reflections: reflections.length,
      standstillTotal,
      totalWords,
      hypotheses: hypotheses.length,
      stanceSnaps: stanceSnaps.length,
      conversations: conversations.length,
      fieldNotes: fieldNotes.length,
    },
  };
}

export type JourneyData = Awaited<ReturnType<typeof getJourney>>;
