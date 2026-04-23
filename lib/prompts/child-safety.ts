/**
 * Anthropic が公開している child-safety system prompt をアプリ側で**固定で差し込む**ための受け皿。
 *
 * Anthropic は、API 経由で 18 歳未満向けプロダクトを提供する組織に、
 * Anthropic 提供の child-safety system prompt を組織独自の安全対策と併せて
 * 導入することを推奨しています。
 * 参照: https://support.claude.com/en/articles/9307344
 *
 * --- 運用手順(開発者向け) ------------------------------------------------
 * 1. 上記公式ドキュメントから最新の child-safety system prompt 本文を取得する。
 * 2. 以下 `ANTHROPIC_CHILD_SAFETY_SYSTEM_PROMPT` にそのまま貼り付ける(改変禁止、改行も保持)。
 * 3. 本ファイルを更新してデプロイする。デフォルトはプレースホルダであり、
 *    本番利用の前に必ず公式本文に差し替えること。
 * 4. バージョン履歴を残すため、差し替え時はコミットメッセージに参照 URL と更新日を書く。
 *
 * 配布形態の制約上、Anthropic の本文をこのリポジトリに直接同梱していません。
 * 開発者(学校・組織)が、利用規約に同意したうえで組み込むワークフローです。
 * ------------------------------------------------------------------------
 */

/**
 * Anthropic が提供する child-safety system prompt。
 * **プレースホルダ**のため、本番前に公式ドキュメントから取得した本文で差し替えること。
 */
const ANTHROPIC_CHILD_SAFETY_SYSTEM_PROMPT = `\
[PLACEHOLDER — 本番利用前に、Anthropic 公式ドキュメント
 https://support.claude.com/en/articles/9307344 に記載された
 最新の child-safety system prompt 本文に差し替えてください。]

This is a placeholder child-safety statement that the application prepends
to all LLM calls made on behalf of students under 18. It must be replaced
with Anthropic's officially provided child-safety system prompt before
deploying to schools or releasing to minors.

Until replaced, the model will still receive our application-level safety
rules (no ungrounded claims, refusal of PII requests, escalation of
self-harm or abuse indicators, and more), documented in
docs/04-prompts/bot-runtime.md and docs/05-safety-and-privacy.md.`;

/**
 * 本文がプレースホルダのままかどうか。
 * ヘルスチェックで可視化、プロダクション環境では警告を出すフラグ。
 */
export function isChildSafetyPromptPlaceholder(): boolean {
  return ANTHROPIC_CHILD_SAFETY_SYSTEM_PROMPT.includes('[PLACEHOLDER');
}

/**
 * ボット / 「声が聞こえていないのは誰?」/ コード生成などで、
 * Anthropic 公式の child-safety プロンプトを**最初の system ブロック**に差し込む。
 */
export function childSafetySystemBlock(): { text: string; cache: boolean } {
  return {
    text: ANTHROPIC_CHILD_SAFETY_SYSTEM_PROMPT,
    // 全リクエストで固定文、プロンプトキャッシュでコスト削減
    cache: true,
  };
}
