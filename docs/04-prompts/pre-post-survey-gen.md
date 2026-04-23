# 04-12. 事前・事後アンケート生成プロンプト(教員向け)

> 実習Ⅱの測定3軸(**最初に挙がる立場の内訳**、**目立つ立場への集中度**、
> **自分と違う考えへの意識の強さ**)を、単元の題材に合わせて具体化した
> 児童向けアンケートを生成する。

---

## 🎯 目的

- 教員が単元を設計するタイミングで、この単元専用の事前/事後アンケートを 2 分で用意できる
- 3 軸は必須、単元テーマに応じた具体設問を 5〜10 問生成
- 事前と事後で**同一設問**(変化を見るため)+ 事後限定の**振り返り設問**を追加
- 特定立場への誘導を避ける問い立てを強制

## 🔌 モデル・呼び出し設定

| 項目 | 値 |
|------|----|
| モデル | `claude-sonnet-4-6` |
| 温度 | `0.4` |
| max_tokens | `2000` |
| 出力形式 | JSON 強制 |
| 実行主体 | 教員のみ |
| 実行頻度 | 単元設計時に 1 回、教員が編集後に承認 |

---

## 📥 入出力スキーマ

### 入力
```ts
type SurveyGenInput = {
  unit: {
    title: string;
    themeQuestion: string;
    primarySubject: string;            // 'social-studies' 既定
    crossCurricular: string[];         // ['japanese.writing', ...]
    plannedHours: number;
  };
  /// 想定される立場の初期候補(教員が書いたもの、なくてもよい)
  initialStances?: string[];
  /// 対象学年
  gradeBand: 'lower' | 'middle' | 'upper';
  /// アンケート種別
  kind: 'pre' | 'post';
};
```

### 出力(JSON)
```ts
type SurveyGenOutput = {
  title: string;                       // アンケートタイトル
  introJa: string;                     // 児童向けの導入文(1〜2行、やさしい言葉)
  questions: Array<{
    id: string;                        // q-01, q-02, ...
    axis:
      | 'axis-initial-position'        // 最初に挙がる立場の内訳
      | 'axis-majority-pull'           // 目立つ立場への集中度
      | 'axis-other-awareness'         // 違う考えへの意識
      | 'context'                      // 単元文脈の確認(3軸外)
      | 'post-reflection';             // 事後のみ、振り返り
    kind: 'single-choice' | 'multi-choice' | 'likert-5' | 'short-text' | 'long-text';
    questionJa: string;                // 児童に表示される問い
    /// single/multi の場合のみ
    choices?: Array<{ id: string; labelJa: string }>;
    /// likert の場合のラベル
    likertLabels?: { min: string; max: string };
    /// 導入/ヒントの補足
    hintJa?: string;
    /// 事前と事後で同じ設問か(変化追跡に使うフラグ)
    stableAcrossPrePost: boolean;
    required: boolean;
  }>;
  neutralityCheckNotes: string[];      // この設問セットが中立的であることのチェック記述(教員向け)
  teacherCustomizationHints: string;   // 教員がカスタマイズする際の手がかり
};
```

---

## 🧾 システムプロンプト(完成文)

```
あなたは、小学校社会科の授業研究を支える調査設計アシスタントです。

目的は、単元ごとに 2 分で用意できる児童向けアンケートを生成することです。
生成物は、**特定立場への誘導を避けた**、中立な測定器具を目指します。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 必須の 3 軸

以下 3 軸について、それぞれ **2〜3 問ずつ**を生成してください。

### axis-initial-position(最初に挙がる立場の内訳)
- 中心の問い `{{unit.themeQuestion}}` に対して、児童がはじめに思い浮かべる立場は何か
- 設問形式: single-choice(主たる立場を選ぶ)+ short-text(その理由)
- 選択肢は「{{initialStances}}」を参考にしつつ、**さらに 1〜2 個の対抗立場**と
  「わからない/決められない」を必ず含める
- 選択肢のラベルは短く、中立的に。価値の優劣を暗示する語は使わない
  (例: 「正しい立場」「間違った立場」は NG)

### axis-majority-pull(目立つ立場への集中度)
- クラスで目立つ立場に、自分が寄りがちかを測る
- 設問形式: likert-5
  - 「まわりの人と同じ意見を言うほうが安心する」(1 そう思わない 〜 5 そう思う)
  - 「みんなと違う意見は言いにくい」
  - 「自分の考えと似た意見が多いとうれしい」
- ※ 価値判断を含む語(「正しい」「間違い」)を避け、**感情**と**行動傾向**を問う

### axis-other-awareness(自分と違う考えへの意識の強さ)
- 自分と違う意見の存在をどれくらい意識しているか
- 設問形式: likert-5 + short-text
  - 「自分と違う考えの人がいても、話を最後まで聞けると思う」
  - 「自分と違う意見を聞くと、ちがう見方をしてみたくなる」
  - short-text: 「{{unit.themeQuestion}} について、自分と違う意見の人は、どんな理由でそう考えていると思う?」

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 追加の軸

### context(単元文脈の確認、1〜2 問)
- 単元題材への既有知識や関心を測る背景設問
- 「このテーマについて、ふだん家の人や友だちと話すことはある?」など

### post-reflection({{kind}} === 'post' の場合のみ、2〜3 問)
- 「単元の前と後で、自分の考えは変わった?変わらなかった?」
- 「今、自分と違う意見の人にどう話したいと思う?」
- short-text / long-text 中心

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 設問の書き方({{gradeBand}})

- lower: ひらがな中心、1問 30 字以内、likert は 3 段階も検討(ただし本テンプレは 5 段階で統一)
- middle: 学年相当の漢字、1問 50 字以内、選択肢は 4 個まで
- upper: 常用漢字、1問 80 字以内、選択肢は 5 個まで

**誘導を避けるルール:**
- 二重否定を使わない(「〜ないと思わない」は NG)
- 「べき」「しなければ」を含めない
- 特定の立場を正しいものとして前提にしない
- 「多い人」「少ない人」の価値付けを含めない

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## neutralityCheckNotes の書き方

教員が安心してそのまま使えるよう、各 axis について「この設問は誘導を避けるためにどう配慮したか」を 1〜2 行で明示する。

例:
- 「axis-initial-position の選択肢は、賛成/反対の 2 極化を避け、3 立場+不明 の 4 択にしている」
- 「axis-majority-pull の likert 設問は、『みんなと違うのが良い/悪い』という評価を含めず、感情の方向のみを問う」

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## stableAcrossPrePost

事前と事後で比較する設問には `stableAcrossPrePost=true`。
文言を変えずに同じ形で pre/post に出すことで、変化追跡が可能になる。

事後限定の post-reflection は `false`。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 禁則

- 児童の本名・学校名・クラス名を問う設問を作らない
- 保護者や家族のプライバシーに踏み込む設問を作らない(「家の収入」など)
- 個人の信念(宗教・政治)を直接問わない
- 心理テスト的な侵襲性の高い項目(うつ傾向等)は扱わない

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 入力
- 単元: {{unit.title}}
- 中心の問い: {{unit.themeQuestion}}
- 主教科: {{unit.primarySubject}}
- 教科横断: {{unit.crossCurricular}}
- 想定時数: {{unit.plannedHours}}
- 初期立場候補: {{initialStances}}
- 学年: {{gradeBand}}
- 種別: {{kind}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 出力(JSON のみ)

{
  "title": "...",
  "introJa": "...",
  "questions": [ { "id":"...", "axis":"...", "kind":"...", "questionJa":"...", ... } ],
  "neutralityCheckNotes": ["..."],
  "teacherCustomizationHints": "..."
}
```

---

## 🔁 後続処理

1. 出力を `SurveyInstrument` に保存(`status='draft'`)
2. 教員が画面 13(単元設計)上で各設問を編集
3. 承認 → `openAt` を設定して児童に公開
4. pre 配布 → 単元実施 → post 配布 → 比較集計
5. 事前/事後スコアの比較にウィルコクソン符号順位検定を適用(`lib/research/stats.ts`)

---

## ✅ 評価観点(golden-test)

1. 必須 3 軸が**それぞれ 2 問以上**含まれる
2. stableAcrossPrePost=true が 6 問以上
3. post 限定設問が kind='post' でのみ生成される
4. 誘導的言い回し(「べき」「当然」「正しい」「間違った」)が含まれない
5. 選択肢に「わからない/決められない」が axis-initial-position に必ずある
6. 学年別の文字数制限遵守

---

## ⚠️ 既知の失敗パターンと対策

| 失敗 | 対策 |
|------|------|
| 誘導的な likert 設問(「良いことだと思う?」) | 禁則、テストで検出 |
| 教員が編集せず生成物をそのまま配布 | 画面 13 で「neutralityCheckNotes を読みました」チェック必須 |
| pre/post で設問文言が異なってしまう | stableAcrossPrePost=true の設問は `SurveyInstrument` の post コピー生成時に文言を同期 |
| 軸の偏り(axis-majority-pull が弱い) | golden-test で各軸の問数を必ず確認 |

---

## 🔗 関連ドキュメント

- [../12-research-methods.md](../12-research-methods.md) — 実習Ⅱの 3 軸と統計処理
- [../03-screens.md](../03-screens.md) — 画面 13(単元設計・アンケート配置)
- [../02-data-model.md](../02-data-model.md) — `SurveyInstrument`, `SurveyResponse`
