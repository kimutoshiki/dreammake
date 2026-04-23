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

## 👤 ユーザー(ログインなし)

シード投入時に 児童 3 人が 登録されます:
- みさき(`s-4-01-001`)/ たけし(`s-4-01-002`)/ ゆい(`s-4-01-003`)

画面 右上の **セレクタ** で 切替(Cookie に 30 日保存)。パスワードは ありません。
教室の iPad を 共有で 使う想定です。

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
  page.tsx              → /kids へリダイレクト
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
  context/kid.ts        → Cookie セレクタ(認証なし)
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
