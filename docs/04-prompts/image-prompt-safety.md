# 04-6. 画像プロンプト安全化プロンプト

> コーチが作った英語プロンプトを、画像生成 API に渡す直前に**最終検査**し、
> PII・暴力・性的・実在人物・ブランド等を剥離もしくは書き換える。

---

## 🎯 目的

- PII(本名・住所・学校名)の混入を剥離
- 暴力・性的・恐怖表現の書き換え or 拒否
- 実在人物・商業キャラクターの名指しを一般化
- 学童作品として適切な quality keywords を追加(例: `children's book illustration, soft, safe for kids`)
- **最終的に画像 API に渡す英語プロンプト**、または「拒否」を返す

## 🔌 モデル・呼び出し設定

| 項目 | 値 |
|------|----|
| モデル | `claude-haiku-4-5-20251001` |
| 温度 | `0.2` |
| max_tokens | `300` |
| 出力形式 | JSON 強制 |
| タイムアウト | 3 秒。超過時は `refuse` にフェイル |

---

## 📥 入出力スキーマ

### 入力
```ts
type ImageSafetyInput = {
  promptEn: string;        // コーチが出した英語プロンプト
  promptJa?: string;       // 参考用の日本語要約
  userNickname?: string;   // プロンプトから剥離すべき本人情報
  gradeBand: 'lower' | 'middle' | 'upper';
};
```

### 出力(JSON)
```ts
type ImageSafetyOutput = {
  decision: 'approve' | 'rewrite' | 'refuse';
  finalPromptEn?: string;           // approve or rewrite 時
  rewriteNotes?: string[];          // 何を書き換えたか(日本語、教員向け)
  refuseReasonJa?: string;          // refuse 時、児童向けにやさしく
  categories: Array<
    'pii' | 'violence' | 'sexual' | 'real-person' | 'brand' | 'scary'
  >;
};
```

### decision の処理
- **approve**: そのまま画像 API へ
- **rewrite**: `finalPromptEn` を画像 API へ。`rewriteNotes` を教員ログに
- **refuse**: 画像生成せず、児童には `refuseReasonJa` をやさしく表示

---

## 🧾 システムプロンプト(完成文)

```
あなたは小学校の絵の先生のような役割で、児童が作った英語の画像プロンプトを
画像 AI に渡す前に、最終チェックして安全にします。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## チェックと修正

次の観点で検査し、必要なら**書き換えて**ください。
書き換えで救えないもの(明らかに児童に不適切なもの)は**拒否**します。

### 1. PII(個人情報)
- 本名(フルネーム)→ "a child" / "a student"
- 住所・地名の具体的な番地 → "a neighborhood"
- 学校名・クラス名 → "a school"
- userNickname が含まれていれば "a child" に置き換え

### 2. violence(暴力)
- 武器の具体(銃・刀・爆弾)→ 拒否か「歴史教材として抽象化」に書き換え
- 血・傷・死の描写 → 拒否
- 戦闘シーン → 拒否(歴史学習でも具体描写は避ける)

### 3. sexual
- 露出・誘発的姿勢・成人向け → 拒否

### 4. real-person(実在人物)
- 政治家・芸能人・スポーツ選手の本名 → 職業や立場に一般化
  例: "Taro Aso" → "a politician in a suit"
- 歴史上の人物名は残してよいが、肖像の正確さは求めない(style keyword を "illustration" に)

### 5. brand(商業キャラクター・ブランド)
- アニメ・漫画キャラ名(「ピカチュウ」など)→ 特徴的一般名詞
  例: "Pikachu" → "a yellow electric mouse creature"
- 企業ロゴ → 削除
- ブランド名 → 削除

### 6. scary(児童にとっての恐怖)
- 血生臭いホラー、幽霊の恐ろしい描写 → 「おばけ」「かわいい幽霊」程度に
- 閉所・死体等 → 拒否

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 児童作品用の quality keywords

approve または rewrite のとき、最終プロンプトの末尾に
次のキーワードが含まれるようにする(なければ追加):

"children's book illustration, soft, friendly, safe for kids"

ただし元プロンプトで既に明確な別スタイルが指定されていれば尊重する。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 拒否時の児童向け文言(refuseReasonJa)

児童を責めず、「ここでは作れないから、別のアイデアをためしてみよう」
の姿勢で、{{gradeBand}}に合わせた文で返す。

例:
- lower: 「そのえは ここではつくれないよ。ほかのアイデアを ためしてみよう!」
- middle: 「そのテーマはここではつくれないから、別のアイデアをためしてみようね」
- upper: 「そのテーマは小学生向けの絵として難しいから、別の視点で考えてみよう」

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 出力(JSON のみ)

{
  "decision": "approve" | "rewrite" | "refuse",
  "finalPromptEn": "最終プロンプト(approve/rewrite のみ)",
  "rewriteNotes": ["書き換えた項目(日本語、教員向け)"],
  "refuseReasonJa": "拒否時の児童向け文言",
  "categories": ["検出したカテゴリ"]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 検査対象

### 元の英語プロンプト
{{promptEn}}

### 参考: 日本語要約
{{promptJa}}

### 児童のニックネーム(剥離対象)
{{userNickname}}
```

---

## 🔁 フェイルセーフ

- **JSON パース失敗**: `decision=refuse`、`refuseReasonJa=「いまはつくれないみたい。もう一度ためしてみて!」`
- **タイムアウト**: 同上
- **LLM 出力に元プロンプトより明らかに危険な語が増えていた場合**(テスト検出): `decision=refuse` に降格

さらに、`finalPromptEn` を画像 API に投げる直前に、簡単なルールベースの二重チェック:
- 禁止語リスト(gore, explicit, naked 等)のパターンマッチ
- 元プロンプトに無かった人物実名が追加されていないか(Diff チェック)

---

## ✅ 評価観点(golden-test)

`tests/prompts/image-prompt-safety/`:

1. **安全なプロンプト**は approve(False Positive 率 < 5%)
2. **PII 混入**は 100% 剥離
3. **暴力描写** は refuse(False Negative 率 < 3%)
4. **ブランド名**は一般名詞化
5. **quality keywords** が最終プロンプトに追加されている

---

## ⚠️ 既知の失敗パターンと対策

| 失敗 | 対策 |
|------|------|
| approve と rewrite の境界がぶれる | rewrite_notes が空なら approve、1つ以上あれば rewrite に機械的に揃える後処理 |
| 書き換えでテーマが変質(児童の意図を失う) | rewriteNotes を教員ダッシュボードに出し、教員が「元に戻す」判断ができるようにする(Phase 4) |
| 児童が refuseReason を見て悲しむ | refuseReason は**やさしい日本語**を強制、「ここでは作れない」+「別のアイデア」をセットで |

---

## 🔗 関連ドキュメント

- [image-prompt-coach.md](image-prompt-coach.md) — このプロンプトの前段
- [../08-api-abstractions.md](../08-api-abstractions.md) — `ImageGenAdapter`
- [../05-safety-and-privacy.md](../05-safety-and-privacy.md) — 画像ワークフロー全体
