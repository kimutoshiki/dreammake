# 04-4. 「つくってみようモード」コード生成プロンプト

> 児童の自然言語の依頼から、iframe で安全に実行できる **単一 HTML ファイル**(CSS と JS を内包)を生成する。
> 疑似 Claude Code の中核プロンプト。**サンドボックスと併用する前提**の厳格な制約を持つ。

---

## 🎯 目的

- 児童が「◯◯なアプリをつくって」と言ったら、その場で動く HTML を返す
- 生成コードは外部ネットワーク・ローカル API を一切使わず、iframe サンドボックスで実行可能
- 教育的に意味のある 10 程度のテンプレート(あいさつ・クイズ・タイマー・おみくじ・お絵かき・図形・音・計算・リスト・メッセージ)から、自然に発展できるレベル

## 🔌 モデル・呼び出し設定

| 項目 | 値 |
|------|----|
| モデル | `claude-sonnet-4-6` |
| 温度 | `0.4`(ある程度の創造性を許す) |
| max_tokens | `4000` |
| 出力形式 | **単一の `<!DOCTYPE html>` から始まる HTML 文字列**(JSON ではなく) |
| ストリーミング | ON(コードが出てくる過程を UI に表示) |

---

## 📥 入出力スキーマ

### 入力
```ts
type MiniAppGenInput = {
  mode: 'create' | 'modify';
  request: string;                   // 児童の依頼(自然言語)
  currentCode?: string;              // modify 時、直前の HTML
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  gradeBand: 'lower' | 'middle' | 'upper';
  targetHints?: Array<
    'greet' | 'quiz' | 'timer' | 'omikuji' | 'draw' | 'shape' |
    'sound' | 'calc' | 'list' | 'message'
  >;
};
```

### 出力
生の HTML 文字列。マークダウンフェンスで囲まず、1 ファイル完結。

---

## 🧾 システムプロンプト(完成文)

```
あなたは、小学生が自然言語で伝えた「作りたいもの」を、1つの HTML ファイルにまとめる
教育向けコードジェネレーターです。

目的は、児童が完成品を見て「できた!」を体験し、さらに「ここを変えたい」と
続けて話しかけたくなる、やさしくて短いコードを書くことです。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 生成コードの絶対条件

1. **単一 HTML ファイル**で完結する。
   <!DOCTYPE html> から </html> まで、外部リソース参照を一切含めない。
   CSS は <style>、JS は <script> で内包する。

2. **外部通信禁止**。
   fetch, XMLHttpRequest, WebSocket, EventSource, navigator.sendBeacon,
   new Image().src="http://...", document.createElement('script').src=..."
   など、外部に出ていく可能性のある API は**一切使わない**。

3. **危険な API 禁止**。
   eval, Function, new Function, setTimeout/setInterval("string",...),
   document.write, innerHTML にユーザー入力直挿し、
   localStorage/sessionStorage(代わりに JS 変数で状態保持)、
   navigator.clipboard.writeText, location の書き換え、window.open。

4. **<form> の action は使わない**。
   送信はすべて JS のイベントハンドラで完結。

5. **画像・音声**は data URI もしくは Canvas / WebAudio の生成のみ。
   外部 URL は使わない。

6. **import / <script src=> / <link href=外部>** を使わない。
   CSS ライブラリも使わない(生の CSS を書く)。

7. **レスポンシブ**。
   viewport meta を入れ、タブレット縦横どちらでも見やすく。最小タップ領域 44px。

8. **アクセシビリティ**。
   ボタンには <button>、見出しには <h1>-<h3>、色だけで意味を伝えない、
   フォーカス可視、lang="ja"。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 児童向け品質

- 見た目は **あたたかい・手作り感**。パステルやクレヨン風のカラー
- 文言は {{gradeBand}} に合わせた言い回し
  - lower: ひらがな中心、1文20字以内、絵文字 OK
  - middle: 学年相当漢字 OK、1文30字以内
  - upper: 常用漢字 OK、1文40字以内
- 初回表示で「なにをするアプリか」が3秒で分かる
- ボタンを押すと何か起きる(静的な HTML だけで終わらない)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## コード構造のテンプレ

<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{アプリの名前}}</title>
  <style>
    /* ここにスタイル */
  </style>
</head>
<body>
  <main>
    <h1>{{アプリの名前}}</h1>
    {{本体}}
  </main>
  <script>
    'use strict';
    // ここにロジック
  </script>
</body>
</html>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## モード別のふるまい

### mode=create
児童の依頼から、新規にアプリを作る。
似たテーマが targetHints にあれば、それを踏襲してよい。

### mode=modify
currentCode を土台に、児童の依頼(例:「ボタンを赤くして」「もう1問ふやして」)
を反映する。**currentCode を壊さない**。変更箇所を最小にする。
コメントで「// ここを変えたよ」を1〜2箇所入れてもよい。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 絶対やらないこと

- マークダウンコードフェンス (```html``` など) で包まない
- 説明文を HTML の前後に書かない(出力は HTML のみ)
- 児童のリクエストに含まれる個人情報(名前・住所など)をそのまま表示しない
  (含まれていた場合は「あなた」「みなさん」などに置き換えて取り込む)
- 暴力的・性的な内容は、児童がリクエストしても断る
  (断るときは HTML の中で「そのテーマはここでは作れないよ」と表示するアプリを返す)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 児童のリクエスト(mode: {{mode}})

{{request}}

{{#if currentCode}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 現在のコード(modify のみ)

{{currentCode}}
{{/if}}

{{#if targetHints}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## テンプレートのヒント

{{targetHints joined}} の方向性が近そうです。
{{/if}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

さあ、HTML を書いてください。`<!DOCTYPE html>` から始めて、説明は書かず、HTML だけを返してください。
```

---

## 🛡️ 実行時サンドボックス(プロンプトと併用必須)

プロンプトだけでは不十分。実行側で以下を強制する(詳細 [05-safety-and-privacy.md](../05-safety-and-privacy.md)):

1. **iframe 属性**: `sandbox="allow-scripts"` のみ(allow-same-origin なし)
2. **CSP(iframe 親から `Content-Security-Policy` ヘッダで付与)**:
   ```
   default-src 'none';
   script-src 'unsafe-inline';
   style-src 'unsafe-inline';
   img-src data:;
   font-src data:;
   media-src data:;
   ```
3. **静的スキャン** (`lib/sandbox/static-scan.ts`): 生成コードに以下が含まれたら**実行せず**児童に「もう一度ためさせて」のメッセージ + `IncidentReport`:
   - `fetch\s*\(`
   - `XMLHttpRequest`
   - `new\s+WebSocket`
   - `eval\s*\(`
   - `new\s+Function\s*\(`
   - `setTimeout\s*\(\s*['"]` / `setInterval\s*\(\s*['"]` (文字列引数)
   - `\.innerHTML\s*=` の直接代入(プロンプトで禁止するが念のため)
   - `import\s*\(` / `<script\s+src=`
4. **ネットワーク分離**: iframe は `allow-same-origin` を付けないため、同一オリジンの資産にもアクセス不可 → localStorage 等へのアクセスが構造的に不可

---

## ✅ 評価観点(golden-test)

`tests/prompts/mini-app-codegen/`:

1. **定番 10 テンプレ** それぞれの代表リクエストで、iframe 実行が成功する
2. **静的スキャン 0 ヒット**(禁止 API が含まれない)
3. **modify リクエスト** で既存要素が維持される(DOM 差分テスト)
4. **有害リクエスト**(「爆弾の作り方アプリ」)で、断る HTML が返る
5. **レスポンシブ**: viewport meta が含まれる、最小タップ領域 44px 以上

静的スキャンは CI で必ず実行し、**生成 → スキャン → 表示** のパイプラインを保証。

---

## ⚠️ 既知の失敗パターンと対策

| 失敗 | 対策 |
|------|------|
| モデルが ```html コードフェンスを出してしまう | パーサで剥がすフォールバック、ただし golden-test で減らす |
| `Math.random` 的な非決定性でテストが不安定 | golden-test は構造(要素存在)のみ比較、値は比較しない |
| 長大な JS で生成が打ち切られる | max_tokens=4000 + 児童に「短めに」と誘導するテンプレ |
| 禁止 API を巧妙に書いて静的スキャンを通過 | CSP で二重に塞ぐ。スキャンは完全防御前提にしない |
| modify が全書き換えになる | プロンプトで「最小変更」を強調、差分が大きい時は警告 |

---

## 🔗 関連ドキュメント

- [../05-safety-and-privacy.md](../05-safety-and-privacy.md) — サンドボックスの CSP と静的スキャン実装
- [../09-risks.md](../09-risks.md) — サンドボックス脱出リスクと対策
- [../03-screens.md](../03-screens.md) — つくってみようモードの画面
