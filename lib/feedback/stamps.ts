/**
 * 先生が 児童の作品・記録ノートに 押せる スタンプの 定義。
 * 自由記述は モデレーション負荷を 避けるため ここに 限定。
 */
export const FEEDBACK_STAMPS = [
  { id: 'like', emoji: '💛', label: 'いいね' },
  { id: 'wow', emoji: '✨', label: 'すてき' },
  { id: 'think', emoji: '🤔', label: 'いい 気づき' },
  { id: 'grow', emoji: '🌱', label: 'そだっているね' },
  { id: 'cheer', emoji: '📣', label: 'つづけよう' },
] as const;

export type FeedbackStampId = (typeof FEEDBACK_STAMPS)[number]['id'];

export const FEEDBACK_STAMP_MAP: Record<string, (typeof FEEDBACK_STAMPS)[number]> =
  Object.fromEntries(FEEDBACK_STAMPS.map((s) => [s.id, s]));

export function stampLabel(id: string): string {
  return FEEDBACK_STAMP_MAP[id]?.emoji ?? '👍';
}
