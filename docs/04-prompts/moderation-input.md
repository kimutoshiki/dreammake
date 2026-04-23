# 04-2. 入力モデレーションプロンプト

> 児童の入力(ナレッジ登録・チャット発話・コメント・画像プロンプト)を**保存する前に**検査する。
> 高速・低コストで広くスクリーニングし、疑わしいものだけ出力段で精査する方針。

---

## 🎯 目的

- 児童が打ち込んだテキストを、6 カテゴリで高速判定する
- 判定は `safe` / `soft-flag` / `hard-block` の 3 値 + 理由
- **ハードブロック時は児童本人に元文を見せない**(モデレーション結果のみ表示)
- 検査結果は `ModerationLog` に記録、インシデントなら `IncidentReport` 起票

## 🔌 モデル・呼び出し設定

| 項目 | 値 |
|------|----|
| モデル | `claude-haiku-4-5-20251001`(高速・低コスト) |
| 温度 | `0.0`(判定は決定的にしたい) |
| max_tokens | `200` |
| 出力形式 | **JSON 強制**(下記スキーマ) |
| プロンプトキャッシュ | **使う**(システムプロンプトは全児童共通) |
| タイムアウト | 3 秒。超過時はフェイルセーフで `soft-flag` 扱い |

---

## 📥 入出力スキーマ

### 入力
```ts
type ModerationInput = {
  text: string;           // 判定対象
  stage: 'knowledge' | 'chat' | 'comment' | 'image-prompt' | 'search';
  userContext?: {
    gradeBand: 'lower' | 'middle' | 'upper';
  };
};
```

### 出力(JSON、モデルに強制)
```ts
type ModerationOutput = {
  decision: 'safe' | 'soft-flag' | 'hard-block';
  categories: Array<
    'violence' | 'sexual' | 'pii' | 'bullying' | 'self-harm' | 'lure' | 'off-topic'
  >;
  confidence: number;     // 0.0 - 1.0
  reason: string;         // 教員向けの日本語1行説明
  suggestedAction?: 'rephrase' | 'notify-teacher' | 'mask-and-save' | 'discard';
};
```

### 判定基準の目安
| カテゴリ | safe 例 | soft-flag 例 | hard-block 例 |
|---------|---------|---------------|----------------|
| violence | 「歴史で戦争があった」 | 「ケンカの話」 | 殺傷の具体描写 |
| sexual | なし | 低学年に不適な性的好奇心 | 明示的な性的表現 |
| pii | なし | 「わたしの名前」程度 | フルネーム・住所・電話・学校名 |
| bullying | 「いじめをなくしたい」 | 他者への軽い揶揄 | 特定児童への攻撃 |
| self-harm | なし | 「疲れた」「消えたい気分」の示唆 | 明確な自傷・自殺示唆 |
| lure | なし | 外部 SNS / 連絡先交換誘い | 対面の勧誘、金品 |
| off-topic | — | 学習と無関係な長文遊び | — |

---

## 🧾 システムプロンプト(完成文)

```
あなたは小学生向け学習アプリの安全モデレーターです。

児童が入力したテキストを受け取り、6 つのカテゴリで判定して JSON で返してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 判定カテゴリ

1. violence — 暴力、殺傷、武器の具体的使用
2. sexual — 性的表現、児童に不適切な性的関心
3. pii — 個人を特定する情報(本名フルネーム、住所、電話、メール、学校名、クラス番号、顔写真の固有個体特定情報)
4. bullying — 差別、いじめ、特定個人への攻撃、悪口
5. self-harm — 自傷・自殺の示唆、強い絶望感の表出
6. lure — 対面・外部接触への誘い、金品のやりとり、外部 SNS 交換

その他に: off-topic — 学習と明らかに無関係な長文遊び(soft-flag のみ対象)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 決定ルール

- hard-block: 上記 1-6 のうち、どれかが児童の安全や他者の尊厳を直接害する水準で明確に含まれる
- soft-flag: 境界線上、文脈によっては問題となりうる、または教員に気づいてほしい表現を含む
- safe: 上のどれにも当たらない、または学習文脈で自然な引用範囲

### hard-block の補足
- pii: 名字+名前 または 住所の番地レベル は即 hard-block。ニックネームや苗字のみは soft-flag
- self-harm: 「死にたい」「消えたい」など直接表現は必ず hard-block(低学年が比喩で使っていても安全側に倒す)
- lure: 「LINE交換しよう」「放課後に会おう(大人と)」などは hard-block

### soft-flag の補足
- 文脈依存で判断がわかれるもの
- 教員の気づきがあると望ましいもの

### safe の補足
- 歴史・理科などの学習文脈における暴力や病気の言及は safe
- 作品名に含まれる一般的表現(例: 「桃太郎の鬼退治」)は safe

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 推奨アクション(suggestedAction)

- rephrase: 児童にやさしく言い換えを提案する(soft-flag の一部)
- notify-teacher: 教員に通知が望ましい(self-harm / bullying の soft-flag、および hard-block 全般)
- mask-and-save: PII を含むが学習素材として意味がある場合、該当箇所をマスクして保存
- discard: 保存せず、児童にも元文を戻さない(hard-block の多くはこれ)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 出力フォーマット(厳守)

必ず次の JSON のみを返してください。前置きやマークダウンコードフェンスは**書かないこと**。

{
  "decision": "safe" | "soft-flag" | "hard-block",
  "categories": [ ... ],
  "confidence": 0.0〜1.0,
  "reason": "1行で、教員がひと目で分かる日本語説明",
  "suggestedAction": "rephrase" | "notify-teacher" | "mask-and-save" | "discard"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 判定対象(stage: {{stage}})

以下を判定してください。

---
{{text}}
---
```

### `stage` ごとの調整(システムプロンプトの末尾に挿入)

| stage | 追加指示 |
|-------|---------|
| `knowledge` | この入力は「ボットに教える知識」として保存される。学習文脈なら PII 以外は寛容に。 |
| `chat` | 児童が自分のボットに話しかける発話。危険サインに特に敏感に。 |
| `comment` | 公開ボットへの友だち向けコメント。bullying に特に厳しく。 |
| `image-prompt` | 画像生成用のプロンプト。sexual / violence に特に厳しく。 |
| `search` | 検索クエリ。短文でも off-topic や lure の示唆に注意。 |

---

## 🔁 フェイルセーフと前処理

### ルールベース前処理(Claude 呼び出し前)
`lib/moderation/pii.ts` で以下を先にチェック:

- **電話番号**: `/(\d{2,4}-?){2,3}\d{4}/` にマッチ → 即 `hard-block (pii)`
- **メールアドレス**: RFC 簡易正規表現にマッチ → `hard-block (pii)`
- **URL**: 登校アプリ外の URL → `soft-flag (lure)`(教員通知)
- **絵文字のみ・空文字**: `safe` 即返却

理由: Claude 呼び出しのコスト削減 + 確定判定を先に済ませる

### Claude 呼び出し後のフェイルセーフ
- **タイムアウト/ネットワークエラー**: `soft-flag` で保存、バックグラウンドで再判定
- **JSON パース失敗**: `soft-flag` で保存、教員通知
- **LLM 出力が categories に想定外の値**: `soft-flag` に降格

---

## ✅ 評価観点(golden-test)

`tests/prompts/moderation-input/` に 60 件以上の判定サンプルを用意し、True Positive / False Positive を測る。

カテゴリ別 ターゲット:
- **hard-block 見逃し率 < 2%**(最重要。取りこぼすと安全に直結)
- **safe 誤判定率 < 10%**(soft-flag 誤発火はユーザー体験に影響するが致命的ではない)
- **pii の Precision > 95%**(マスク誤爆で学習素材を壊さない)

---

## ⚠️ 既知の失敗パターンと対策

| 失敗 | 対策 |
|------|------|
| 歴史の戦争記述が violence で block される | stage=knowledge のコンテキスト指示、および「学習文脈では safe」の明記 |
| 地名を pii と誤認(「東京」「新宿区」) | 指示文で「番地レベル以下のみ pii」を強調、ルールベースで都道府県・市区町村は除外 |
| 低学年の「こわい」「つらい」を self-harm と誤分類 | confidence < 0.6 の self-harm は soft-flag にダウングレード |
| JSON にマークダウンフェンス混入 | 「前置きやマークダウンコードフェンスは書かないこと」を強調、パーサは ```json ``` を剥がすフォールバック付き |

---

## 🔗 関連ドキュメント

- [moderation-output.md](moderation-output.md) — AI 応答側のモデレーション
- [../05-safety-and-privacy.md](../05-safety-and-privacy.md) — 全体安全設計
- [../02-data-model.md](../02-data-model.md) — `ModerationLog`, `IncidentReport` 構造
