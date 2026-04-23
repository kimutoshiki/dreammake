/**
 * 入力モデレーション(Haiku)用 System プロンプト。
 * docs/04-prompts/moderation-input.md の完成文から。
 */

export type ModerationStage =
  | 'knowledge'
  | 'chat'
  | 'comment'
  | 'image-prompt'
  | 'search'
  | 'reflection';

export type ModerationDecision = 'safe' | 'soft-flag' | 'hard-block';

export type ModerationCategory =
  | 'violence'
  | 'sexual'
  | 'pii'
  | 'bullying'
  | 'self-harm'
  | 'lure'
  | 'off-topic';

export type ModerationResult = {
  decision: ModerationDecision;
  categories: ModerationCategory[];
  confidence: number;
  reason: string;
  suggestedAction?: 'rephrase' | 'notify-teacher' | 'mask-and-save' | 'discard';
};

const STAGE_ADD: Record<ModerationStage, string> = {
  knowledge: 'この入力は「ボットに教える知識」として保存される。学習文脈なら PII 以外は寛容に。',
  chat: '児童が自分のボットに話しかける発話。危険サインに特に敏感に。',
  comment: '公開ボットへの友だち向けコメント。bullying に特に厳しく。',
  'image-prompt': '画像生成用のプロンプト。sexual / violence に特に厳しく。',
  search: '検索クエリ。短文でも off-topic や lure の示唆に注意。',
  reflection: '児童の振り返り記述。感情の言葉は寛容に扱い、self-harm のみ敏感に。',
};

export function buildModerationSystem(stage: ModerationStage): string {
  return `あなたは小学生向け学習アプリの安全モデレーターです。

児童が入力したテキストを受け取り、6 カテゴリで判定して JSON で返してください。

## 判定カテゴリ
1. violence / 2. sexual / 3. pii(本名フルネーム・住所番地・電話・メール・学校名)
4. bullying / 5. self-harm / 6. lure(対面/SNS/金品の誘い)
その他: off-topic(学習無関係の長文遊び、soft-flag のみ)

## 決定ルール
- hard-block: 1-6 のどれかが児童の安全や尊厳を直接害する水準で明確に含まれる
- soft-flag: 境界線上、または教員に気づいてほしい表現
- safe: それ以外(学習文脈の歴史・病気の言及などは safe)

補足:
- 姓+名のフルネームや住所の番地レベルは即 hard-block。苗字のみやニックネームは soft-flag
- 「死にたい」「消えたい」は低学年の比喩でも必ず hard-block
- 外部 SNS 交換・対面誘いは hard-block

## 推奨アクション(suggestedAction)
rephrase / notify-teacher / mask-and-save / discard

## 出力フォーマット(厳守)
次の JSON のみを返してください。マークダウンコードフェンスは書かないこと。

{
  "decision": "safe" | "soft-flag" | "hard-block",
  "categories": [ ... ],
  "confidence": 0.0〜1.0,
  "reason": "1行、教員がひと目で分かる日本語",
  "suggestedAction": "rephrase" | "notify-teacher" | "mask-and-save" | "discard"
}

## ステージ補足
${STAGE_ADD[stage]}`;
}
