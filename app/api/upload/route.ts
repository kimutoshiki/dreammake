/**
 * 児童が 作った ファイル のアップロード受け口。
 *
 * 受け取れる kind:
 *  - photo   : image/*(カメラ または ファイル選択)
 *  - video   : video/*
 *  - audio   : audio/*(+ 文字起こしテキストを transcript フィールドで)
 *  - drawing : PNG の data URL(Canvas からの書き出し)
 *
 * レスポンス: { ok, artworkId, url }
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentKid } from '@/lib/context/kid';
import { saveKidDataUrl, saveKidUpload } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 動画を想定して少し大きめに
export const maxDuration = 60;

type Kind = 'photo' | 'video' | 'audio' | 'drawing';

function isKind(v: unknown): v is Kind {
  return v === 'photo' || v === 'video' || v === 'audio' || v === 'drawing';
}

export async function POST(req: Request) {
  const { current: kid } = await getCurrentKid();
  if (!kid) {
    return NextResponse.json({ error: 'no kid selected' }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'invalid form' }, { status: 400 });
  }

  const kind = form.get('kind');
  const title = (form.get('title')?.toString() ?? '').slice(0, 80) || '(名前なし)';
  if (!isKind(kind)) {
    return NextResponse.json({ error: 'unknown kind' }, { status: 400 });
  }

  // drawing は data URL(Canvas の toDataURL)、それ以外は Blob
  let publicUrl: string;
  let size = 0;
  let contentType = '';
  if (kind === 'drawing') {
    const dataUrl = form.get('dataUrl')?.toString() ?? '';
    if (!dataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'invalid dataUrl' }, { status: 400 });
    }
    const saved = await saveKidDataUrl(kid.id, dataUrl);
    publicUrl = saved.publicUrl;
    size = saved.size;
    contentType = saved.contentType;
  } else {
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }
    if (file.size > 60 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルが大きすぎます(最大 60MB)' },
        { status: 413 },
      );
    }
    const saved = await saveKidUpload(kid.id, file);
    publicUrl = saved.publicUrl;
    size = saved.size;
    contentType = saved.contentType;
  }

  const transcript =
    kind === 'audio' ? (form.get('transcript')?.toString() ?? '') : '';
  const durationSec = Number(form.get('durationSec') ?? 0) || null;

  // Artwork レコードを作成
  const artworkKind =
    kind === 'photo'
      ? 'photo'
      : kind === 'video'
        ? 'video'
        : kind === 'audio'
          ? 'audio'
          : 'drawing';

  const data: Record<string, unknown> = {
    ownerId: kid.id,
    kind: artworkKind,
    title,
  };
  if (kind === 'photo' || kind === 'drawing') {
    data.imageUrl = publicUrl;
  } else if (kind === 'video') {
    data.videoUrl = publicUrl;
    if (durationSec) data.videoDurationSec = durationSec;
  } else if (kind === 'audio') {
    data.audioUrl = publicUrl;
    if (transcript) data.audioTranscript = transcript;
    if (durationSec) data.audioDurationSec = durationSec;
  }

  const artwork = await prisma.artwork.create({
    data: data as never,
  });

  await prisma.auditLog.create({
    data: {
      actorId: kid.id,
      action: 'upload',
      target: `Artwork:${artwork.id}`,
      meta: JSON.stringify({ kind: artworkKind, size, contentType }),
    },
  });


  return NextResponse.json({ ok: true, artworkId: artwork.id, url: publicUrl });
}
