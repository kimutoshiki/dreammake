# しらべてつくろう!AIラボ

「**AIに出てこないのは誰か**」を問い続ける、小学校社会科を主軸にした**探究学習プラットフォーム**。
小学生が「調べる → まとめる → AI に教える → 作品にする → 共有する → さらに深める」探究のサイクルを通じて、他者性への感受性、多面的・多角的な見方、批判的思考を育てます。

> **ひとことで言うと**: 生成AIが多数派の声を返しやすい性質**そのものを教材化**し、
> 子どもが「AI に出てこないのは誰か」を問うことで、立場選定の基準を自分で吟味する学びを作る場所。

> 社会科を主軸に、国語の論述、図工の表現、音楽の創造、総合的な学習の探究、
> プログラミング教育との**教科等横断**を自然に接続します。

---

## 🧭 ステータス: Phase 1(コア実装)

以下が**動きます**:

- 児童・教員認証(児童は学校コード + ID + 絵柄パスワード、教員はメール + パスワード)
- ボット作成・ナレッジ/出典登録・Claude Sonnet との対話(SSE ストリーム)
- 多層モデレーション(ルール + Claude Haiku)+ 出典機械付与
- 探究単元(中単元)の設計・公開、時数と AI 挿入タイミング3点の配置
- **「声が聞こえていないのはだれ?」**機能(AI の応答の偏りを教材化)
- 立ち止まりの言葉(「でも」「なぜ」「別の見方をすれば」など)の自動検出とセルフビュー
- 立場マップ(児童の立場記録・クラスの分布)
- 事前/事後アンケート(3 軸 = 初期立場・多数派集中度・違う考えへの意識)
- 教員ダッシュボード(ふりかえり一覧・声の仮説・立場分布・アンケート結果)

**次フェーズ候補** は [docs/10-phases.md](docs/10-phases.md) を参照:画像/動画/音楽/クイズ生成、
Wilcoxon 符号順位検定、共起分析、エピソード記述抽出、つくってみようモード など。

### 設計ドキュメント(全量は `/docs`)

- 📘 [設計ドキュメント目次](docs/README.md)
- 🗺️ [プロジェクト概要・ビジョン](docs/00-overview.md)
- 🏗️ [アーキテクチャと技術スタック](docs/01-architecture.md)
- 🗄️ [データモデル(Prisma schema)](docs/02-data-model.md)
- 🖼️ [画面遷移と画面別設計](docs/03-screens.md)
- 🤖 [Claude API プロンプト設計書](docs/04-prompts/)
- 🛡️ [安全性とプライバシー設計](docs/05-safety-and-privacy.md)
- 👦 [全学年対応の学年プロファイル設計](docs/06-grade-profiles.md)
- 🔐 [認証設計(絵柄パスワード)](docs/07-auth.md)
- 🧩 [API 抽象化レイヤ](docs/08-api-abstractions.md)
- ⚠️ [リスク一覧と対策](docs/09-risks.md)
- 📅 [フェーズ計画](docs/10-phases.md)
- 🧭 [教科等横断の設計原理](docs/11-cross-curricular.md)
- 🔬 [研究方法論の実装(実習Ⅱ・Ⅲ)](docs/12-research-methods.md)

---

## ✨ 主な機能

### 児童向け
- **マイチャットボット**: 調べたことを Q&A カードに登録、自分だけの AI 先生を育てる(出典必須)
- **立場マップ**: 単元で出てきた立場を可視化、少数派も大きく残す
- **「AIに出てこないのは誰?」**: AI の応答を批判的に見直す。このアプリ固有の中核機能
- **立ち止まりの言葉セルフビュー**: 自分の「でも/なぜ/別の見方をすれば」を可視化
- **表現**: 画像、インフォグラフィック、動画(スライド+TTS+BGM)、音楽(BGM 生成)、クイズ
- **つくってみようモード**: 自然言語で立場当てクイズなどの簡単な Web アプリを作る(サンドボックス分離)
- **全学年対応**: 1〜2年(イラスト+音声中心)/ 3〜4年(ふりがな全漢字)/ 5〜6年(プログラミング教育接続)

### 教員向け
- **単元設計ウィザード**: 10〜15 時間の中単元、AI 挿入ポイント3 点(before-self / after-self / ask-missing)の配置
- **事前事後アンケート**: 実習Ⅱの 3 軸(最初の立場 / 多数派集中度 / 違う考えへの意識)を AI 生成・教員編集
- **共起分析ビュー**: 児童の語彙の変化を KH Coder 風に可視化
- **エピソード記述レビュー**: AI 抽出候補を教員が編集・承認、研究発表の下書きに
- **Wilcoxon 符号順位検定**: 事前事後の量的比較、解釈の cautions 付き
- **研究倫理ワークフロー**: 同意・匿名化・対話ログ返却

---

## 🧱 技術スタック

| レイヤ | 技術 | 備考 |
|------|------|------|
| フロントエンド | Next.js 14 (App Router) + TypeScript (strict) | PWA 対応、Vercel 固有機能は不使用 |
| UI | Tailwind CSS + shadcn/ui | タブレットファースト、最小タップ領域 44px |
| バックエンド | Next.js Route Handlers + Zod | |
| DB | **SQLite + Prisma**(ローカル/オンプレ優先) | Postgres へは provider 切替で移行 |
| 認証 | Auth.js (NextAuth v5) | 児童=絵柄パスワード、教員=マジックリンク(保護者ログインなし) |
| LLM | **Anthropic Claude API** | Sonnet 4.6 既定、モデレーションは Haiku 4.5 |
| 画像生成 | Google Gemini (Nano Banana / Imagen) | OpenAI 画像 API をフォールバック |
| 動画合成 | Remotion for Browser + Web Audio | クライアント完結、サーバー送信なし |
| 音楽生成 | Tone.js | ブラウザ内、楽典不要 |
| 形態素解析 | kuromoji.js | ふりがな + 共起分析 |
| ストレージ | ローカル FS → MinIO (S3 互換) | `StorageAdapter` で抽象化 |
| テスト | Vitest(ユニット)+ Playwright(E2E) | |
| 配布 | `docker compose up` で一発起動 | Next.js + MinIO + MailHog + SQLite |

詳細は [docs/01-architecture.md](docs/01-architecture.md) を参照。

---

## 🚀 セットアップと起動

### 前提条件
- Node.js 20.x 以上(動作確認: v24 / v20)
- pnpm 9.x 以上(動作確認: v10.32)

### 手順
```bash
# 1. 依存関係をインストール
pnpm install

# 2. 環境変数を用意
cp .env.example .env.local
# .env.local を開いて ANTHROPIC_API_KEY を設定(未設定でもモック応答で動きます)
# AUTH_SECRET も設定推奨: openssl rand -base64 32

# 3. DB を初期化 & デモデータ投入
pnpm prisma migrate dev
pnpm db:seed

# 4. 開発サーバーを起動
pnpm dev
# → http://localhost:3000
```

### ⭐ デモフロー(動作確認の順序)

1. `http://localhost:3000/` を開く
2. **先生として入る**: `teacher@demo.local` / `teacher-demo`
   - ダッシュボードから「わたしたちの町の昔と今」を開く
   - 時数・立場・AI 挿入ポイント(before-self / after-self / ask-missing)を確認
   - 「既定テンプレで作成」で事前/事後アンケートを用意
   - 単元の状態を「公開中」に(シード済みなので最初から公開中)
3. **ログアウト**して**児童として入る**:
   - 学校コード `demo-school`
   - 自分の ID `s-4-01-001`(みさき)
   - 絵柄 🐟 🌸 🍎
4. 児童ホーム → 「わたしたちの町の昔と今」単元を開く
5. **「🔍 声が聞こえていないのはだれ?」** をタップ(**本アプリの中核機能**)
   - AI が自己診断した「強く出ていた立場」と「出ていなかったかもしれない立場」を表示
   - 児童が仮説を書いてクラスに共有
6. **「✍️ ふりかえりを書く」**
   - 書きながら「でも」「なぜ」「もしかしたら」などの立ち止まりの言葉を**自動ハイライト**
   - 1児童あたりの累積「立ち止まりメーター」が単元トップに反映
7. **「🗺️ 立場マップ」** で自分の立場を記録、クラスの分布を見る
8. **「📋 事前アンケート」** に回答(3軸の測定)
9. **「🤖 町はかせ」** ボットと対話(ナレッジ制約 + 出典自動付与 + 入力モデレーション)
10. 先生としてログインし直して、**「📝 児童のふりかえり」「🔍 声の仮説」「🗺️ 立場マップ」「📋 事前/事後結果」**を閲覧

> **Anthropic API キーを設定していない場合**: LLM 呼び出しはモック応答を返します。
> UI 動作の確認は一通りできますが、実運用では `.env.local` に `ANTHROPIC_API_KEY` を設定してください。

### 開発コマンド

| コマンド | 用途 |
|---------|------|
| `pnpm dev` | 開発サーバー |
| `pnpm build` | 本番ビルド |
| `pnpm typecheck` | 型チェック(strict) |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm db:migrate` | マイグレーション |
| `pnpm db:seed` | デモデータ投入 |
| `pnpm db:reset` | DB を初期化して入れ直し |
| `pnpm db:studio` | Prisma Studio(GUI で DB を確認) |

---

## 🔑 環境変数

すべて [`.env.example`](.env.example) にテンプレートと説明があります。

**最低限設定が必要なもの(Phase 1 時点):**
- `ANTHROPIC_API_KEY` — Claude API キー
- `AUTH_SECRET` — `openssl rand -base64 32` で生成
- `DATABASE_URL` — SQLite なら `file:./dev.db` のまま

**Phase 2 以降で必要:**
- `RESEARCH_ANONYMOUS_ID_PEPPER` — 匿名 ID 生成用
- `GOOGLE_API_KEY` — 画像生成(Gemini)用

---

## 🛡️ 安全性と教育的配慮

- 全てのユーザー入力・AI 応答に対する**多層モデレーション**(Claude Haiku + ルール)
- ナレッジに無いことは AI が断定しない(`「それはまだ調べていないよ、いっしょに調べてみよう!」`)
- 応答末尾に**出典を機械的に付与**
- 本名不要・顔写真は自動ぼかし既定 ON
- 「つくってみようモード」のコードは iframe サンドボックス + CSP + ネットワーク遮断
- 連続使用時間の休憩警告、1日の LLM 呼び出し上限
- **保護者用ログインは提供しない**(同意は教員経由で記録)
- **研究参加は独立した同意**(`ConsentRecord(kind='research-participation')`)

詳細は [docs/05-safety-and-privacy.md](docs/05-safety-and-privacy.md) を参照。

---

## 📂 ディレクトリ構成(予定)

```
dreammake/
├── README.md                    ← このファイル
├── .env.example                 ← 環境変数テンプレ
├── docs/                        ← 設計ドキュメント
│   ├── README.md               ← 目次
│   ├── 00-overview.md
│   ├── 01-architecture.md
│   ├── 02-data-model.md
│   ├── 03-screens.md
│   ├── 04-prompts/              ← Claude API プロンプト設計(13本)
│   ├── 05-safety-and-privacy.md
│   ├── 06-grade-profiles.md
│   ├── 07-auth.md
│   ├── 08-api-abstractions.md
│   ├── 09-risks.md
│   ├── 10-phases.md
│   ├── 11-cross-curricular.md   ← 教科等横断の設計原理
│   └── 12-research-methods.md   ← 実習Ⅱ・Ⅲの実装
├── app/                         ← Next.js App Router(Phase 1〜)
├── components/                  ← UI コンポーネント
├── lib/
│   ├── llm/                     ← Anthropic アダプタ
│   ├── image/                   ← Gemini / OpenAI アダプタ
│   ├── video/                   ← 動画合成(Phase 3)
│   ├── music/                   ← 簡易作曲(Phase 3)
│   ├── research/                ← 単元・立場・立ち止まり・共起・統計(Phase 2〜4)
│   ├── grade/                   ← 学年プロファイル
│   ├── storage/                 ← Local FS / MinIO アダプタ
│   ├── auth/                    ← 絵柄パスワード / マジックリンク
│   ├── moderation/              ← 入力/出力モデレーション
│   └── sandbox/                 ← つくってみようモードの隔離(Phase 5)
├── prisma/
│   └── schema.prisma
├── public/
│   ├── emoji/                   ← 絵柄パスワード用画像
│   └── dict/                    ← kuromoji 辞書
├── tests/
│   ├── unit/                    ← Vitest
│   ├── e2e/                     ← Playwright
│   └── prompts/                 ← golden-test
└── docker-compose.yml
```

---

## 🗺️ ロードマップ

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase 0 | 設計ドキュメント整備 | ✅ 完了 |
| **Phase 1** | **コア MVP(認証・ボット・対話・モデレーション)** | ✅ **動作中** |
| **Phase 2(先取り実装)** | **Unit・立場マップ・声が聞こえていないのは?・立ち止まりの言葉・事前事後アンケート** | ✅ **動作中** |
| Phase 3 | 表現(画像・インフォグラフィック・動画・音楽・クイズ) | ⏳ 未着手 |
| Phase 4 | 教員研究機能(エピソード記述・共起分析・Wilcoxon・PDF 出力) + ポートフォリオ + アクセシビリティ | ⏳ 未着手 |
| Phase 5 | つくってみようモード(疑似 Claude Code) | ⏳ 未着手 |

詳細は [docs/10-phases.md](docs/10-phases.md) を参照。

---

## 📄 ライセンス

(未確定 — 教育利用を前提とした非営利ライセンスを検討中)

---

## 🤝 貢献

現在は Phase 0(設計段階)のため、まず `/docs` を読み、Issue で方針相談をお願いします。
