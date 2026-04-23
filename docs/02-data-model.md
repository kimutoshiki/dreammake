# 02. データモデル

## 🎯 設計方針

1. **児童の PII を最小化**: 本名・住所・電話は持たない。ニックネーム+ハンドルのみ
2. **出典を第一級市民に**: `Source` を独立テーブル化、`Bot` と `Message` の両方から参照
3. **モデレーション痕跡は残す**: 削除対象になった入力も教員ロールは追跡可能(児童本人には非表示)
4. **学年プロファイルを会話時点でスナップショット**: 途中で学年が変わっても過去会話は壊れない
5. **リミックス系譜**: `Bot.remixedFromId` で親子関係を保持、出典は継承
6. **SQLite から Postgres へ無理なく移行**: Prisma の provider 切替だけで動く範囲の型を使う

---

## 🗺️ ER 図(概略)

```mermaid
erDiagram
    School ||--o{ Class : has
    Class ||--o{ ClassMembership : has
    Class ||--o{ Unit : hosts
    User ||--o{ ClassMembership : in
    User ||--o{ Bot : owns
    User ||--o{ Conversation : starts
    User ||--o{ Artwork : creates
    User ||--o{ ConsentRecord : has
    User ||--o| GradeProfile : has
    Bot ||--o{ KnowledgeCard : contains
    Bot ||--o{ Source : cites
    Bot ||--o{ Conversation : hosts
    Bot ||--o| Bot : "remixedFrom"
    KnowledgeCard }o--o{ Source : references
    Conversation ||--o{ Message : contains
    Message }o--o{ Source : "cites (citedSources)"
    Message ||--o{ ModerationLog : "produces (optional)"
    Artwork ||--o| Bot : "derivedFrom (optional)"
    Artwork ||--o| Conversation : "createdIn (optional)"
    Unit ||--o{ UnitHour : schedules
    Unit ||--o{ Stance : defines
    Unit ||--o{ StanceSnapshot : tracks
    Unit ||--o{ MissingVoiceHypothesis : collects
    Unit ||--o{ ReflectionEntry : collects
    Unit ||--o{ SurveyInstrument : has
    SurveyInstrument ||--o{ SurveyResponse : collects
    Unit ||--o{ EpisodeRecord : extracts
    Unit ||--o{ CoOccurrenceSnapshot : snapshots
    Stance ||--o{ StanceSnapshot : "targeted by"
    Unit ||--o{ UnitBot : contains
    Unit ||--o{ UnitArtwork : contains
```

---

## 🧱 Prisma schema(Phase 1 実装予定・確定版)

> このファイルをコピーして `prisma/schema.prisma` とし、`pnpm prisma validate` が通る前提で書いている。SQLite は enum を持たないため、enum はアプリ層で `string` リテラルに制約する方針(Zod で検証)。

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  // ローカル/オンプレ既定: SQLite。本番 Postgres へは provider のみ変更
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// -----------------------------------------------------------
// 組織
// -----------------------------------------------------------
model School {
  id         String   @id @default(cuid())
  name       String
  code       String   @unique  // 児童の学校コード(例: "tokyo-1st-es")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  classes    Class[]
  users      User[]
}

model Class {
  id           String             @id @default(cuid())
  schoolId     String
  school       School             @relation(fields: [schoolId], references: [id])
  name         String             // "4年2組" など
  gradeYear    Int                // 1..6
  defaultGrade String             // 'lower' | 'middle' | 'upper' (GradeProfile.band)
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  memberships  ClassMembership[]
  bots         Bot[]              // このクラスに所属するボット
  @@index([schoolId])
}

model ClassMembership {
  id        String   @id @default(cuid())
  classId   String
  class     Class    @relation(fields: [classId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  role      String   // 'student' | 'teacher'
  createdAt DateTime @default(now())
  @@unique([classId, userId])
  @@index([userId])
}

// -----------------------------------------------------------
// ユーザー(児童・教員・保護者)
// -----------------------------------------------------------
model User {
  id              String   @id @default(cuid())
  role            String   // 'student' | 'teacher' | 'guardian' | 'admin'
  schoolId        String?
  school          School?  @relation(fields: [schoolId], references: [id])

  // --- 児童(role = 'student')向け項目 ---
  handle          String?  @unique  // 学校内で一意の児童ID(例: "s-4-02-015")
  nickname        String?           // 学級内で表示される名前
  emojiPasswordHash String?         // 絵柄パスワードの argon2 ハッシュ
  emojiPasswordSalt String?
  avatarSeed      String?           // アバターのシード(ランダム似顔絵)
  gradeProfileId  String?  @unique
  gradeProfile    GradeProfile? @relation(fields: [gradeProfileId], references: [id])

  // --- 教員・保護者向け項目 ---
  email           String?  @unique  // マジックリンク送信先
  emailVerified   DateTime?

  // --- 保護者連携 ---
  guardianOf      GuardianLink[] @relation("guardian")
  guardianLinks   GuardianLink[] @relation("child")

  // --- 同意 ---
  consents        ConsentRecord[]

  // --- 所属・作成物 ---
  memberships     ClassMembership[]
  bots            Bot[]             @relation("botOwner")
  conversations   Conversation[]
  artworks        Artwork[]

  // --- 監査 ---
  incidentsAsActor    IncidentReport[] @relation("incidentActor")
  incidentsAsSubject  IncidentReport[] @relation("incidentSubject")

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  lastActiveAt    DateTime?

  @@index([role, schoolId])
}

model GradeProfile {
  id            String  @id @default(cuid())
  band          String  // 'lower' (1-2) | 'middle' (3-4) | 'upper' (5-6)
  gradeYear     Int?    // 実学年の目安
  furiganaMode  String  // 'all' | 'above-grade' | 'uncommon-only' | 'off'
  voiceFirst    Boolean @default(false)  // 音声入力を主アクションにする
  maxQaChars    Int                       // Q&A カード上限文字数
  overrides     String  @default("{}")    // JSON: ユーザー個別の UI コピー上書き
  user          User?
}

model GuardianLink {
  id          String   @id @default(cuid())
  childId     String
  child       User     @relation("child", fields: [childId], references: [id])
  guardianId  String
  guardian    User     @relation("guardian", fields: [guardianId], references: [id])
  relation    String   // 'parent' | 'guardian' | 'other'
  createdAt   DateTime @default(now())
  @@unique([childId, guardianId])
}

model ConsentRecord {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  kind       String   // 'llm-usage' | 'image-gen' | 'class-share' | 'home-use' | 'voice-input'
  granted    Boolean
  grantedBy  String   // 'teacher' | 'guardian' | 'self'
  grantedAt  DateTime @default(now())
  revokedAt  DateTime?
  notes      String?
  @@index([userId, kind])
}

// -----------------------------------------------------------
// ボットとナレッジ
// -----------------------------------------------------------
model Bot {
  id              String   @id @default(cuid())
  ownerId         String
  owner           User     @relation("botOwner", fields: [ownerId], references: [id])
  classId         String?
  class           Class?   @relation(fields: [classId], references: [id])
  name            String
  avatarSeed      String
  persona         String   // 'kind' | 'funny' | 'scholar' | 'cheer' | 'calm'
  strengths       String   // 子ども自身が書く「とくい」
  weaknesses      String   // 子ども自身が書く「にがて」
  topic           String   // テーマ(例: "メダカのひみつ")
  isPublic        Boolean  @default(false)  // しらべもの広場に公開
  remixedFromId   String?
  remixedFrom     Bot?     @relation("remix", fields: [remixedFromId], references: [id])
  remixes         Bot[]    @relation("remix")
  knowledgeCards  KnowledgeCard[]
  sources         Source[]
  conversations   Conversation[]
  likes           BotReaction[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([ownerId])
  @@index([classId, isPublic])
}

model KnowledgeCard {
  id          String   @id @default(cuid())
  botId       String
  bot         Bot      @relation(fields: [botId], references: [id], onDelete: Cascade)
  kind        String   // 'qa' | 'note' | 'pdf-extract' | 'image-ocr' | 'voice-memo'
  question    String?  // kind='qa' のとき使用
  answer      String   // すべての kind で本文
  sourceIds   String   @default("[]")  // JSON 配列 of Source.id
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([botId, order])
}

model Source {
  id          String   @id @default(cuid())
  botId       String
  bot         Bot      @relation(fields: [botId], references: [id], onDelete: Cascade)
  kind        String   // 'book' | 'url' | 'interview' | 'observation' | 'other'
  title       String
  authorOrWho String?  // 著者 or 取材相手
  url         String?
  capturedAt  DateTime?
  notes       String?
  // リミックス元の Source への参照(系譜追跡)
  inheritedFromId String?
  createdAt   DateTime @default(now())
  @@index([botId])
}

// -----------------------------------------------------------
// 対話
// -----------------------------------------------------------
model Conversation {
  id                      String    @id @default(cuid())
  botId                   String
  bot                     Bot       @relation(fields: [botId], references: [id])
  userId                  String
  user                    User      @relation(fields: [userId], references: [id])
  gradeProfileSnapshot    String    // 会話開始時の GradeProfile を JSON で凍結
  startedAt               DateTime  @default(now())
  lastMessageAt           DateTime  @default(now())
  closed                  Boolean   @default(false)
  messages                Message[]
  artworks                Artwork[]
  @@index([userId, lastMessageAt])
  @@index([botId, lastMessageAt])
}

model Message {
  id                  String   @id @default(cuid())
  conversationId      String
  conversation        Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role                String   // 'user' | 'assistant' | 'system'
  content             String   // 表示用テキスト(出典はアプリ層で機械付与した最終形)
  rawContent          String?  // モデル生の応答(デバッグ・監査)
  citedSourceIds      String   @default("[]")  // JSON: この応答が参照した Source.id
  moderation          ModerationLog?
  tokensIn            Int?
  tokensOut           Int?
  latencyMs           Int?
  createdAt           DateTime @default(now())
  @@index([conversationId, createdAt])
}

// -----------------------------------------------------------
// 作品
// -----------------------------------------------------------
model Artwork {
  id                String   @id @default(cuid())
  ownerId           String
  owner             User     @relation(fields: [ownerId], references: [id])
  /// 'image'       = 絵画作品(Gemini 生成 + 編集)
  /// 'infographic' = テンプレート型 HTML+SVG まとめ
  /// 'mini-app'    = つくってみようモードの単一 HTML
  /// 'video'       = 立場の「語り」動画(スライド+TTS+BGM、単一 MP4)
  /// 'music'       = 立場の BGM(WebAudio + シンプルメロディ、単一 WAV/MP3)
  /// 'quiz'        = 立場当てクイズ / 少数派さがしゲーム(JSON 定義)
  kind              String   // 'image' | 'infographic' | 'mini-app' | 'video' | 'music' | 'quiz'
  title             String
  // kind='image'
  finalPrompt       String?
  safetyFilteredPrompt String?
  imageProvider     String?  // 'gemini' | 'openai'
  imageModel        String?
  imageUrl          String?  // Storage の key
  // kind='infographic'
  template          String?  // 'compare' | 'sequence' | 'summary' | 'map'
  infographicHtml   String?  // 編集後の HTML
  // kind='mini-app'
  appCodeHtml       String?  // 単一 HTML(CSS+JS 内包)
  staticScanResult  String?  // 静的スキャン結果(JSON)
  // kind='video'
  videoUrl          String?  // Storage の key(MP4)
  videoScript       String?  // ナレーション台本(立場の語り)
  videoStanceId     String?  // どの立場の「声」か(Stance.id)
  videoDurationSec  Int?
  // kind='music'
  musicUrl          String?  // Storage の key(WAV/MP3 or Tone.js スコア JSON)
  musicScore        String?  // JSON(テンポ・調・メロディライン)
  musicMood         String?  // 立場の気持ちを表す mood ラベル
  // kind='quiz'
  quizSpec          String?  // JSON(問題・選択肢・正解/複数正解・立場カテゴリ)
  quizKind          String?  // 'stance-match' | 'minority-find' | 'evidence-link'
  derivedFromBotId  String?
  createdInConversationId String?
  createdInConversation   Conversation? @relation(fields: [createdInConversationId], references: [id])
  isPublic          Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  @@index([ownerId, kind])
}

// -----------------------------------------------------------
// リアクション(スタンプ中心、自由記述は別途モデレーション必須)
// -----------------------------------------------------------
model BotReaction {
  id         String   @id @default(cuid())
  botId      String
  bot        Bot      @relation(fields: [botId], references: [id], onDelete: Cascade)
  userId     String
  kind       String   // 'like' | 'wow' | 'learn-more' | 'question'
  stampCode  String?  // 定型スタンプコード(自由記述は別モデルで)
  createdAt  DateTime @default(now())
  @@unique([botId, userId, kind])
}

// -----------------------------------------------------------
// モデレーション・監査
// -----------------------------------------------------------
model ModerationLog {
  id              String   @id @default(cuid())
  // 入力(児童発話)か 出力(AI 応答)のどちらか
  stage           String   // 'input' | 'output'
  // 対応するメッセージ(出力時)または入力バッファ(入力時)
  messageId       String?  @unique
  message         Message? @relation(fields: [messageId], references: [id])
  // 入力段で使用する「まだ Message 化する前の入力」保持用
  pendingInputEncrypted  String?  // AES-GCM 暗号文(教員ロールのみ復号可)
  pendingInputIv         String?
  decision        String   // 'safe' | 'soft-flag' | 'hard-block'
  categories      String   @default("[]")  // JSON: 'violence', 'sexual', 'pii', 'bullying', 'self-harm', 'lure'
  model           String   // 実行モデル(haiku 4.5 など)
  reason          String?  // モデルの説明
  userId          String   // 対象ユーザー
  createdAt       DateTime @default(now())
  @@index([userId, createdAt])
  @@index([decision, createdAt])
}

model IncidentReport {
  id          String   @id @default(cuid())
  severity    String   // 'info' | 'warn' | 'alert'
  kind        String   // 'hard-block' | 'suspected-self-harm' | 'pii-leak' | 'abuse' | 'sandbox-escape'
  actorId     String?  // 児童(行為者)
  actor       User?    @relation("incidentActor", fields: [actorId], references: [id])
  subjectId   String?  // 児童(対象)
  subject     User?    @relation("incidentSubject", fields: [subjectId], references: [id])
  classId     String?
  summary     String   // 教員向け概要(PII マスク済み)
  payload     String?  // JSON(関連 ID 群、モデル応答など)
  notifiedAt  DateTime?
  resolvedAt  DateTime?
  resolvedBy  String?  // User.id
  createdAt   DateTime @default(now())
  @@index([severity, createdAt])
  @@index([classId, createdAt])
}

model AuditLog {
  id          String   @id @default(cuid())
  actorId     String?
  action      String   // 'llm-call' | 'image-gen' | 'code-gen' | 'login' | 'consent-grant' | ...
  target      String?  // 'Bot:<id>' など
  model       String?  // LLM モデル名
  tokensIn    Int?
  tokensOut   Int?
  costEstJpy  Int?     // 推定コスト(円換算、小数点切り上げ)
  meta        String?  // JSON
  createdAt   DateTime @default(now())
  @@index([actorId, createdAt])
  @@index([action, createdAt])
}

// -----------------------------------------------------------
// 探究単元(中単元)と他者性に関わる追跡データ
// -----------------------------------------------------------

/// 社会科を主軸にした中単元(10〜15時間)を第一級オブジェクトとして扱う。
/// 教員が設計、児童はこの中で Bot 作成・対話・作品づくりを行う。
model Unit {
  id              String   @id @default(cuid())
  classId         String
  class           Class    @relation(fields: [classId], references: [id])
  createdById     String   // User.id (teacher)
  title           String                             // 例:「わたしたちの町の昔と今」
  primarySubject  String   @default("social-studies")// 主軸教科(social-studies 既定)
  crossCurricular String   @default("[]")            // JSON: ["japanese.writing","art.creation","music.composition","inquiry"]
  themeQuestion   String                             // 中心となる問い(例:「この町の未来を決めるとき、だれの声が聞かれていない?」)
  coreInquiry     String                             // 探究の概要(教員向け)
  plannedHours    Int                                // 計画時数(10〜15 目安)
  startDate       DateTime?
  endDate         DateTime?
  status          String   @default("draft")          // 'draft' | 'active' | 'closed'
  researchMode    Boolean  @default(false)            // 研究データの保存(事前事後・エピソード抽出)を許可
  ethicsApproval  String?                             // 倫理申請ID/承認ノート(研究参加単元のみ)
  hours           UnitHour[]
  stances         Stance[]
  stanceSnapshots StanceSnapshot[]
  missingVoices   MissingVoiceHypothesis[]
  reflections     ReflectionEntry[]
  surveys         SurveyInstrument[]
  episodes        EpisodeRecord[]
  cooccurrences   CoOccurrenceSnapshot[]
  bots            UnitBot[]
  artworks        UnitArtwork[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([classId, status])
}

/// 単元内の1時数(コマ)。教員が「AIをいつ使うか」を3つのポイントで配置。
model UnitHour {
  id              String   @id @default(cuid())
  unitId          String
  unit            Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  hourIndex       Int      // 1..plannedHours
  topic           String
  /// AI 挿入ポイント:
  ///  'none'         = この時間は AI を使わない(事実確認・意見共有など)
  ///  'before-self'  = 自分で考える前に AI に聞いて情報を広げる
  ///  'after-self'   = 自分の考えをまとめた後に AI と突き合わせる
  ///  'ask-missing'  = 「AIに出てこないのは誰?」を問う(研究の核)
  aiInsertion     String   @default("none")
  plannedActivities String  // 自由記述(教員向け)
  scheduledAt     DateTime?
  @@unique([unitId, hourIndex])
}

/// 単元で扱う「立場」。教員が初期提示し、児童/AI が追加・修正する。
model Stance {
  id              String   @id @default(cuid())
  unitId          String
  unit            Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  label           String   // 短いラベル(例:「開発を進めたい商店街の人」)
  summary         String   // 1〜2行の要約
  proposedBy      String   // 'teacher' | 'child' | 'ai'
  proposerUserId  String?  // 児童/教員が提案した場合
  isMajority      Boolean  @default(false)  // 多数派として観察されたか(事後更新)
  isFromAI        Boolean  @default(false)  // AI の出力から拾われた立場
  color           String?  // 立場マップでの色
  icon            String?  // 絵文字または SVG キー
  createdAt       DateTime @default(now())
  snapshots       StanceSnapshot[]
  @@index([unitId])
}

/// 児童が「いま自分はどの立場に近いか」を時系列で記録。
/// 事前 → 単元中盤 → 事後 の推移が最重要データ。
model StanceSnapshot {
  id              String   @id @default(cuid())
  unitId          String
  unit            Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  userId          String
  stanceId        String?  // 既知立場を選んだ場合
  stance          Stance?  @relation(fields: [stanceId], references: [id])
  customLabel     String?  // 既存立場に収まらない場合の自由記述
  strength        Int      // 1..5(どれくらい強く思うか)
  reasoning       String   // 「なぜそう思ったか」短文
  phase           String   // 'pre' | 'early' | 'mid' | 'late' | 'post'
  source          String   @default("self")  // 'self' | 'prompted' | 'survey'
  createdAt       DateTime @default(now())
  @@index([unitId, userId, createdAt])
}

/// 「AI に出てこないのは誰?」問いへの児童の仮説。単元の研究の核。
model MissingVoiceHypothesis {
  id              String   @id @default(cuid())
  unitId          String
  unit            Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  userId          String
  /// 児童がAIに問うた内容(プロンプト)
  askedPrompt     String
  /// そのときのAI応答要約(後続の分析用、PII マスク済み)
  aiResponseDigest String
  /// 児童の仮説(誰が出てこないか、なぜ)
  hypothesisText  String
  /// 仮説の根拠(児童が書いた)
  evidence        String?
  /// 教員やクラスと共有したか
  shared          Boolean  @default(false)
  createdAt       DateTime @default(now())
  @@index([unitId, userId])
}

/// 振り返り記述。立ち止まりの言葉(でも/なぜ/別の見方をすれば 等)を自動検出して格納。
model ReflectionEntry {
  id              String   @id @default(cuid())
  unitId          String
  unit            Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  userId          String
  hourIndex       Int?     // 何時数目の振り返りか
  prompt          String   // 教員が与えた問い(「きょう気づいたこと」等)
  text            String   // 児童の記述
  wordCount       Int
  /// 立ち止まりの言葉の検出結果(JSON 配列)
  ///   [{ term: "でも", count: 2, snippets: ["..."] }, ...]
  standstillWords String   @default("[]")
  standstillCount Int      @default(0)
  phase           String   // 'pre' | 'during' | 'post'
  createdAt       DateTime @default(now())
  @@index([unitId, userId, createdAt])
}

/// 事前・事後アンケート(単元ごと、3 軸の測定を既定で持つ)。
model SurveyInstrument {
  id              String   @id @default(cuid())
  unitId          String
  unit            Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  kind            String   // 'pre' | 'post' | 'mid'
  title           String
  /// 質問セット(JSON)
  ///  必須3軸:
  ///   axis-initial-position(最初の立場の内訳)
  ///   axis-majority-pull   (目立つ立場への集中度)
  ///   axis-other-awareness (自分と違う考えへの意識)
  questions       String
  openAt          DateTime?
  closeAt         DateTime?
  responses       SurveyResponse[]
  @@unique([unitId, kind])
}

model SurveyResponse {
  id              String   @id @default(cuid())
  instrumentId    String
  instrument      SurveyInstrument @relation(fields: [instrumentId], references: [id], onDelete: Cascade)
  userId          String
  answers         String   // JSON
  submittedAt     DateTime @default(now())
  @@unique([instrumentId, userId])
}

/// 「判断が揺れた瞬間」の教員向けエピソード記述。AI 候補 → 教員が編集・承認。
model EpisodeRecord {
  id              String   @id @default(cuid())
  unitId          String
  unit            Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  /// 児童 PII を含まない匿名 ID(ハッシュ)
  childAnonymousId String
  title           String
  narrative       String   // エピソード記述本文(匿名化済み)
  sourceKind      String   // 'chat-log' | 'reflection' | 'survey' | 'mixed'
  sourceRefs      String   @default("[]")  // JSON: 出典 ID(Message/ReflectionEntry)
  tags            String   @default("[]")  // 'majority-pull' | 'standstill' | 'minority-retract' 等
  aiDraftedBy     String?  // 使用モデル
  editedById      String?  // 教員 User.id
  status          String   @default("draft")  // 'draft' | 'approved' | 'rejected'
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([unitId, status])
}

/// 語の共起分析のスナップショット(KH Coder 風の簡易代替)。
/// 事前・中盤・事後 それぞれで記録し、比較に使う。
model CoOccurrenceSnapshot {
  id              String   @id @default(cuid())
  unitId          String
  unit            Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  phase           String   // 'pre' | 'mid' | 'post'
  /// 上位語(頻度順)JSON: [{ term, count }]
  topTerms        String
  /// 共起ペア JSON: [{ a, b, count, jaccard }]
  cooccurrences   String
  /// 児童間で差が大きかった語 JSON: [{ term, variance }]
  variantTerms    String   @default("[]")
  corpus          String   // 'reflection' | 'chat' | 'mixed'
  createdAt       DateTime @default(now())
  @@unique([unitId, phase, corpus])
}

/// 単元と Bot の紐付け(1 単元に複数 Bot、Bot は単元横断でも可)。
model UnitBot {
  unitId   String
  botId    String
  addedBy  String   // teacher or student
  addedAt  DateTime @default(now())
  @@id([unitId, botId])
}

/// 単元と Artwork の紐付け(動画・図・音楽・クイズ等)。
model UnitArtwork {
  unitId     String
  artworkId  String
  role       String   // 'expression' | 'evidence' | 'summary' | 'game'
  addedAt    DateTime @default(now())
  @@id([unitId, artworkId])
}

// -----------------------------------------------------------
// 認証(Auth.js)
// -----------------------------------------------------------
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

// User モデルに Session リレーションを加える
// (schema では User 側に `sessions Session[]` を追加する)
```

> 上記の schema は、User に `sessions Session[]` を追記する必要がある点のみ実装時に反映する(ドキュメント読みやすさのため本文では省略した)。

---

## 🔑 重要な不変条件(Phase 1 テストで保証する)

| 不変条件 | 担保方法 |
|----------|----------|
| `Message.content` の末尾には常に出典表記が含まれる(role='assistant' のとき) | アプリ層で機械付与(`lib/llm/cite.ts`)。テストで検証 |
| `Bot` のリミックス先は必ず `Source` を継承する | `remix.ts` のトランザクション |
| `Conversation.gradeProfileSnapshot` は一度書き込まれたら不変 | Prisma middleware で update を拒否 |
| `ModerationLog.pendingInputEncrypted` は教員ロール以外から復号不可 | アプリ層で役割チェック+鍵アクセス制限 |
| `ClassMembership.role='student'` のユーザーは `email` が null | Zod + DB check |
| `User.role='teacher'` のユーザーは `handle` / `emojiPasswordHash` が null | Zod + DB check |
| `Unit.status='closed'` の Unit に紐付く `StanceSnapshot`・`ReflectionEntry` は更新禁止 | Prisma middleware |
| `SurveyInstrument` は `(unitId, kind)` で一意、`pre`/`post` の順で作成される | `@@unique` + アプリ層のフロー制御 |
| `EpisodeRecord.narrative` には児童フルネーム・学校名・具体的日時が含まれない | PII マスクを生成時に強制、テストで検証 |
| `MissingVoiceHypothesis.aiResponseDigest` は PII マスク済み(児童本人の情報を含まない) | 記録時にマスクパス |
| `Unit.researchMode=false` の単元では、`EpisodeRecord`・`CoOccurrenceSnapshot` を生成しない | Route Handler で先に判定 |

---

## 🧪 代表クエリ例(Phase 1 実装時の参考)

```ts
// 0) 単元の「立場マップ」を構築するための基礎データ取得
const unit = await prisma.unit.findUnique({
  where: { id: unitId },
  include: {
    stances: true,
    stanceSnapshots: {
      include: { stance: true },
      orderBy: { createdAt: 'asc' },
    },
    hours: { orderBy: { hourIndex: 'asc' } },
  },
});
// stanceSnapshots を phase ごとにバケット化して、立場分布の推移を算出。
// 少数派(頻度下位)と「立場変更の多い児童」を可視化する根拠にする。

// 0-2) 事前事後アンケートの差分比較(Phase 2 実装)
const [preInstrument, postInstrument] = await prisma.surveyInstrument.findMany({
  where: { unitId, kind: { in: ['pre', 'post'] } },
  include: { responses: true },
  orderBy: { kind: 'asc' },
});

// 0-3) 立ち止まりの言葉の出現推移(ReflectionEntry から)
const reflections = await prisma.reflectionEntry.findMany({
  where: { unitId },
  orderBy: [{ phase: 'asc' }, { createdAt: 'asc' }],
});
// 児童ごと・phase ごとに standstillCount の平均/中央値を取り、
// ウィルコクソン符号順位検定の入力とする(12-research-methods.md 参照)。

// 1) ボットの「システムプロンプト素材」を一括取得(プロンプトキャッシュの安定化)
const bot = await prisma.bot.findUnique({
  where: { id },
  include: {
    knowledgeCards: { orderBy: { order: 'asc' } },
    sources: true,
    owner: { include: { gradeProfile: true } },
  },
});

// 2) しらべもの広場の公開ボット一覧(クラス内)
const bots = await prisma.bot.findMany({
  where: { classId, isPublic: true },
  include: { _count: { select: { likes: true, conversations: true } } },
  orderBy: { updatedAt: 'desc' },
});

// 3) 教員ダッシュボード: 直近24時間のインシデント
const incidents = await prisma.incidentReport.findMany({
  where: {
    classId,
    createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
  },
  orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
});
```

---

## 🌱 マイグレーション方針

- **Phase 1**: このスキーマで `prisma migrate dev` 初期化
- **Phase 2**: `Artwork` の拡張(画像の meta 追加)
- **Phase 3**: `Artwork.kind='mini-app'` 関連を追加(既にスキーマ内で定義済み)
- **Phase 4**: `PortfolioEntry`, `WeeklyReport`, `WorksheetOutput` 等を追加

SQLite → Postgres: `datasource db` の `provider` を `"postgresql"` に変更し、`DATABASE_URL` を差替。SQLite 固有の制約は使っていないため、マイグレーションを再生成するだけで移行可能。

---

## 🔗 関連ドキュメント

- [01-architecture.md](01-architecture.md) — 全体構成
- [05-safety-and-privacy.md](05-safety-and-privacy.md) — ModerationLog / IncidentReport の扱い
- [07-auth.md](07-auth.md) — User.handle / emojiPasswordHash の設計
- [08-api-abstractions.md](08-api-abstractions.md) — DB アクセスの境界
