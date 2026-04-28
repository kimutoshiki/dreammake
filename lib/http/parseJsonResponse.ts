/**
 * fetch() の Response から JSON を 安全に 取り出す。
 *
 * `await res.json()` を 直に 叩くと、空ボディや HTML エラーページで
 * 「Unexpected end of JSON input」が 出る。先に text() で 読んで、
 * 空なら `{ error }` を 返す ことで、呼び出し側が `data?.error` を 見て
 * 上手く 失敗できるように する。
 */
type WithError<T> = Partial<T> & { error?: string };

export async function parseJsonResponse<T = Record<string, unknown>>(
  res: Response,
): Promise<WithError<T>> {
  const text = await res.text().catch(() => '');
  if (!text) {
    return { error: `(空の応答 ${res.status})` } as WithError<T>;
  }
  try {
    return JSON.parse(text) as WithError<T>;
  } catch {
    return {
      error: `(JSON ではない 応答 ${res.status}): ${text.slice(0, 120)}`,
    } as WithError<T>;
  }
}
