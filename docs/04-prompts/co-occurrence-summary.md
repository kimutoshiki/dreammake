# 04-11. 共起分析プロンプト(教員向け・KH Coder 風の簡易代替)

> 児童の振り返り記述および対話ログを形態素解析してから、Claude に
> **共起ペアの意味づけ**と**事前事後の変化の要約**をさせる。
> KH Coder のようなネットワーク分析の代替を軽量に実装。

---

## 🎯 目的

- 単元前と単元後で、児童が使う語彙がどう変わったかを教員に提示
- 「立ち止まりの言葉」と共起する語の変化(例: 事前は「でも」+「ムリ」、事後は「でも」+「わかる」)
- 具体的な**エピソード記述**と一緒に読むことで、量と質の両輪で授業を評価

## 🔌 モデル・呼び出し設定

| 項目 | 値 |
|------|----|
| モデル | `claude-sonnet-4-6` |
| 温度 | `0.2` |
| max_tokens | `1500` |
| 出力形式 | JSON 強制 |
| 実行主体 | 教員のみ |
| 実行頻度 | 単元の pre / mid / post で 1 回ずつ |

### 前処理(Claude を呼ぶ前に必ず実行)
- 形態素解析は `kuromoji.js`(既に 06-grade-profiles.md で導入予定)
- ストップワード除去(「する」「ある」「いう」等)
- 単元テーマ用語の統合(「お店/商店/店」→「お店」)
- ユーザー ID は渡さず、発話の束ねだけを Claude に渡す

---

## 📥 入出力スキーマ

### 入力
```ts
type CoOccurrenceInput = {
  unit: {
    id: string;
    title: string;
    themeQuestion: string;
  };
  phase: 'pre' | 'mid' | 'post';
  corpus: 'reflection' | 'chat' | 'mixed';
  /// 形態素解析と頻度集計済みの上位語
  topTerms: Array<{ term: string; count: number; partOfSpeech: string }>;
  /// 共起ペア(window = 1 文)
  pairs: Array<{ a: string; b: string; count: number; jaccard: number }>;
  /// 児童数(群としての代表性の確認用)
  childCount: number;
  /// 前フェーズのスナップショット(pre の場合は null)
  previousSnapshot?: {
    topTerms: Array<{ term: string; count: number }>;
    pairs: Array<{ a: string; b: string; count: number; jaccard: number }>;
  };
};
```

### 出力(JSON)
```ts
type CoOccurrenceOutput = {
  narrative: string;                   // 教員向け全体要約(5〜10行)
  highlightClusters: Array<{           // 注目すべき語のかたまり
    label: string;                     // このかたまりの名前(例:「他者への気づき」)
    terms: string[];                   // 含まれる語
    representativePair: string;        // 代表的共起ペア
    interpretation: string;            // 1〜2行
  }>;
  shiftFromPrevious?: {                 // previousSnapshot がある場合
    newlyEmergent: string[];           // 新しく上位に入った語
    receded: string[];                  // 下位に下がった語
    /// 立ち止まり語(でも/なぜ/別の見方をすれば 等)と共起する語の変化
    standstillCooccurrenceShift: Array<{
      standstillTerm: string;
      before: string[];
      after: string[];
    }>;
  };
  cautions: string[];                   // 読み方の注意(過剰解釈を戒める)
};
```

---

## 🧾 システムプロンプト(完成文)

```
あなたは、児童の言葉の分析を教員が読みやすく整える補助者です。
入力は既に形態素解析・頻度集計・共起計算が済んでいる前処理済みデータです。
あなたの仕事は、数字の羅列を**意味のある語り**に変換することです。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 守るルール

1. 数字を飾らず引用する(上位 X 語のうち Y 語が…)
2. 「成長した」「上達した」のような評価語を使わない
3. 児童の言葉を過剰に解釈しない。見えたものだけを書く
4. 量の変化を因果と結びつけない(「単元のおかげで」は書かない)
5. 読み手(教員)が自分で次の授業判断ができる書き方を目指す

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## narrative の書き方

5〜10 行。単元 `{{unit.title}}` の中心の問い `{{unit.themeQuestion}}` を
念頭に置きつつ、次を述べる:

- {{phase}} フェーズで、どの種類の語(名詞・動詞・形容詞)が上位に集中したか
- 共起ネットワークの中心にある語とその周囲の語の関係
- previousSnapshot があれば、どの語群が前景化し、どの語群が後景化したか
- 立ち止まりの言葉(でも/なぜ/別の見方をすれば)の共起パートナーの変化
- **過剰解釈を戒める注意**(cautions に分けて書いても可)

語調は淡々と。教員が学会発表で引用できる硬さを目指す。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## highlightClusters

共起の強い 3〜5 個のかたまりを、意味のあるラベルでまとめる。
ラベルは教員が読んで「ああ、そういう話題」と分かる短い名詞句。

例:
- 「お店の困りごと」(terms: お店、混雑、商店街、駐車場)
- 「ベビーカーの立場」(terms: ベビーカー、赤ちゃん、通れない、段差)
- 「立ち止まる言葉」(terms: でも、もしかしたら、ほんとに、別の見方)

interpretation は 1〜2 行。**なぜこのかたまりが重要か**を書く。
推測は避け、観察だけに留める。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## shiftFromPrevious

previousSnapshot が与えられた場合のみ記述:

- **newlyEmergent**: 前フェーズに比べ頻度が大きく上がった語(上位入り)
- **receded**: 前フェーズに比べ下がった語(上位から外れた)
- **standstillCooccurrenceShift**:
  立ち止まり語(でも/なぜ/別の見方をすれば/やっぱり/もしかしたら)に対して、
  **何と共起していたか**の変化(before/after の主要語 3〜5 個)

これが最も教員の関心が高い箇所。丁寧に、しかし量的な根拠から外れない範囲で。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## cautions

教員が誤読しそうな点を 2〜4 点、短く。例:
- 「児童数 N={{childCount}} のため、個人の大きな発話が全体分布を左右した可能性がある」
- 「『でも』の増加は、ためらいの増加とは限らない」
- 「mid フェーズは授業形態の違いで語の傾向が偏りやすい」

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 入力データ

### 単元と条件
- タイトル: {{unit.title}}
- 問い: {{unit.themeQuestion}}
- phase: {{phase}}
- corpus: {{corpus}}
- 児童数: {{childCount}}

### 上位語
{{#each topTerms}}
- {{this.term}} ({{this.partOfSpeech}}): {{this.count}}
{{/each}}

### 共起ペア(上位)
{{#each pairs}}
- {{this.a}} × {{this.b}}: count={{this.count}}, jaccard={{this.jaccard}}
{{/each}}

{{#if previousSnapshot}}
### 前フェーズのスナップショット
上位語: {{previousSnapshot.topTerms}}
共起: {{previousSnapshot.pairs}}
{{/if}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 出力(JSON のみ)

{
  "narrative": "...",
  "highlightClusters": [ { "label": "...", "terms": [...], "representativePair": "...", "interpretation": "..." } ],
  "shiftFromPrevious": { "newlyEmergent": [...], "receded": [...], "standstillCooccurrenceShift": [...] },
  "cautions": ["..."]
}
```

---

## 🧪 形態素解析の実装(参考)

```ts
// lib/research/morphology.ts
import kuromoji from 'kuromoji';

export async function tokenize(text: string) {
  const builder = kuromoji.builder({ dicPath: './public/dict' });
  return new Promise<TokenOut[]>((resolve, reject) => {
    builder.build((err, tokenizer) => {
      if (err) return reject(err);
      const tokens = tokenizer.tokenize(text);
      resolve(tokens.map(t => ({
        surface: t.surface_form,
        pos: t.pos,
        basic: t.basic_form,
      })));
    });
  });
}

// lib/research/cooccurrence.ts
export function buildCooccurrence(corpus: string[]): CoOccurrenceInput {
  // 文単位に分割 → 各文から名詞・動詞・形容詞・副詞を抽出
  // ストップワード除去、立場語辞書との照合
  // ペア数え上げ、Jaccard 係数算出
  // 上位 N ペアを返す
}
```

---

## ✅ 評価観点

1. **narrative 中の数値引用の妥当性**: topTerms の頻度、childCount 等を**正しく引用**(golden-test)
2. **cautions の出現**: 必ず 2 件以上
3. **highlightClusters が形態素と整合**: ラベルに含まれる語が topTerms/pairs に実在
4. **shiftFromPrevious**: previousSnapshot が無いときは null、あるときは必須

---

## ⚠️ 既知の失敗パターンと対策

| 失敗 | 対策 |
|------|------|
| Claude が数字を間違える | 入力に具体値を渡す、出力での引用は「上位 X 語のうち Y 個」のような比率主体に |
| 形態素のゆらぎで同じ語が別扱い | 前処理で basic_form 正規化、辞書統合 |
| 児童数が少ないのに大胆な解釈 | cautions 必須化、child count が N<15 なら `trajectorySummary` は控えめに |
| 「成長した」等の評価語 | 禁則、テストで検出 |

---

## 🔗 関連ドキュメント

- [../12-research-methods.md](../12-research-methods.md) — KH Coder 代替の全体設計
- [standstill-detection.md](standstill-detection.md) — 立ち止まり語の検出(入力データの一部)
- [episode-extractor.md](episode-extractor.md) — 質的分析との相補
