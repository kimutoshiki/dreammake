# 04-9. 立ち止まりの言葉 検出プロンプト

> 児童の書いた振り返り・発話ログから、「でも」「なぜ」「別の見方をすれば」などの
> **立ち止まりの言葉**を検出し、思考が動いた場面を可視化する。
> 事前/事後で出現頻度を比較し、多面的・多角的な見方の育ちを測る。

---

## 🎯 目的

- 振り返り記述や対話ログから立ち止まりのシグナルを抽出し、`ReflectionEntry.standstillWords` に記録
- 児童本人が**自分の思考の足跡**を可視化できる(セルフビュー)
- 教員がクラス全体の変化を集計できる
- **ウィルコクソン符号順位検定**で事前事後比較するための量的データの元

## 🔌 モデル・呼び出し設定

| 項目 | 値 |
|------|----|
| モデル | `claude-haiku-4-5-20251001` |
| 温度 | `0.0` |
| max_tokens | `500` |
| 出力形式 | JSON 強制 |
| 実行タイミング | 児童が `ReflectionEntry` を保存した直後、もしくは対話終了時にバッチ |

> **ルールベース前処理を併用**: 明確な固定語(「でも」「しかし」「なぜ」等)は正規表現で先に検出し、Claude 呼び出しは**文脈判断が必要な拡張検出**に限定することでコストを抑える。

---

## 📥 入出力スキーマ

### 入力
```ts
type StandstillDetectionInput = {
  text: string;                        // 児童の記述
  kind: 'reflection' | 'chat-turn' | 'missing-voice-hypothesis';
  gradeBand: 'lower' | 'middle' | 'upper';
  /// ルールベースで既に検出された固定語(重複カウント回避のため渡す)
  alreadyDetected?: Array<{ term: string; positions: number[] }>;
};
```

### 出力(JSON)
```ts
type StandstillDetectionOutput = {
  detections: Array<{
    term: string;                      // 正規化された立ち止まり語
    phrase: string;                    // 実際に児童が書いた言い回し
    position: { start: number; end: number };  // text 内の文字位置
    category:
      | 'hesitation'      // でも、けれど、でもさあ、うーん
      | 'questioning'     // なぜ、どうして、ほんとに?、本当にそう?
      | 'reframing'       // 別の見方をすれば、ちがう視点から、もしかしたら
      | 'self-correction' // やっぱり違う、前言撤回、でも今は
      | 'empathizing'     // その人の気持ちになると、〜の立場だったら
      | 'uncertainty';    // わからない、迷う、決められない
    confidence: number;                // 0.0-1.0
  }>;
  summary: {
    count: number;                     // 検出総数
    categoryCounts: Record<string, number>;
    /// 児童に見せる短い言葉(例:「3回、立ち止まれていたね!」)
    encouragementJa: string;
  };
};
```

---

## 🧾 ルールベース前処理(Claude 呼び出し前)

`lib/research/standstill-rules.ts`:

```ts
export const FIXED_STANDSTILL_TERMS: Record<string, StandstillCategory> = {
  'でも':       'hesitation',
  'けれど':     'hesitation',
  'しかし':     'hesitation',
  'なぜ':       'questioning',
  'どうして':   'questioning',
  'ほんとに':   'questioning',
  '本当に':     'questioning',
  '別の見方':   'reframing',
  '違う見方':   'reframing',
  'もしかしたら': 'reframing',
  'やっぱり':   'self-correction',
  'わからない': 'uncertainty',
  '迷う':       'uncertainty',
  'もしわたしが': 'empathizing',
  'の気持ち':   'empathizing',
};
```

ルールで拾えなかったニュアンス(「でもさ、たしかにそうかも…」のような揺らぎ、「〜〜の立場だったらどうだろう」のような感情移入)は Claude で拾う。

---

## 🧾 システムプロンプト(完成文)

```
あなたは、児童の書いた文章から、
**思考が立ち止まり、判断が揺れた瞬間の言葉**を拾い上げる読み手です。

目的は、児童自身や教員が「自分は考え直せた、考え続けられた」瞬間を
振り返る材料を提供することです。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 検出カテゴリ

1. hesitation    — ためらい、「でも」「けれど」「しかし」の直接表現、および言い淀み
2. questioning   — 自問、疑問の再提示、「ほんとうにそうかな」系
3. reframing     — 別の見方、別の立場からの言い換え、「もしかしたら」の仮説提示
4. self-correction — 自分の前言を修正、撤回、更新
5. empathizing   — 他者の気持ち・立場への踏み込み(「〜の立場だったら」「〜の気持ちになると」)
6. uncertainty   — わからなさを保つ、判断を保留する記述

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## やること

児童の文章 text を読み、**alreadyDetected で既に拾われた固定語を除いた**
立ち止まりの言葉を抽出してください。

特に拾ってほしいのは:
- 固定語では拾えない、**文脈依存の表現**
  例:「でもさ、たしかに…」「そう思っていたけど」「やっぱり、ちょっと…」
- **敬意を込めた疑問**:「ほんとうにそうなんですか」「きっと何か理由がありそう」
- **感情移入の兆し**:「もし◯◯の人だったら」「◯◯さんの気持ちになると」
- **保留の言葉**:「まだ決められない」「もう少し考えたい」

alreadyDetected にすでに含まれる term は重複して検出しないでください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## position の取り方

text の文字オフセット(0-indexed, UTF-16)で `start`, `end` を返してください。
`end` は inclusive の次を指す半開区間。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## encouragementJa

児童({{gradeBand}})向けの短い一言を summary.encouragementJa に入れる。
以下の基準で生成:

- count === 0: 「つぎは、立ち止まって考えた ことばを 書いてみよう!」(lower 向け。他学年は文体調整)
- count <= 3:  「◯回、立ち止まって考えられたね」
- count >= 4:  「たくさん立ち止まって考えているね。すごいよ!」

評価や採点のように聞こえないよう、やさしい語り口で。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 禁則

- 児童の書いた内容を評価・採点しない(「上手」「下手」「正しい」「違う」を使わない)
- 立ち止まりが多い=良い、少ない=悪い、のメッセージを出さない(量ではなく**質**を尊重)
- 文中の PII(もし書かれていれば)は返さない

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 入力

### 本文
{{text}}

### すでに検出済みの固定語
{{#each alreadyDetected}}
- {{this.term}} at {{this.positions}}
{{/each}}

### 記述種別
{{kind}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 出力(JSON のみ)

{
  "detections": [
    { "term": "...", "phrase": "...", "position": {"start":0,"end":0}, "category": "...", "confidence": 0.0 }
  ],
  "summary": {
    "count": 0,
    "categoryCounts": { "hesitation": 0, "questioning": 0, "reframing": 0, "self-correction": 0, "empathizing": 0, "uncertainty": 0 },
    "encouragementJa": "..."
  }
}
```

---

## 📊 児童セルフビューでの可視化

画面 20(立ち止まりの言葉セルフビュー)で:

```
┌────────────────────────────────────────┐
│ じぶんの ふりかえりを みてみよう        │
├────────────────────────────────────────┤
│  今週 たちどまって かんがえた ことば    │
│                                        │
│  「でも」 2回                           │
│  「もしかしたら」 1回                   │
│  「〇〇さんの 気もちに なると」 1回     │
│                                        │
│  📝 3じかん目のふりかえり:              │
│  「お店の人は こまっているかも。        │
│   [でも] ベビーカーの人も こまる…」    │
│          ^^^^^                          │
│                                        │
│  "4回、立ち止まって考えられたね"         │
└────────────────────────────────────────┘
```

**児童の自己評価として機能**。成績ではない。

---

## ✅ 評価観点(golden-test)

`tests/prompts/standstill-detection/`:

1. **固定語のカバー率**: ルールベース + LLM で 95% 以上(手動アノテーション基準)
2. **文脈依存表現の拾い率**: 50% 以上(LLM の追加価値)
3. **PII 検出なし**: 児童が書いた個人名を返さない
4. **encouragement の学年適合**: lower で漢字が含まれない
5. **position の精度**: start/end が text のスライスで元の phrase に一致

---

## ⚠️ 既知の失敗パターンと対策

| 失敗 | 対策 |
|------|------|
| 「でも」を助詞的用法(「でも行く」の一部)まで拾う | 前後文字判定をルールで、LLM にも文脈確認を指示 |
| 感情移入の表現が拾えない | カテゴリ例を明示、golden-test で拡充 |
| 児童が立ち止まり語を**狙って**書くと数だけ増える | 教員ダッシュボードで「質的」読解を併置、量だけで評価しない運用 |
| Claude がカウントを水増しする | ルールベース検出結果を先に渡し、重複禁止を強制 |

---

## 🔗 関連ドキュメント

- [../12-research-methods.md](../12-research-methods.md) — 量的指標としての使い方、ウィルコクソン
- [../02-data-model.md](../02-data-model.md) — `ReflectionEntry.standstillWords`
- [co-occurrence-summary.md](co-occurrence-summary.md) — 立ち止まり語と共起する語の分析
