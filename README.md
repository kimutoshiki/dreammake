# しらべてつくろう!AIラボ

**小学生の iPad で「つくる・あそぶ・しらべる」児童向け 学習アプリ。**
ログインなし、単元やアンケートの 設定もなし、先生の管理 UI もなし。
クラスで iPad を 配ったら そのまま 使えるように 設計しています。

---

## 🎒 児童ハブ `/kids`

iPad で 開くと、次のタイルが 並んだ ホーム画面が 表示されます。

| アイコン | できること | 必要なもの |
|---------|-----------|----|
| 📷 しゃしん | カメラで 写真を 撮る | iPad の カメラ |
| 🎥 どうが | 動画を 撮る(最大 3 分) | iPad の カメラ+マイク |
| 🎙️ ろくおん + もじおこし | 録音しながら 声を 文字に する | iPad の マイク |
| 🖼️ AI に 絵を かいてもらう | ことばで 伝えると 絵が できる | ⚠️ Wi-Fi(Gemini) |
| 🎨 おえかき | 指 / Apple Pencil で かく。取材写真の 上にも かける | — |
| 🧩 クイズを つくる | もんだいを 並べて 保存 → その場で 遊べる | — |
| 🎵 おんがくを つくる | ドラムと メロディで 2 小節の 曲を 作る → WAV 保存 | — |
| 📒 記録ノート | 写真・録音・絵・ことばを 1 枚の カードに 束ねる | — |
| 🗓️ わたしの あゆみ | これまでの さくひんを ふりかえる | — |
| 🗂️ マイさくひん | ぜんぶの 作品を 一覧で 見る | — |
| 🤖 マイボット | 自分だけの AI 先生を 作って 対話(出典つき) | ⚠️ Wi-Fi(Claude) |

**ネットが 切れても 動く** のは Wi-Fi マーク **以外** の すべてです。
Service Worker で アプリ本体 と アップロードした 作品を キャッシュするので、
一度 読み込めば オフラインでも 作品を 見返せます。

---

## 🌐 公開 URL(デモ)

GitHub Codespaces の ポート公開で、**いつでもどこでも 誰でも** 閲覧可能な
デモ URL を 用意しています:

```
https://stunning-dollop-969qr775vvjfpx54-3000.app.github.dev/
```

### Codespace を 起動した時の 立ち上げ

Codespace を 開いた直後に 1 回だけ:

```bash
bash scripts/serve-public.sh
```

これで Next.js 本番サーバーが バックグラウンドで 永続起動し、ポート 3000
が public に なります(`gh codespace ports visibility 3000:public`)。
シェルや ターミナルを 閉じても サーバーは 走り続けます(`setsid` 起動)。

### 限界・注意

- 開発用 Codespace が **アクティブな間だけ** 有効(既定で 30 分 アイドルで 自動停止)
- **24/7 起動したい** 場合は 下の「☁️ Fly.io への 永続デプロイ」を 使う
- **本物の 児童データは 入っていません**(シードのみ)。本番の 教室で 使う ときは
  校内 LAN 内で 起動し、公開ポートは 使わない 想定

---

## 🚀 Vercel + Turso への 永続デプロイ(推奨・Codespace 不要で 24/7)

`kimutoshiki-aikobo.vercel.app` のような **GitHub アカウント名入りの 固定 URL** で
ずっと 公開できます。Codespace が 停止していても 関係なく、すべて 無料枠で OK。

データベースは **Turso(SQLite クラウド、無料 9GB)**、ファイル保存は
**Vercel Blob(無料 1GB)**。Prisma スキーマは そのままで、`TURSO_DATABASE_URL`
が 設定されていると 自動で libSQL ドライバアダプタに 切り替わります。

### 1. Turso(無料 SQLite クラウド)に DB を 作る

```bash
# Codespace の ターミナルで:
curl -sSfL https://get.tur.so/install.sh | bash
export PATH="$HOME/.turso:$PATH"

turso auth signup     # GitHub アカウントで サインイン
turso db create aikobo --location nrt   # 東京
turso db show aikobo --url              # libsql://... を 控える
turso db tokens create aikobo           # 認証トークンを 控える

# 既存 SQLite の マイグレーションを Turso に 流す(初回のみ)
turso db shell aikobo < prisma/migrations/20251020*/migration.sql
turso db shell aikobo < prisma/migrations/20251022*/migration.sql
turso db shell aikobo < prisma/migrations/20260428*/migration.sql
# (上記の 順は ファイル名 昇順。`ls prisma/migrations/*/migration.sql` で 確認)
```

### 2. Vercel に GitHub 連携で デプロイ

1. [vercel.com](https://vercel.com) を **GitHub** で サインイン
2. **Add New… → Project** で `kimutoshiki/dreammake` を 選択
3. **Project Name** に `aikobo` を 入れると URL が
   `kimutoshiki-aikobo.vercel.app` に なる(個人プロジェクトなので
   ユーザー名 が 自動で 入る)
4. **Environment Variables** で:
   - `TURSO_DATABASE_URL` = `libsql://aikobo-<...>.turso.io`
   - `TURSO_AUTH_TOKEN` = 上で控えた トークン
   - `ANTHROPIC_API_KEY` = `sk-ant-...`(必須:無いと モック応答)
   - `GOOGLE_API_KEY` = `AIza...`(任意:無いと プレースホルダ画像)
5. **Deploy** を クリック(2〜3 分)

### 3. ストレージ(児童の しゃしん・どうが・ろくおん)

Vercel ダッシュボード → **Storage** タブ → **Create Database** → **Blob** を 作成。
作成すると `BLOB_READ_WRITE_TOKEN` が 自動で プロジェクトに 入り、再デプロイ後に
有効化。

### 4. 初回アクセス

`https://kimutoshiki-aikobo.vercel.app/` を 開くと、空の Turso DB に 自動で
40 人の 児童が 投入され、出席番号選択画面が 出ます([lib/db/ensure-seeded.ts](lib/db/ensure-seeded.ts) で
冪等に 実行)。

### 料金

- Vercel:Hobby プラン(無料)で 個人プロジェクト OK
- Turso:Starter プラン(無料)— 9 GB 容量 / 10 億 行読み 月
- Vercel Blob:無料枠 1 GB / 月
- 月間 数百 アクセスなら **すべて 無料枠で 収まる**

---

## ☁️ Fly.io への 永続デプロイ(代替手段)

無料枠の Fly.io に Docker で デプロイすると、Codespace が 停止していても
URL は 生き続けます(東京リージョン、日本から 高速)。

```bash
# 1) flyctl を Codespace に インストール(初回のみ)
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"

# 2) Fly.io アカウント(無料、要メール)
flyctl auth signup    # or flyctl auth login

# 3) アプリ作成 + ボリューム(SQLite と アップロードを 永続化)
flyctl launch --copy-config --no-deploy   # アプリ名を 決める
flyctl volumes create stk_data --size 1 --region nrt   # 1GB / 東京

# 4) 環境変数(API キー)を 設定
flyctl secrets set ANTHROPIC_API_KEY=sk-ant-...
flyctl secrets set GOOGLE_API_KEY=AIza...      # (使うなら)
flyctl secrets set PUBLIC_HOST=<your-app>.fly.dev

# 5) デプロイ(2〜3 分)
flyctl deploy

# 公開 URL: https://<your-app>.fly.dev/
```

**料金の目安(無料枠):**
- shared-cpu-1x / 512MB × 1 マシン → 月 ~3 ドル相当(無料枠 $5/月で 収まる)
- 1GB ボリューム → 月 0.15 ドル(無料枠で カバー)
- アクセスが ない時は `auto_stop_machines = "stop"` で 自動停止 →
  次の アクセスで 5 秒で 起動(cold start)。完全 24/7 にしたい なら
  `min_machines_running = 1` に 変更

---

## 🚀 はじめかた(先生・学校向け)

### ケース A:`pnpm` で 直接 立ち上げる

前提:Node.js 20+ と pnpm。

```bash
pnpm install
cp .env.example .env.local
# .env.local を 開いて ANTHROPIC_API_KEY と(使うなら)GOOGLE_API_KEY を設定
#   → API キー 無しでも モック応答で 動作確認できる

pnpm prisma migrate deploy
pnpm db:seed
pnpm dev
# → http://localhost:3000/kids
```

### ケース B:Docker で 1 コマンド

Docker Desktop か Docker Engine があれば:

```bash
cp .env.example .env.local
docker compose up --build
# → http://localhost:3000/kids
```

SQLite ファイルと 児童の作品は ホスト側の `./_data/` に 永続化されます。

### クラスの iPad から つなぐ

教員の PC / ノート PC で 上記を 起動したあと、**同じ Wi-Fi** に 接続した iPad から:

```
http://<先生PC の IP アドレス>:3000/kids
```

を 開くと 使えます(IP は `ipconfig` / `ifconfig` で 確認)。
外部 サービス(Claude / Gemini)への 通信は 先生の PC 経由で 出るので、
iPad 自体に 個別 Wi-Fi の 高速通信は 不要です。

---

## 👤 ユーザー(ログインなし / 出席番号)

シード投入時に 4年1組の 児童 40 人(出席番号 1〜40)が 登録されます。
**1 人 1 台の iPad** を 前提に、最初の 訪問で 自分の 番号を 1 回だけ 選びます
(ニックネームは 自動で「1 ばん」「2 ばん」… が 割り当たります)。

以後は Cookie(30 日)で 固定。教室で 切り替える UI は ありません。
番号を まちがえたときは `/privacy` の「🔁 iPad の ばんごうを かえる」から
Cookie を 消して 選び直せます。

```
http://localhost:3000/       → 初回は /pick(番号えらび)、2回目以降は /kids
http://localhost:3000/kids   → ハブ(タイル並び)
http://localhost:3000/pick   → 出席番号の 選択画面
```

---

## 🛡️ 児童の 安全のために

- 本名・住所・電話番号・顔写真を **要求しない**
- すべての AI 呼び出し(対話・画像生成)に **多層モデレーション**(ルール + Claude Haiku)
- Anthropic 公式の child-safety system prompt を 差し込む 箇所を 用意
  (本番前に [lib/prompts/child-safety.ts](lib/prompts/child-safety.ts) に 公式本文を 反映)
- 1 日の AI 呼び出し上限を サーバー側で 強制(`SAFETY_DAILY_LLM_CALL_LIMIT_PER_USER`)

詳しくは `/privacy` をアプリ内で 確認できます。

---

## 📂 ディレクトリ(概要)

```
app/
  page.tsx              → Cookie あり→/kids、なし→/pick
  pick/page.tsx         → 出席番号 1〜40 を タイルで 選ぶ
  kids/
    page.tsx            → ハブ(タイル並び)
    bots/               → マイボット作成・対話
    create/photo|video|audio|draw|image|quiz|music/   → 作成アプリ
    notebook/           → 記録ノート
    journey/            → わたしの あゆみ
    gallery/            → マイさくひん + 動画マーカー
  api/
    chat/[botId]/       → Claude SSE
    image/generate/     → Claude 安全化 → Gemini 生成
    upload/             → ファイル(写真/動画/音声/お絵かき)保存
lib/
  context/kid.ts        → Cookie で 出席番号を 保持(認証なし)
  llm/anthropic.ts, integrations/gemini-image.ts  → AI
  moderation/*, prompts/child-safety.ts           → 安全
  music/wav-encoder.ts, video/markers.ts          → 作品ツール
public/
  manifest.webmanifest, icon.svg, sw.js           → PWA
```

---

## 🔑 環境変数

`.env.example` を `.env.local` に コピーして 必要な値だけ 入れます。

**よく使うもの:**
- `ANTHROPIC_API_KEY` — ボット対話・モデレーションに 必要(未設定でも モック で動く)
- `GOOGLE_API_KEY` — AI 画像生成に 必要(未設定でも プレースホルダ 表示)
- `SAFETY_DAILY_LLM_CALL_LIMIT_PER_USER` — 1 児童 1 日の 上限(既定 100)
- `DATABASE_URL` — SQLite なら `file:./dev.db`

---

## 🧱 技術メモ

- Next.js 14(App Router)+ TypeScript strict + Tailwind CSS
- SQLite + Prisma(ファイル 1 つで 動く)
- Tone.js(音楽)/ Canvas(お絵かき)/ MediaRecorder(動画・音声)
- Web Speech API(オンデバイス 文字おこし:Safari 限定、他は 録音のみ)
- Service Worker で アプリシェル と `/uploads/**` を キャッシュ
- Docker(`Dockerfile` + `docker-compose.yml`)で 1 コマンド起動

---

## ライセンス

教育利用を 前提とした 非営利ライセンスを 検討中。
