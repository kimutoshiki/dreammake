/**
 * 児童がカメラ・マイク・お絵かきで作ったファイルを
 * `public/uploads/<kidId>/<uuid>.<ext>` に保存するローカル実装。
 *
 * Next.js は public/ 配下を自動配信するため、URL は `/uploads/<kidId>/<uuid>.<ext>` で到達可能。
 * アクセス制御はなし(教室内の端末を前提)。本番環境では MinIO / S3 + signed URL に差し替える。
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Vercel の 関数 ファイルシステム は 読み取り専用(/tmp 以外)。
// 本番では /tmp/uploads に 書いて、`/uploads/[...path]` ルート ハンドラ で 配信する。
// それ以外(ローカル / Codespace / Docker)は public/uploads に 直接 書いて
// Next.js の 静的配信に 任せる。
const UPLOAD_ROOT = process.env.VERCEL
  ? '/tmp/uploads'
  : path.join(process.cwd(), 'public', 'uploads');

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
};

function pickExt(mime: string, fallbackName: string): string {
  const fromMime = EXT_BY_TYPE[mime.toLowerCase()];
  if (fromMime) return fromMime;
  const m = /\.([a-zA-Z0-9]{2,4})$/.exec(fallbackName);
  return m ? m[1]!.toLowerCase() : 'bin';
}

export type SavedFile = {
  publicUrl: string;
  absPath: string;
  size: number;
  contentType: string;
};

export async function saveKidUpload(
  kidId: string,
  file: File,
): Promise<SavedFile> {
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = pickExt(file.type, file.name);
  const id = randomUUID();
  const relPath = path.join(kidId, `${id}.${ext}`);
  const absPath = path.join(UPLOAD_ROOT, relPath);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, buf);
  return {
    publicUrl: `/uploads/${kidId}/${id}.${ext}`,
    absPath,
    size: buf.byteLength,
    contentType: file.type || 'application/octet-stream',
  };
}

/**
 * Canvas.toDataURL('image/png') のような data URL を保存する。
 */
export async function saveKidDataUrl(
  kidId: string,
  dataUrl: string,
): Promise<SavedFile> {
  // data:<mime>;base64,<payload>
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) {
    throw new Error('invalid data URL');
  }
  const mime = match[1]!;
  const b64 = match[2]!;
  const buf = Buffer.from(b64, 'base64');
  const ext = pickExt(mime, '');
  const id = randomUUID();
  const relPath = path.join(kidId, `${id}.${ext}`);
  const absPath = path.join(UPLOAD_ROOT, relPath);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, buf);
  return {
    publicUrl: `/uploads/${kidId}/${id}.${ext}`,
    absPath,
    size: buf.byteLength,
    contentType: mime,
  };
}
