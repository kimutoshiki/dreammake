/**
 * Vercel の 関数 ファイルシステム は 読み取り専用(/tmp 以外)なので、
 * 児童作品(写真・録音・動画・お絵かき)は `/tmp/uploads/...` に 書いている。
 * このルートは `/uploads/<kidId>/<file>.<ext>` への リクエストを 受けて
 * /tmp/uploads から 読んで 返す(揮発性デモ専用)。
 *
 * - ローカル / Docker では `public/uploads/` に 書かれているので
 *   このルートは ヒットせず、Next.js の 静的配信が 答える。
 * - 本番(Vercel)で BLOB_READ_WRITE_TOKEN が ある時は そもそも Blob URL に
 *   直接 アクセスするので ここは 通らない。
 */
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROOT = process.env.VERCEL ? '/tmp/uploads' : path.join(process.cwd(), 'public', 'uploads');

const TYPE_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
};

export async function GET(
  _req: Request,
  { params }: { params: { path: string[] } },
) {
  // パストラバーサル 対策:`..` や 絶対パスを 拒否
  const segs = params.path ?? [];
  if (segs.some((s) => s.includes('..') || s.startsWith('/'))) {
    return new NextResponse('forbidden', { status: 403 });
  }
  const rel = segs.join('/');
  const abs = path.join(ROOT, rel);

  try {
    await stat(abs);
  } catch {
    return new NextResponse('not found', { status: 404 });
  }

  const buf = await readFile(abs);
  const ext = path.extname(abs).slice(1).toLowerCase();
  const type = TYPE_BY_EXT[ext] ?? 'application/octet-stream';
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
