/**
 * 児童が 書いた「どんな 絵に したいか」の 日本語 を、
 * Claude Haiku で 安全化 + 英訳 し、Gemini 画像 API に渡す 英語プロンプトを 作る。
 *
 * docs/04-prompts/image-prompt-safety.md の設計思想に沿った最小実装。
 */

export type ImageSafetyDecision = 'approve' | 'rewrite' | 'refuse';

export type ImageSafetyOutput = {
  decision: ImageSafetyDecision;
  promptEn?: string;         // approve / rewrite で 生成に使う 英語プロンプト
  rewriteNotes?: string[];   // 書き換えた 要素(教員ログ用)
  refuseReasonJa?: string;   // refuse 時、児童に 見せる やさしい 日本語
};

export function buildImageSafetySystem(gradeBand: 'lower' | 'middle' | 'upper'): string {
  const voice =
    gradeBand === 'lower'
      ? 'やさしい ひらがな中心。1文 20字以内。'
      : gradeBand === 'middle'
        ? '学年相当の漢字 OK。1文 30字以内。'
        : '常用漢字 OK。1文 40字以内。';

  return `あなたは小学校向け 画像生成の 安全化アシスタントです。
児童が 日本語で 書いた「絵の リクエスト」を 読み、
次の 3 つ から 1 つを 返してください。

- approve / rewrite : 安全 または 安全化できた → 画像 API に 渡す 英語プロンプトを 作る
- refuse : 児童向けに 適切でない → 生成を 断る(refuseReasonJa は ${voice})

## 絶対禁則(含まれたら refuse、軽微なら rewrite で 中和)
- 実在の 個人名・住所・学校名・顔写真的な 特定性
- 暴力・武器・血・死・性的描写・恐怖(お化けは ほのぼの なら OK)
- 実在ブランド / アニメキャラ(特徴的一般名詞へ 書き換え)

## approve / rewrite の 英語プロンプト作成(promptEn)
- 英語の 名詞句並び、50〜120 語以内
- 最後に 必ず児童向け 品質キーワードを 付ける:
  `
    .concat(
      '"children\'s book illustration, soft, friendly, safe for kids, no text"',
    )
    .concat(`
- 人物を 描かせない方向に(ペット・風景・もの・キャラ化した 自然 を推奨)

## refuseReasonJa(refuse 時のみ)
児童を 責めず、別のテーマへ やさしく 促す。${voice}

## 出力(JSON のみ、マークダウンフェンスなし)

{
  "decision": "approve" | "rewrite" | "refuse",
  "promptEn": "...",              // approve/rewrite
  "rewriteNotes": ["..."],        // rewrite のみ
  "refuseReasonJa": "..."         // refuse のみ
}`);
}

export function coerceImageSafety(raw: unknown): ImageSafetyOutput {
  const r = raw as Partial<ImageSafetyOutput>;
  const decision = r.decision;
  if (decision !== 'approve' && decision !== 'rewrite' && decision !== 'refuse') {
    return { decision: 'refuse', refuseReasonJa: 'うまく 読み取れなかったよ。別の ことばで 書いてみてね。' };
  }
  return {
    decision,
    promptEn: typeof r.promptEn === 'string' ? r.promptEn : undefined,
    rewriteNotes: Array.isArray(r.rewriteNotes)
      ? r.rewriteNotes.map((x) => String(x))
      : undefined,
    refuseReasonJa:
      typeof r.refuseReasonJa === 'string' ? r.refuseReasonJa : undefined,
  };
}
