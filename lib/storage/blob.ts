/**
 * Vercel Blob ストレージへの アップロード実装。
 * `BLOB_READ_WRITE_TOKEN` 環境変数が ある時だけ 使う(本番)。
 *
 * Vercel の ファイルシステムは リクエスト間で 持続しないので、
 * /uploads/<kidId>/<uuid>.<ext> を そのまま 配信できない。
 * 代わりに Blob Storage の 公開 URL を 返す。
 */
import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import type { SavedFile } from './local';

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

export async function saveBlobUpload(
  kidId: string,
  file: File,
): Promise<SavedFile> {
  const ext = pickExt(file.type, file.name);
  const id = randomUUID();
  const key = `uploads/${kidId}/${id}.${ext}`;
  const blob = await put(key, file, {
    access: 'public',
    addRandomSuffix: false,
    contentType: file.type || 'application/octet-stream',
  });
  return {
    publicUrl: blob.url,
    absPath: blob.url,
    size: file.size,
    contentType: file.type || 'application/octet-stream',
  };
}

export async function saveBlobDataUrl(
  kidId: string,
  dataUrl: string,
): Promise<SavedFile> {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('invalid data URL');
  const mime = match[1]!;
  const b64 = match[2]!;
  const buf = Buffer.from(b64, 'base64');
  const ext = pickExt(mime, '');
  const id = randomUUID();
  const key = `uploads/${kidId}/${id}.${ext}`;
  const blob = await put(key, buf, {
    access: 'public',
    addRandomSuffix: false,
    contentType: mime,
  });
  return {
    publicUrl: blob.url,
    absPath: blob.url,
    size: buf.byteLength,
    contentType: mime,
  };
}
