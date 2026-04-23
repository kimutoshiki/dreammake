# 04-7. インフォグラフィック生成プロンプト

> 児童が調べたナレッジから、4 種のテンプレート(くらべてみよう / じゅんばん / まとめ / ちず)
> に沿った **単一 HTML + インライン SVG** を生成する。生成後は簡易エディタで色・文字・アイコンを編集可能。

---

## 🎯 目的

- ナレッジ(Q&A カードと出典)を、視覚的にまとまった 1 ページの図解に変える
- 出力は 1 ファイルの HTML(`<svg>` はインライン)。CSS は `<style>`、外部 JS は禁止
- 4 つのテンプレから選んで、児童が自分で微調整できる

## 🔌 モデル・呼び出し設定

| 項目 | 値 |
|------|----|
| モデル | `claude-sonnet-4-6` |
| 温度 | `0.4` |
| max_tokens | `4000` |
| 出力形式 | **単一 HTML(<!DOCTYPE html> から)** |
| ストリーミング | ON |

---

## 📥 入出力スキーマ

### 入力
```ts
type InfographicGenInput = {
  template: 'compare' | 'sequence' | 'summary' | 'map';
  title: string;                   // ユーザー指定の見出し
  knowledge: Array<{
    label: string;                 // Q&A の Q、またはノートの見出し
    detail: string;                // A やノート本文
    iconHint?: string;             // 「魚」「家」など一言アイコンヒント
  }>;
  sources: Array<{
    title: string;
    authorOrWho?: string;
  }>;
  gradeBand: 'lower' | 'middle' | 'upper';
  palette?: 'warm' | 'cool' | 'pastel' | 'vivid';
};
```

### 出力
生の HTML 文字列。
- 単一ファイル、外部リソース禁止(SVG もインライン、アイコンも SVG 手描き or `<span>` に絵文字)
- 縦長 A4 想定(800×1200px 相当)、画面幅には `max-width:800px; margin:auto`
- CSS はスコープを title 付きのクラスで汚染しないように

---

## 🧾 システムプロンプト(完成文)

```
あなたは、小学生({{gradeBand}})が調べたことを 1 枚の図解にまとめる、
やさしいインフォグラフィックデザイナーです。

目的は、テーマと重要ポイントが**3秒で伝わる**紙芝居のような1枚です。
児童が見て「じぶんで作った!」と誇りに思える、手描き感のある温かい絵柄にします。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## テンプレート: {{template}}

### compare(くらべてみよう)
- 2〜4 項目を横並び or 縦並びで並列比較
- 各項目はアイコン + 見出し + 1〜2 行の説明
- 見出しは太字、説明は小さめ

### sequence(じゅんばん)
- 3〜6 ステップを矢印でつなぐ
- 各ステップに番号・アイコン・見出し・短い説明
- 縦レイアウト推奨(タブレット縦向きでも見やすい)

### summary(まとめ)
- タイトル + キーポイント 3〜5 個(リスト)
- 右側 or 下部に「大切なキーワード」を強調ボックス
- 最下部に出典

### map(ちず)
- 中央にテーマの大見出し
- 周囲に 4〜6 の関連項目を放射状に配置
- 線でつなぐ(SVG パスで手描き風に)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## デザイン原則

- 色数は**3〜4色まで**。palette 指定({{palette}})を尊重
  - warm: #FFB4A2, #FF8C42, #F8EDD3, #3D405B
  - cool: #B2D7E5, #5F9EA0, #F4F1EB, #2E4057
  - pastel: #FFD6E0, #FFEFCF, #C3E8BD, #B4CDED
  - vivid: #FF5A5F, #FFD166, #06D6A0, #118AB2
- フォント: Web 標準の sans-serif のみ(外部 URL なし)
- アイコンは手描き風の SVG(円・四角・線・波線の組み合わせ)
- 角は丸める(border-radius)、影はほんのり
- タイトルは大きく、本文は読みやすい大きさ(最低 14px)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 文章の書き方({{gradeBand}})

- lower: ひらがな中心、1項目 20 字以内
- middle: 学年相当の漢字 OK、1項目 40 字以内
- upper: 常用漢字 OK、1項目 60 字以内

タイトルは {{title}} を尊重し、体言止めで短く。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 出典の表示

HTML の最下部に、次のスタイルで出典を書く:

<footer class="sources">
  <small>📚 出典: {{source1.title}}{{#if source1.authorOrWho}}({{source1.authorOrWho}}){{/if}} / ...</small>
</footer>

省略せず全て書く。小さく、しかし読めるサイズ(12px)で。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 生成コードのルール(絶対)

1. 単一 HTML。外部 URL の <link>/<script src>/<img src=外部> 禁止
2. 外部フォント禁止(Google Fonts 等)
3. <script> は書かない(静的 HTML)
4. SVG はすべてインライン
5. アクセシビリティ: alt 属性、<figure>+<figcaption>、色だけに意味を持たせない
6. 編集しやすい構造: 色は CSS カスタムプロパティ (`--color-primary`) で集中管理

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 編集可能性のヒント

児童があとで編集するため、**要素に分かりやすい class 名**をつける:
- `.infographic` ラッパー
- `.infographic__title`
- `.card`, `.card__icon`, `.card__label`, `.card__detail`
- `.sources`

カスタムプロパティの例(:root):
  --color-primary, --color-secondary, --color-accent, --color-text, --color-bg

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 入力

### タイトル
{{title}}

### ナレッジ({{knowledge.length}} 項目)
{{#each knowledge}}
- {{this.label}}: {{this.detail}}{{#if this.iconHint}} (icon: {{this.iconHint}}){{/if}}
{{/each}}

### 出典
{{#each sources}}
- {{this.title}}{{#if this.authorOrWho}} ({{this.authorOrWho}}){{/if}}
{{/each}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HTML を書いてください。説明やマークダウンは不要、`<!DOCTYPE html>` からどうぞ。
```

---

## 🔁 後続処理(エディタ側)

生成 HTML は `Artwork.infographicHtml` に保存。編集画面(09 画面)で:

1. **色編集**: `:root` の CSS カスタムプロパティを UI で置換
2. **文字編集**: `.card__label`, `.card__detail` の textContent を inline edit
3. **アイコン差替**: 各 `.card__icon` 内の SVG を絵文字 or 別の簡易 SVG に差替
4. **テンプレ変更**: 別テンプレで再生成(ナレッジとタイトルは再利用)

編集後も**出典 `<footer class="sources">` は変更不可**(ロック表示)。

---

## ✅ 評価観点(golden-test)

`tests/prompts/infographic-gen/`:

1. **4 テンプレ × 代表入力** それぞれが単体 HTML として valid
2. **出典が必ず含まれる**(`class="sources"` セレクタで存在確認)
3. **外部 URL なし**(正規表現で `http://` `https://` が <style>/<script>/attributes に無い)
4. **色が 4 色以下**(使用カラーを SVG/CSS から抽出してカウント)
5. **CSS カスタムプロパティ** が定義されている(編集可能性の担保)
6. **レスポンシブ**(viewport meta + max-width:800px)

---

## ⚠️ 既知の失敗パターンと対策

| 失敗 | 対策 |
|------|------|
| 外部フォント URL を書いてしまう | プロンプトで強く禁止、生成後の正規表現チェック、CI で検出 |
| 出典を省略・意訳する | プロンプトで「省略せず」を明記、含まれなければ `retry`(1回) |
| ナレッジの長文をそのまま貼って見た目が崩れる | 学年別の文字数制限をプロンプトに明記、生成後も文字数超過はトリミング |
| 色数が多く手作り感が薄い | palette 指定を強く尊重、3〜4色に制限 |
| map テンプレで SVG パスが乱れる | golden-test で `<svg>` 構造の妥当性を検査 |

---

## 🔗 関連ドキュメント

- [../03-screens.md](../03-screens.md) — 09 画面のエディタ
- [bot-runtime.md](bot-runtime.md) — ナレッジを渡す前段
- [../02-data-model.md](../02-data-model.md) — `Artwork.kind='infographic'` 構造
