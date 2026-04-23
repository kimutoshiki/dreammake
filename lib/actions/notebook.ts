'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { moderateInput } from '@/lib/moderation/input';
import { postFieldNoteToClassDoc } from '@/lib/integrations/sheets';

const CreateSchema = z.object({
  title: z.string().min(1).max(80),
  unitId: z.string().optional().or(z.literal('')),
  locationNote: z.string().max(200).optional().or(z.literal('')),
  notes: z.string().max(4000).optional().or(z.literal('')),
  artworkIds: z.array(z.string()).max(12).default([]),
});

export async function createFieldNote(input: z.infer<typeof CreateSchema>) {
  const { current: kid } = await getCurrentKid();
  if (!kid) {
    return { ok: false as const, message: '児童が 選ばれていないよ' };
  }
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: '入力を 見直してね' };
  }

  // モデレーション: タイトル + メモ + 場所メモを一括判定
  const joined = [parsed.data.title, parsed.data.notes, parsed.data.locationNote]
    .filter(Boolean)
    .join('\n');
  const mod = await moderateInput({ text: joined, stage: 'reflection' });
  await prisma.moderationLog.create({
    data: {
      stage: 'input',
      decision: mod.decision,
      categories: JSON.stringify(mod.categories),
      model: mod.model,
      reason: mod.reason,
      userId: kid.id,
    },
  });
  if (mod.decision === 'hard-block') {
    return {
      ok: false as const,
      message: 'その ことばは ここには 書かないでね。せんせいに 相談してみよう。',
    };
  }

  // 添付 Artwork が 自分のものか 検証
  const ids = parsed.data.artworkIds;
  if (ids.length > 0) {
    const ownedCount = await prisma.artwork.count({
      where: { id: { in: ids }, ownerId: kid.id },
    });
    if (ownedCount !== ids.length) {
      return { ok: false as const, message: '自分の さくひんだけ えらんでね' };
    }
  }

  const note = await prisma.fieldNote.create({
    data: {
      userId: kid.id,
      unitId: parsed.data.unitId || null,
      title: parsed.data.title,
      notes: parsed.data.notes ?? '',
      locationNote: parsed.data.locationNote || null,
      artworkIds: JSON.stringify(ids),
    },
  });

  revalidatePath('/kids/notebook');
  redirect(`/kids/notebook/${note.id}`);
}

const UpdateSchema = CreateSchema.extend({ id: z.string().min(1) });

export async function updateFieldNote(input: z.infer<typeof UpdateSchema>) {
  const { current: kid } = await getCurrentKid();
  if (!kid) {
    return { ok: false as const, message: '児童が 選ばれていないよ' };
  }
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: '入力を 見直してね' };
  }
  const note = await prisma.fieldNote.findUnique({ where: { id: parsed.data.id } });
  if (!note || note.userId !== kid.id) {
    return { ok: false as const, message: 'このノートは あなたの ノートじゃないよ' };
  }

  const joined = [parsed.data.title, parsed.data.notes, parsed.data.locationNote]
    .filter(Boolean)
    .join('\n');
  const mod = await moderateInput({ text: joined, stage: 'reflection' });
  await prisma.moderationLog.create({
    data: {
      stage: 'input',
      decision: mod.decision,
      categories: JSON.stringify(mod.categories),
      model: mod.model,
      reason: mod.reason,
      userId: kid.id,
    },
  });
  if (mod.decision === 'hard-block') {
    return { ok: false as const, message: 'そのことばは ここには 書かないでね。' };
  }

  if (parsed.data.artworkIds.length > 0) {
    const ownedCount = await prisma.artwork.count({
      where: { id: { in: parsed.data.artworkIds }, ownerId: kid.id },
    });
    if (ownedCount !== parsed.data.artworkIds.length) {
      return { ok: false as const, message: '自分の さくひんだけ えらんでね' };
    }
  }

  await prisma.fieldNote.update({
    where: { id: parsed.data.id },
    data: {
      title: parsed.data.title,
      unitId: parsed.data.unitId || null,
      locationNote: parsed.data.locationNote || null,
      notes: parsed.data.notes ?? '',
      artworkIds: JSON.stringify(parsed.data.artworkIds),
    },
  });
  revalidatePath('/kids/notebook');
  revalidatePath(`/kids/notebook/${parsed.data.id}`);
  return { ok: true as const };
}

/** Google Docs に書き出し(既存 URL があればそれを返す)。 */
export async function exportFieldNoteToDocs(noteId: string) {
  const { current: kid } = await getCurrentKid();
  if (!kid) {
    return { ok: false as const, message: '児童が 選ばれていないよ' };
  }
  const note = await prisma.fieldNote.findUnique({
    where: { id: noteId },
    include: { unit: { select: { title: true, classId: true } } },
  });
  if (!note || note.userId !== kid.id) {
    return { ok: false as const, message: 'このノートは あなたの ノートじゃないよ' };
  }

  // すでに URL があれば それを 返す(Docs は 1 度だけ作る)
  if (note.docsUrl) {
    return { ok: true as const, docsUrl: note.docsUrl, reused: true };
  }

  // 所属クラスを 取得(ノートの 単元 > 児童の 所属クラス の順)
  let classId: string | null = note.unit?.classId ?? null;
  if (!classId) {
    const m = await prisma.classMembership.findFirst({
      where: { userId: kid.id, role: 'student' },
      select: { classId: true },
    });
    classId = m?.classId ?? null;
  }
  if (!classId) {
    return { ok: false as const, message: 'クラスが みつかりませんでした' };
  }

  // 添付 Artwork を 読み込み、kind ごとに 振り分け
  const ids: string[] = JSON.parse(note.artworkIds || '[]');
  const arts = await prisma.artwork.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      kind: true,
      imageUrl: true,
      videoUrl: true,
      audioUrl: true,
      audioTranscript: true,
    },
  });
  const photoUrls = arts
    .filter((a) => a.kind === 'photo' && a.imageUrl)
    .map((a) => a.imageUrl!);
  const drawingUrls = arts
    .filter((a) => a.kind === 'drawing' && a.imageUrl)
    .map((a) => a.imageUrl!);
  const audio = arts.find((a) => a.kind === 'audio');

  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? '';
  const absolute = (u: string) => (u.startsWith('http') ? u : `${base}${u}`);

  const result = await postFieldNoteToClassDoc(classId, {
    timestamp: note.createdAt.toISOString(),
    student: { nickname: kid.nickname, handle: kid.handle },
    className: null, // sheets.ts 側で 埋める
    unitTitle: note.unit?.title ?? null,
    title: note.title,
    notes: note.notes,
    locationNote: note.locationNote ?? null,
    audioTranscript: audio?.audioTranscript ?? null,
    audioUrl: audio?.audioUrl ? absolute(audio.audioUrl) : null,
    photoUrls: photoUrls.map(absolute),
    drawingUrls: drawingUrls.map(absolute),
  });

  if (!result.ok) {
    return { ok: false as const, message: result.reason };
  }

  await prisma.fieldNote.update({
    where: { id: note.id },
    data: { docsUrl: result.docUrl, docsExportedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      actorId: kid.id,
      action: 'docs-export',
      target: `FieldNote:${note.id}`,
      meta: JSON.stringify({ docsUrl: result.docUrl }),
    },
  });

  revalidatePath(`/kids/notebook/${note.id}`);
  return { ok: true as const, docsUrl: result.docUrl, reused: false };
}
