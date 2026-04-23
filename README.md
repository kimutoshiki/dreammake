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

### ⭐ 起動後(ログイン不要、児童用と教員用は完全に別ページ)

ログインシステムはありません。選択画面もありません。
児童用と 教員用は **まったく別の URL** で、互いに行き来する UI はありません。
児童ページは 右上のセレクタで みさき / たけし / ゆい の 3 人を切替(Cookie・30 日保存)。

| 用途 | URL |
|------|-----|
| 児童用 iPad で開く | `http://localhost:3000/kids` |
| 先生用 PC で開く | `http://localhost:3000/teacher` |
| `/` を開いた場合 | `/kids` に自動リダイレクト |

### 🎒 児童の ハブ(`/kids`)にある クリエイティブ アプリ(iPad ネイティブ対応)

| アイコン | 名前 | やること | 使う iPad の機能 |
|---------|------|---------|----|
| 📷 | しゃしん | カメラで写真を撮る | 背面カメラ + Canvas キャプチャ |
| 🎥 | どうが | カメラ+マイクで動画を撮る(最大 3 分) | MediaRecorder + getUserMedia |
| 🎙️ | ろくおん + もじおこし | 声を録音し**オンデバイスで文字おこし**(Web Speech)、CSV/クリップボードでスプシへ | MediaRecorder + `webkitSpeechRecognition` |
| 🎨 | **おえかき**(写真トレース対応) | 指や Apple Pencil で描画(筆圧対応)。取材写真を 50% 透過で敷いて注釈も可 | Pointer Events + Canvas(touch-action:none) |
| 🧩 | クイズをつくる | ノーコードで出題・選択肢・正解を並べ、**その場で試し遊び** | React state マシン、条件分岐の体験 |
| 🖼️ | **AI に絵をかいてもらう** | 日本語で書いた内容を Claude Haiku が安全化+英訳 → **Gemini (Imagen 3)** で生成 → 保存 | Claude API + `@google/genai` |
| 📒 | **記録ノート** | 取材・観察した写真 / 録音(+文字起こし)/ お絵かき / テキストを 1 枚のカードに束ね、**ボタン 1 つで先生の Google ドキュメントに書き出し** | `/kids/notebook` + Apps Script |
| 🎵 | **おんがくをつくる** | 8 ステップ × 4 ドラム + ペンタトニック メロディで 2 小節の曲、**Tone.Offline で WAV 書き出し** | Tone.js + WAV エンコーダ |
| 🗓️ | **わたしの学びジャーニー** | 1 週間 / 1 ヶ月 / ぜんぶ の活動を まとめ、**Google ドキュメントに書き出し** | Apps Script |
| 🎮 | ゲームをつくる | 準備中(クイズ作成に誘導) | — |
| 🗂️ | マイさくひん | これまで作ったものをぜんぶ見る | `/kids/gallery` |

作ったファイルは `public/uploads/<児童ID>/<UUID>.<拡張子>` に保存され、
`Artwork` レコードで管理されます。`pnpm db:studio` で DB 全体を確認可能。

### 📘 探究の 機能(これまで通り)

- 「わたしたちの町の昔と今」単元
- 🔍 「声が聞こえていないのはだれ?」機能(本アプリの中核)
- ✍️ ふりかえり(立ち止まりの言葉を書きながらハイライト)
- 🗺️ 立場マップ、🎮 立場クイズ、📊 単元まとめ
- 🤖 ボット対話(ナレッジ制約 + 出典自動付与 + 入力モデレーション + 日次上限)

### 👩‍🏫 先生用(`/teacher`)

- クラス/単元設計、時数プラン、立場・アンケートテンプレ生成
- 児童のふりかえり / 声の仮説 / 立場分布 / アンケート結果を閲覧
- **クラス設定画面** (`/teacher/classes/<classId>`) — **Google スプレッドシート自動連携**の
  URL とシークレットを設定(詳細は後述)、テスト送信ボタンで疎通確認
- **クラスの作品** (`/teacher/classes/<classId>/works`) — 児童の写真・動画・録音・絵・クイズを
  種類別 / 児童別でフィルタして一覧

### 📊 Google スプレッドシート自動連携(OAuth 不要)

Apps Script Web App 方式で、学校現場での導入負荷を最小にしています。
児童の以下のアクションが、クラスごとに指定したスプレッドシートに自動追記されます:

- 🎙️ 音声録音+文字起こし
- ✍️ ふりかえり(立ち止まりの言葉カウント付き)
- 🔍 「声が聞こえていないのはだれ?」の仮説
- 🗺️ 立場の記録

**導入手順(先生が 1 回だけ行う、約 5 分):**

1. Google スプレッドシートを新規作成
2. 拡張機能 → Apps Script で、アプリ内「📋 スクリプトをコピー」したコードを貼り付け
3. `SECRET` 行を任意の強い文字列に書き換え
4. デプロイ → ウェブアプリ → アクセス権「全員」でデプロイ → URL をコピー
5. アプリの `/teacher/classes/<classId>` で URL と同じ SECRET を入力して保存
6. 「📡 テスト送信」で疎通確認

児童の端末からは**直接 Google に接続せず**、本アプリ(Node.js サーバー)が
Apps Script Web App に POST します。OAuth の設定は 不要、児童の認証情報も 送りません。

### 📄 Google ドキュメント自動書き出し(記録ノート)

同じ Apps Script Web App が **Google ドキュメントの作成**も担当します。
児童が `/kids/notebook` で作った記録ノート(写真+録音+絵+テキスト)を
「📄 Google ドキュメントにする」ボタン 1 つで、**先生の Drive に新規ドキュメント**として書き出します。

**既に Sheets 連携を使っている場合の再デプロイ手順(約 2 分):**

1. Apps Script エディタで既存コードを**最新テンプレート**に貼り替え
   (アプリの `/teacher/classes/<classId>` で「📋 スクリプトをコピー」)
2. 初回のみ `DocumentApp` の追加スコープ許可プロンプトが出る → 承認
3. 「デプロイの管理 → 編集(鉛筆)→ 新しいバージョン」で**再デプロイ**
4. URL は変わらないのでアプリ側の設定変更は**不要**

新テンプレートは `kind='field-note'` を受け取ると Doc を作成、それ以外は
従来どおりスプレッドシートに追記します(**完全な後方互換**)。

> **Anthropic API キー未設定の場合**: LLM 呼び出しはモック応答で動きます。
> iPad のカメラ/マイク/お絵かきアプリは API キー不要で完全に動きます。

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

## 🔑 API キーと秘密情報の 取り扱い(小学生向けアプリ特有の要件)

### 🚨 大原則
**API キーは クレジットカード番号と 同じ**扱い。
クライアント(児童の タブレットで 動くブラウザ)に絶対に埋め込まない。
本アプリはすべての LLM 呼び出しを Next.js Route Handler(サーバー側)
から行い、クライアントには API キーを送出しません。
この構成を 崩さないことが 最も重要です。

### 📋 ローカル開発でのセットアップ(最短手順)

```bash
# 1. テンプレートを複製
cp .env.example .env.local

# 2. 各種キーを生成・取得
#    ANTHROPIC_API_KEY: https://console.anthropic.com/ で 発行(※ 後述のキー名運用を 必ず 参照)
#    AUTH_SECRET:       openssl rand -base64 32
#    RESEARCH_ANONYMOUS_ID_PEPPER: openssl rand -base64 32

# 3. .env.local を エディタで開き 値を記入
#    .env.local は .gitignore 済みなので コミットされません

# 4. 動作確認
pnpm dev
curl http://localhost:3000/healthz
#  → "anthropicConfigured": true, "authSecretConfigured": true なら OK
```

### 🔐 Anthropic API キーの発行方針(推奨)

漏洩時の影響範囲を 限定するため、**用途別・環境別**に
キーを分けて 発行することを強く推奨します。

| 用途 | キー名(Anthropic Console 上のラベル例) | 用途 |
|------|-----------------------------------------|------|
| 開発 | `dreammake-dev-<developer>` | 各開発者の ローカル開発用、最小限の 支出上限 |
| CI | `dreammake-ci` | CI 上のスモークテスト(常時低上限) |
| ステージング | `dreammake-staging` | 限定公開での 検証 |
| 本番 | `dreammake-prod` | 本番、高い上限を 別途 設定 |

あわせて Anthropic Console の **Spend limit** を用途ごとに設定し、
**Usage alerts** を有効にしてください(例:80% で通知)。

### ⚠️ 禁則事項(やったら 即 キー失効)

- GitHub / GitLab 等の **リモート** リポジトリに `.env` / `.env.local` を push しない
  (本リポジトリは `.gitignore` で除外済み)
- 児童の 端末で 動くコード(`app/(kids)/` 配下の Client Component や iframe)に
  `ANTHROPIC_API_KEY` を渡す 箇所を 作らない。`lib/env.ts` は Node.js サーバーでのみ
  参照される設計です
- API キーを Slack / ドキュメント ツール / ChatGPT / クリップボード共有 サービスに
  貼り付けない(Anthropic からの 警告対象)

### 🆘 漏洩したかも、と 思ったら

1. Anthropic Console の **API keys** ページで 該当キーを即座に **Revoke**
2. 新しいキーを発行し、`.env.local` / デプロイ先の シークレットマネージャを更新
3. 直近の Usage / Cost を確認、異常があれば サポートに連絡
4. 公開リポジトリに漏れた場合は、**git の履歴から キーを除去**
   (`git filter-repo` など、GitHub の Secret Scanning が 自動通報することもあります)

### 🛡️ 本アプリが 既に 満たしている「未成年者向け」安全要件

Anthropic の未成年者向け利用ガイドライン
(https://support.claude.com/en/articles/9307344 )が要求する 安全対策と、
本アプリの対応箇所の対応表:

| 要求事項 | 本アプリでの実装 |
|---------|----------------|
| **AI 利用の開示** | 着地画面と [/privacy](app/privacy/page.tsx) で 明示、ボット画面に「AI は まちがえることが あるよ」常設 |
| **モデレーション / フィルタリング** | [lib/moderation/rules.ts](lib/moderation/rules.ts)(PII・電話・メール)+ [lib/moderation/input.ts](lib/moderation/input.ts)(Claude Haiku 判定) |
| **child-safety system prompt の差し込み** | [lib/prompts/child-safety.ts](lib/prompts/child-safety.ts) — **本番前に Anthropic 公式本文へ差し替え必須**(`/healthz` で placeholder 状態を可視化) |
| **年齢確認 / 本人確認** | 組織(学校)が児童アカウントを発行、教員が保護者同意を代行記録(絵柄パスワード + 学校コード認証) |
| **1 日の呼び出し上限** | [lib/rate-limit.ts](lib/rate-limit.ts) が `AuditLog` を集計して 強制、`SAFETY_DAILY_LLM_CALL_LIMIT_PER_USER` で設定 |
| **サーバーサイド プロキシ** | すべての Claude 呼び出しは Route Handler / Server Action 経由(クライアント露出ゼロ) |
| **監視 / 監査** | `AuditLog` に全 LLM 呼び出し、`ModerationLog` に全モデレーション結果、`IncidentReport` にハードブロックと危険兆候 |
| **保護者同意** | `ConsentRecord(kind='llm-usage' / 'research-participation' ...)` を教員経由で記録 |

### 📝 本番前の チェックリスト(組織 / 学校 向け)

- [ ] [lib/prompts/child-safety.ts](lib/prompts/child-safety.ts) の `ANTHROPIC_CHILD_SAFETY_SYSTEM_PROMPT` を、
      Anthropic 公式の 最新本文で 置き換えた(**プレースホルダのまま 本番に出さない**)
- [ ] Anthropic Console で **本番用** API キーを発行(dev とは別キー)
- [ ] Spend limit と Usage alerts を設定
- [ ] デプロイ先(Vercel / オンプレ等)の **シークレットマネージャ** に
      `ANTHROPIC_API_KEY` / `AUTH_SECRET` / `RESEARCH_ANONYMOUS_ID_PEPPER` を登録
      (`.env.local` をサーバーに持ち込まない)
- [ ] 教育委員会 / 自治体の ガイドラインと 個人情報保護法 への適合を確認
- [ ] 保護者向け 説明書 / 同意書の 配布準備(紙か 学校配布ツール、アプリ内ポータルは持たない方針)
- [ ] プライバシーポリシーを /privacy 以外に 学校サイトにも 掲載
- [ ] `/healthz` で `childSafetyPrompt` が `configured` になっていることを確認

### 🧑‍💻 環境変数 一覧(抜粋)

すべて [`.env.example`](.env.example) にテンプレートと説明があります。

**最低限(Phase 1 時点):**
- `ANTHROPIC_API_KEY` — Claude API キー
- `AUTH_SECRET` — `openssl rand -base64 32`
- `DATABASE_URL` — SQLite なら `file:./dev.db`
- `RESEARCH_ANONYMOUS_ID_PEPPER` — 匿名 ID 生成用(研究モード利用時は必須)

**安全・運用の 主な項目:**
- `SAFETY_DAILY_LLM_CALL_LIMIT_PER_USER`(既定 100)— 1 児童 1 日の 呼び出し上限
- `SAFETY_CONTINUOUS_USE_WARN_MINUTES`(既定 20)— 休憩 うながし
- `SAFETY_INCIDENT_NOTIFY_EMAIL` — 教員宛 インシデント通知先

**Phase 2 以降:**
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
