/**
 * 児童作品の 保存先を 自動切替。
 * - Vercel(`BLOB_READ_WRITE_TOKEN` あり)→ Vercel Blob
 * - それ以外(ローカル / Codespace / Docker)→ public/uploads ローカル保存
 */
import { saveKidUpload as saveLocalUpload, saveKidDataUrl as saveLocalDataUrl } from './local';
import { saveBlobUpload, saveBlobDataUrl } from './blob';
import type { SavedFile } from './local';

export type { SavedFile };

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function saveKidUpload(
  kidId: string,
  file: File,
): Promise<SavedFile> {
  return useBlob ? saveBlobUpload(kidId, file) : saveLocalUpload(kidId, file);
}

export async function saveKidDataUrl(
  kidId: string,
  dataUrl: string,
): Promise<SavedFile> {
  return useBlob ? saveBlobDataUrl(kidId, dataUrl) : saveLocalDataUrl(kidId, dataUrl);
}
