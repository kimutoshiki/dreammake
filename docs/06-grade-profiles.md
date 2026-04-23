# 06. 学年プロファイル設計(全学年対応の要)

> 小学 1〜6 年までを **同一アプリ・同一スキーマ**で動かしながら、
> UI コピー・ふりがな・音声・文字量・テンプレートを切替える仕組み。

---

## 🎯 設計方針

1. **3 つの帯で正規化**: `lower (1-2)` / `middle (3-4)` / `upper (5-6)` に集約。個別学年の微調整は `overrides`(JSON)で
2. **プロファイルは User 単位で保持**: ただし教員がクラス既定を指定可能
3. **会話開始時にスナップショット**: 対話中にプロファイルが変わっても会話が壊れない
4. **切替は UX 上軽く**: 教員が「保護観察モード」として一時変更もできる

---

## 📦 データ構造(再掲)

```prisma
model GradeProfile {
  id            String  @id @default(cuid())
  band          String  // 'lower' | 'middle' | 'upper'
  gradeYear     Int?    // 1..6(UI 表示用)
  furiganaMode  String  // 'all' | 'above-grade' | 'uncommon-only' | 'off'
  voiceFirst    Boolean @default(false)
  maxQaChars    Int
  overrides     String  @default("{}")  // JSON: 個別調整
  user          User?
}
```

---

## 🪟 3 帯の差分(パラメータ表)

| 項目 | `lower` (1-2年) | `middle` (3-4年) | `upper` (5-6年) |
|------|-----------------|------------------|-----------------|
| **ふりがな** | すべての漢字に | 学年超過漢字のみ | 常用外のみ |
| **音声優先** | ✅ ON(🎤 ボタン大) | OFF(併設のみ) | OFF(併設のみ) |
| **Q&A カード文字数上限** | 60字 | 200字 | 500字 |
| **対話応答の max_tokens** | 200 | 500 | 800 |
| **1文あたりの目安** | 15〜20字 | 30字以内 | 40字以内 |
| **絵文字** | 1〜2個/応答 | 控えめ | ほぼ不要 |
| **UI 文字サイズ** | 20px base | 17px base | 16px base |
| **ボタンサイズ** | 最小 56px | 最小 48px | 最小 44px |
| **入力モデレーション閾値** | やや厳しめ(soft-flag を拾う) | 標準 | 標準 |
| **読み上げボタン** | 常設・大きめ | 常設・標準 | 常設・小さめ |
| **標準テンプレート(ボット作成)** | 「わたしの おきにいり」 | 「メダカのひみつ」 | 「地域の歴史」 |
| **つくってみようモード** | 使用不可(Phase 4 で再評価) | 制限あり(ブロックエディタ優先) | フル機能 |
| **画像生成** | 要保護者同意 + 教員事前承認 | 要保護者同意 | 要保護者同意 |

---

## 🌐 UI コピー辞書

`copy/{lower,middle,upper}.json` で管理。キー命名規則は `section.screen.element`。

### `copy/lower.json`(抜粋)
```json
{
  "home.title": "こんにちは、{name}さん",
  "home.cta.newBot": "あたらしい ボットを つくろう",
  "home.cta.plaza": "しらべもの ひろばに いこう",
  "bot.create.step1.prompt": "なにを しらべたかな?",
  "bot.create.step2.prompt": "ボットの なまえは?",
  "chat.placeholder": "ここに きいてみよう",
  "chat.unknownFallback": "それは まだ しらべていないよ、いっしょに しらべよう!",
  "ai.disclaimer": "AI は まちがえる ことが あるよ",
  "break.title": "ちょっと やすもう",
  "break.body": "みずを のんで、あたまを やすめてね",
  "auth.login.schoolLabel": "がっこうを えらんで",
  "auth.login.idLabel": "じぶんの IDを いれて",
  "auth.login.emojiLabel": "あいことばの えを えらんで",
  "moderation.blocked": "その ことばは せんせいや おうちの ひとに はなしてみてね"
}
```

### `copy/middle.json`(抜粋)
```json
{
  "home.title": "こんにちは、{name}さん",
  "home.cta.newBot": "あたらしいボットをつくろう",
  "home.cta.plaza": "しらべもの広場へ",
  "bot.create.step1.prompt": "どんなことを調べたかな?",
  "bot.create.step2.prompt": "ボットの名前は?",
  "chat.placeholder": "ここに きいてみよう",
  "chat.unknownFallback": "それはまだ調べていないよ、いっしょに調べてみよう!",
  "ai.disclaimer": "AI はまちがえることがあるよ",
  "break.title": "ちょっと休憩しよう",
  "break.body": "水をのんで、目を休めてから続けようね",
  "auth.login.schoolLabel": "学校をえらぼう",
  "auth.login.idLabel": "じぶんの ID をいれてね",
  "auth.login.emojiLabel": "あいことばの絵をえらんでね",
  "moderation.blocked": "そのことばは先生やおうちの人に相談してみてね"
}
```

### `copy/upper.json`(抜粋)
```json
{
  "home.title": "おつかれさま、{name}さん",
  "home.cta.newBot": "新しいボットを作る",
  "home.cta.plaza": "しらべもの広場",
  "bot.create.step1.prompt": "どんなテーマを調べた?",
  "bot.create.step2.prompt": "ボットの名前をつけよう",
  "chat.placeholder": "質問を入力",
  "chat.unknownFallback": "それはまだ調べていないよ。いっしょに調べてみよう!",
  "ai.disclaimer": "⚠️ AI の答えは間違えることがあります",
  "break.title": "休憩しよう",
  "break.body": "水を飲んで、目を休めてから続けよう",
  "auth.login.schoolLabel": "学校",
  "auth.login.idLabel": "ID",
  "auth.login.emojiLabel": "あいことば(絵)",
  "moderation.blocked": "その言葉は先生や家族に相談してみよう"
}
```

### 読み込み
`lib/grade/copy.ts` で `useCopy(band, key, params)` のフックを提供。未定義キーは `middle` をフォールバック。

---

## 🔤 ふりがな実装

### `furiganaMode` の値
- `all`: すべての漢字にふりがな(lower 既定)
- `above-grade`: 学年配当漢字を超える漢字のみ(middle 既定)
  - 児童の `gradeProfile.gradeYear` に応じて学年配当表から動的に判定
- `uncommon-only`: 常用漢字表外のみ(upper 既定)
- `off`: 全部なし(切替可能)

### 実装方式
- サーバーサイドで React コンポーネント描画時に `lib/grade/furigana.ts` で `<ruby>` 変換
- 日本語形態素解析は **kuromoji.js** を Web Worker で実行(MIT、辞書を public/dict/ に置く)
- パフォーマンス: 初回ロードで 5MB の辞書 → PWA キャッシュで 2 回目以降は即時
- 代替: シンプルなケースは辞書マッチのみ(kuromoji の完全版は upper 以外では不要)

### マークアップ例
```html
<ruby>調<rt>しら</rt></ruby>べる
```

`furiganaMode='off'` のときは単純な `<span>調べる</span>`。

### 制御可能なテキスト範囲
- 画面上のすべての本文(Bot 応答、Q&A カード、UI コピー辞書)
- ユーザーの入力は変換しない(本人がどう書いたかは残す)

---

## 🗣️ 音声の扱い

### 音声入力(Web Speech API `SpeechRecognition`)
- `lower`: 🎤 ボタンが主要、テキスト入力は副
- `middle` / `upper`: 🎤 ボタン併設

対応ブラウザ:
- iOS Safari 14.5+ ✅
- Chrome for Android ✅
- Chrome 33+ ✅
- Firefox は `webkitSpeechRecognition` 非対応 → フォールバックで「ブラウザを変えてね」案内

### 音声読み上げ(Web Speech API `SpeechSynthesis`)
- 全学年で本文に 🔊 併設
- 読み上げ速度: lower 0.9、middle 1.0、upper 1.0(ユーザーで 0.7〜1.5 に調整可)
- 声: 日本語既定。iOS の `Kyoko` 等を自動選択

### 録音データ
- **サーバーに送らない**。音声はローカルで即、テキストに変換される
- 変換結果のみをサーバー送信(モデレーションはこのテキストに対して走る)

---

## 🎨 UI テーマ差分

### 色調
- `lower`: 高彩度・パステル混在(視認性優先)
- `middle`: パステル中心(落ち着き)
- `upper`: ニュートラル中心、アクセントカラー少量(高学年は大人っぽさも尊重)

### フォント
- 基本: 日本語 sans-serif(ヒラギノ角ゴ / Noto Sans JP)
- `lower` は丸ゴシック寄り(`UD デジタル教科書体`、ライセンス要確認)
- `middle/upper` はシステムフォントで可

### モーション
- `lower`: ボタン押下時に大きめアニメーション(弾む感じ)
- `middle`: 標準
- `upper`: 控えめ
- `prefers-reduced-motion` を尊重

---

## 🧩 コンポーネント実装指針

```tsx
// components/kids/KidButton.tsx(例)
import { useGradeProfile } from '@/lib/grade/profile';

export function KidButton({ children, ...props }) {
  const { band } = useGradeProfile();
  const sizeClass = band === 'lower' ? 'min-h-[56px] text-xl' :
                    band === 'middle' ? 'min-h-[48px] text-lg' :
                                        'min-h-[44px] text-base';
  return <button className={`${sizeClass} rounded-2xl`} {...props}>{children}</button>;
}
```

- UI プリミティブは `components/kids/` に集約
- 非プリミティブ(ドメイン特化コンポーネント)は band を受け取らず、内部で hook 利用

---

## 🛠️ 教員によるプロファイル操作

| 操作 | 権限 |
|------|------|
| クラス既定 band を設定 | 教員 |
| 児童個別の band を変更 | 教員(monthly log 残る) |
| 児童本人が band を変更 | **不可**(教員許可が必要) |
| `furiganaMode` の児童による切替 | 可能(教員設定で無効化も可) |
| 音声 ON/OFF の児童による切替 | 可能 |

---

## 📱 レイアウト・ブレイクポイント

| デバイス | 想定 | レイアウト |
|---------|------|----------|
| iPad / Chromebook 縦 | 授業での標準 | メインカラム 720px、左右余白 |
| iPad / Chromebook 横 | 2カラム表示(対話+ナレッジ参照) | lower は常に1カラム、middle+ は 2カラム |
| スマホ 縦 | 家庭学習 | 1カラム、下部ナビゲーション固定 |
| PC 1280px+ | 教員ダッシュボード優先 | 児童 UI は中央寄せ max-width 1024px |

---

## ✅ 評価観点

- E2E テスト: `lower` ログイン → ボット作成 → 対話 → 全文にふりがな rt が付く
- ユニット: `getFurigana("調べる", { gradeYear: 2 })` が `[{text:"調", ruby:"しら"}, {text:"べる"}]` を返す
- スナップショット: `copy/*.json` の 3 帯 × 主要キー 30 件 が欠けていない

---

## 🔗 関連ドキュメント

- [03-screens.md](03-screens.md) — 画面別の学年差分
- [04-prompts/bot-runtime.md](04-prompts/bot-runtime.md) — LLM 側のトーン切替
- [01-architecture.md](01-architecture.md) — `lib/grade/` のディレクトリ
