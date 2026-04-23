# 08. API 抽象化レイヤ

> ローカル開発 → 教室オンプレ → クラウド本番の移行を**コード変更なし**(環境変数のみ)で可能にするための Adapter 層。

---

## 🎯 設計方針

1. **最小の境界、最小のインタフェース**: 全機能を詰め込まず、実際に使う操作だけを定義
2. **Adapter は純粋**: 上位に Prisma を見せない、DB 更新を混ぜない
3. **フォールバック可能**: プライマリが落ちてもサブ実装に降りる設計(特に画像生成)
4. **環境変数で切替**: 実装クラスの選択は一箇所(`lib/*/factory.ts`)

---

## 🧩 主な Adapter

1. `LLMAdapter` — Claude API(他 LLM も将来対応可)
2. `ImageGenAdapter` — Gemini / OpenAI 画像生成
3. `StorageAdapter` — Local FS / MinIO / S3
4. `VideoAdapter` — Remotion for Browser によるスライド+TTS+BGM 合成(Phase 3)
5. `MusicAdapter` — Tone.js による簡易メロディ生成(Phase 3)
6. `CoOccurrenceAnalyzer` — kuromoji + 独自共起集計(Phase 4)
7. `AuthAdapter` — 認証は Auth.js の Provider として抽象化(保護者 Provider は持たない)

---

## 1️⃣ LLMAdapter

### インタフェース

```ts
// lib/llm/adapter.ts
export type LLMRole = 'system' | 'user' | 'assistant';

export type LLMMessage = {
  role: LLMRole;
  content: string;
  cacheControl?: 'ephemeral' | null;   // Anthropic プロンプトキャッシュ
};

export type LLMCompleteInput = {
  model: string;
  messages: LLMMessage[];
  maxTokens: number;
  temperature?: number;
  stopSequences?: string[];
  metadata?: Record<string, string>;   // 監査ログ用
};

export type LLMCompleteOutput = {
  text: string;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens?: number };
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_use' | 'other';
  latencyMs: number;
};

export type LLMStreamChunk =
  | { type: 'text-delta'; delta: string }
  | { type: 'done'; output: LLMCompleteOutput };

export interface LLMAdapter {
  complete(input: LLMCompleteInput): Promise<LLMCompleteOutput>;
  stream(input: LLMCompleteInput): AsyncIterable<LLMStreamChunk>;
  /** JSON 強制(Anthropic は最終アウトプットをパースで検証) */
  completeJson<T>(input: LLMCompleteInput, schema: ZodSchema<T>): Promise<T>;
}
```

### Anthropic 実装の要点
- SDK: `@anthropic-ai/sdk`(v0.70+ を想定、最新 API 対応)
- プロンプトキャッシュ: `messages[i].content` に `cache_control: { type: 'ephemeral' }` を付与
  - ボット本体のシステムプロンプト(ナレッジ込み)は常時キャッシュ
- リトライ: 指数バックオフ、429 と 5xx を 3 回まで
- タイムアウト: `ANTHROPIC_TIMEOUT_MS=30000`
- 監査ログ: 呼び出しごとに `AuditLog.action='llm-call'` を記録

### ファクトリー
```ts
// lib/llm/factory.ts
import { AnthropicAdapter } from './anthropic';
export function createLLMAdapter(): LLMAdapter {
  return new AnthropicAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    timeoutMs: Number(process.env.ANTHROPIC_TIMEOUT_MS ?? 30000),
    maxRetries: Number(process.env.ANTHROPIC_MAX_RETRIES ?? 3),
  });
}
```

将来: `LLM_PROVIDER=anthropic|azure-openai|local-llm` で切替可能にする拡張を想定。

### 監査とキャッシュ
- `usage.cacheReadTokens > 0` のときは `AuditLog.meta.cacheHit=true`
- キャッシュヒット率を教員ダッシュボードの「コスト」タブで表示(Phase 4)

---

## 2️⃣ ImageGenAdapter

### インタフェース

```ts
// lib/image/adapter.ts
export type ImageGenInput = {
  prompt: string;              // 英語プロンプト(safety 通過後)
  aspectRatio?: '1:1' | '3:4' | '4:3' | '16:9';
  size?: 'sm' | 'md' | 'lg';   // 生成サイズの抽象度
  safetyLevel: 'strict';       // 常に strict(変更不可)
  requestId: string;           // 監査ログ紐付け
};

export type ImageGenOutput = {
  imageBytes: Uint8Array;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  provider: 'gemini' | 'openai';
  model: string;
  latencyMs: number;
};

export interface ImageGenAdapter {
  generate(input: ImageGenInput): Promise<ImageGenOutput>;
  isAvailable(): Promise<boolean>;
}
```

### Gemini 実装の要点
- SDK: `@google/generative-ai`
- モデル: `GEMINI_IMAGE_MODEL=imagen-3`(環境変数)
- Gemini 側の `safetySettings` も最大(`BLOCK_LOW_AND_ABOVE`)に設定
- 失敗時(blockReason 等)は次の Adapter にフォールバック

### OpenAI 実装の要点
- SDK: `openai`
- モデル: `gpt-image-1`
- `moderation_tier=strict` 相当の設定

### フォールバックチェーン
```ts
// lib/image/factory.ts
export function createImageGenAdapter(): ImageGenAdapter {
  const primary = process.env.IMAGE_PROVIDER;
  const chain: ImageGenAdapter[] = [];

  if (primary === 'gemini' && process.env.GOOGLE_API_KEY) {
    chain.push(new GeminiAdapter({ apiKey: process.env.GOOGLE_API_KEY, model: process.env.GEMINI_IMAGE_MODEL! }));
  }
  if (primary === 'openai' && process.env.OPENAI_API_KEY) {
    chain.push(new OpenAIImageAdapter({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_IMAGE_MODEL! }));
  }
  // 逆プロバイダをフォールバックに
  if (primary === 'gemini' && process.env.OPENAI_API_KEY) {
    chain.push(new OpenAIImageAdapter(...));
  }
  if (chain.length === 0) {
    return new UnavailableImageGenAdapter(); // 明示的に「利用不可」エラー
  }
  return new ChainedImageGenAdapter(chain);
}
```

### `ChainedImageGenAdapter` の振る舞い
- 順に `generate` を試行、最初に成功した結果を返す
- 各試行のエラーは `AuditLog` に `action='image-gen-fallback'` で記録
- すべて失敗 → 「いまはえを つくれないみたい、すこしたってから もう一度」

---

## 3️⃣ StorageAdapter

### インタフェース

```ts
// lib/storage/adapter.ts
export type StorageKey = string;    // 例: "artworks/{userId}/{uuid}.png"

export type StoragePutInput = {
  key: StorageKey;
  body: Uint8Array | ReadableStream;
  contentType: string;
  metadata?: Record<string, string>;
};

export interface StorageAdapter {
  put(input: StoragePutInput): Promise<{ key: StorageKey }>;
  get(key: StorageKey): Promise<{ body: Uint8Array; contentType: string } | null>;
  delete(key: StorageKey): Promise<void>;
  signedUrl(key: StorageKey, options: { expiresInSeconds: number }): Promise<string>;
  list(prefix: string, options?: { limit?: number }): Promise<StorageKey[]>;
}
```

### Local FS 実装
- ルート: `STORAGE_LOCAL_DIR=./storage`
- `signedUrl` は `/api/files/[...path]?token=<HMAC-SHA256(key, expiry, secret)>` を返す(簡易)
- 同期 I/O は避ける(`fs/promises`)

### MinIO 実装
- SDK: `minio`
- `signedUrl` は MinIO 標準の presigned URL
- バケット名: `MINIO_BUCKET=shirabete-tsukurou`、初回起動で自動作成(存在しなければ)

### キー設計
- `artworks/{userId}/{cuid}.png` — 画像
- `artworks/{userId}/{cuid}.html` — インフォグラフィック / mini-app(本体は DB だが大きい場合に外出し)
- `knowledge-uploads/{userId}/{cuid}.{ext}` — PDF / 画像ナレッジ
- `avatars/{userId}.png` — アバター

### セキュリティ
- すべての画像・PDF は signed URL 経由でのみ返す(10 分程度の短期 URL)
- `list` は教員ロールのみ
- アップロード時 Content-Type ホワイトリスト(`image/png|jpeg|webp`, `application/pdf`)

---

## 4️⃣ VideoAdapter(Phase 3)

### インタフェース

```ts
// lib/video/adapter.ts
export type VideoSlide = {
  title?: string;
  bodyText?: string;
  imageDataUrl?: string;             // data: URI 推奨(外部送信回避)
  durationSec: number;
};

export type VideoComposeInput = {
  slides: VideoSlide[];
  narrationText: string;              // TTS の台本(Web Speech で合成)
  narrationLang?: 'ja-JP';
  bgmMood: 'gentle' | 'quiet' | 'sad' | 'steady' | 'light';
  bgmDurationSec: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
};

export type VideoComposeOutput = {
  videoBlob: Blob;                    // MP4(クライアント生成、サーバーに送らない)
  durationSec: number;
  renderMs: number;
};

export interface VideoAdapter {
  compose(input: VideoComposeInput): Promise<VideoComposeOutput>;
}
```

### 実装方針
- **ブラウザ内完結**。OffscreenCanvas + MediaRecorder + WebAudio
- 児童の発話音声・作成画像はサーバーに送らず、クライアントで MP4 合成
- 生成後のみ `Artwork.videoUrl` としてストレージに保存(児童本人の選択)
- Remotion for Browser を使用する場合も設定を server-less に保つ

---

## 5️⃣ MusicAdapter(Phase 3)

### インタフェース

```ts
// lib/music/adapter.ts
export type MusicComposeInput = {
  moodTags: Array<'gentle' | 'quiet' | 'sad' | 'steady' | 'light' | 'warm'>;
  durationSec: number;                // 10〜60
  key?: 'C' | 'G' | 'D' | 'F';        // 既定は mood から決定
  bpm?: number;
};

export type MusicComposeOutput = {
  audioBlob: Blob;                    // WAV(Tone.Offline で合成)
  score: string;                     // JSON:メロディ+リズム(編集用)
};

export interface MusicAdapter {
  compose(input: MusicComposeInput): Promise<MusicComposeOutput>;
}
```

### 実装方針
- **Tone.js** の OfflineContext を使う
- 楽典不要:児童は mood を選ぶだけ、アルゴリズム的にメロディ生成
- 短いスコア(8〜32 小節)、和音 2〜3 種、単旋律

---

## 6️⃣ CoOccurrenceAnalyzer(Phase 4)

### インタフェース

```ts
// lib/research/cooccurrence.ts
export type CorpusDocument = { userId: string; text: string; phase: 'pre'|'mid'|'post' };

export type CoOccurrenceAnalysis = {
  topTerms: Array<{ term: string; count: number; partOfSpeech: string }>;
  pairs: Array<{ a: string; b: string; count: number; jaccard: number }>;
  phase: 'pre' | 'mid' | 'post';
  childCount: number;
};

export interface CoOccurrenceAnalyzer {
  tokenize(text: string): Promise<Token[]>;
  analyze(documents: CorpusDocument[], phase: 'pre'|'mid'|'post'): Promise<CoOccurrenceAnalysis>;
}
```

### 実装方針
- **kuromoji.js**(Web Worker で初期化、辞書は `public/dict/`)
- ストップワード除去、basic_form 正規化
- 文単位ウインドウで共起ペア算出、Jaccard 係数でスコア
- 結果を [co-occurrence-summary.md](04-prompts/co-occurrence-summary.md) に渡して意味づけ
- 出力は `CoOccurrenceSnapshot` に保存

---

## 7️⃣ AuthAdapter

Auth.js の Provider 設計は [07-auth.md](07-auth.md) を参照。Adapter 観点のみ補足:

- **児童認証ロジック**は `lib/auth/kids-credentials.ts` の `verifyKidEmojiPassword` に集約
- **同意チェック**は middleware で、`ConsentRecord`(教員が代行入力)をセッション毎にキャッシュ
- マジックリンク SMTP プロバイダの切替(開発: MailHog / 本番: SMTP or SendGrid 等)は Auth.js の Provider 設定のみで完結
- **保護者用の Provider は実装しない**(保護者ログインなし、同意は教員経由で記録)
- `AuthAdapter` をインタフェース化しないのは、NextAuth v5 自体が Provider 抽象を提供しているため

---

## 🔁 環境別の組み合わせ

| 環境 | LLM | Image | Storage | DB |
|------|-----|-------|---------|----|
| **ローカル開発** | Anthropic 実 API | Gemini 実 API(任意、なければ stub) | Local FS | SQLite file |
| **教室オンプレ** | Anthropic 実 API | Gemini 実 API | MinIO | SQLite file or Postgres |
| **クラウド本番** | Anthropic 実 API | Gemini 実 API | S3 / R2 / MinIO | Postgres |
| **E2E テスト** | Mock(決定的応答) | Mock | Local FS(一時ディレクトリ) | SQLite in-memory |

### Mock 実装(テスト用)
```ts
// lib/llm/mock.ts
export class MockLLMAdapter implements LLMAdapter {
  constructor(private responses: Record<string, string>) {}
  async complete(input) {
    const key = hashInput(input.messages);
    return { text: this.responses[key] ?? '[mock]', usage: {...}, finishReason: 'stop', latencyMs: 1 };
  }
  // ...
}
```

---

## 🧪 Adapter テスト戦略

- **契約テスト**: 各 Adapter が同じ振る舞いを返すかを共通スイートで検証(put/get/delete の往復など)
- **統合テスト**: 実 API(Anthropic / Gemini)を叩くスモークテスト(CI の夜間のみ)
- **フォールバックテスト**: プライマリを人工的に失敗させて、フォールバックに降りるか

---

## 📦 依存関係の方向

```mermaid
flowchart TB
    App[app/* Route Handlers] --> Lib[lib/*]
    Lib --> Prisma[(DB via Prisma)]
    Lib --> LLMAdapter
    Lib --> ImageGenAdapter
    Lib --> StorageAdapter
    LLMAdapter --> Anthropic[@anthropic-ai/sdk]
    ImageGenAdapter --> Gemini[@google/generative-ai]
    ImageGenAdapter --> OpenAISDK[openai]
    StorageAdapter --> FS[Node fs]
    StorageAdapter --> Minio[minio]
```

**Adapter は直接 DB を触らない**。必要なメタ情報(`AuditLog` 書き込み等)は上位の Route Handler で行う。

---

## 🔗 関連ドキュメント

- [01-architecture.md](01-architecture.md) — 全体構成とディレクトリ
- [04-prompts/](04-prompts/) — LLMAdapter を使うプロンプト群
- [05-safety-and-privacy.md](05-safety-and-privacy.md) — 画像生成のセーフティ連携
- [02-data-model.md](02-data-model.md) — AuditLog と ModerationLog
