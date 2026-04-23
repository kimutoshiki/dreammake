/**
 * 環境変数の集中管理と Zod による検証。
 *
 * Node.js サーバー側でのみ使用。クライアントバンドルには絶対に含めない。
 * 使い方: `import { env } from '@/lib/env'`
 *
 * 検証に失敗した場合はプロセス起動時にエラーで落とす(Phase 1 は fail-fast)。
 */
import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true');

/** 空文字列("")は未設定と同じに扱う(.env.example のまま空で残されやすいため)。 */
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v == null || v === '' ? undefined : v));

const optionalEmail = z
  .string()
  .optional()
  .transform((v) => (v == null || v === '' ? undefined : v))
  .pipe(z.string().email().optional());

const EnvSchema = z.object({
  // --- ランタイム ---
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // --- Anthropic ---
  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL_DEFAULT: z.string().default('claude-sonnet-4-6'),
  ANTHROPIC_MODEL_MODERATION: z.string().default('claude-haiku-4-5-20251001'),
  ANTHROPIC_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
  ANTHROPIC_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30000),

  // --- 画像生成(Phase 2 以降、Phase 1 は未使用でも OK) ---
  IMAGE_PROVIDER: z.enum(['gemini', 'openai', 'none']).default('none'),
  GOOGLE_API_KEY: optionalString,
  GEMINI_IMAGE_MODEL: z.string().default('imagen-3'),
  OPENAI_API_KEY: optionalString,
  OPENAI_IMAGE_MODEL: z.string().default('gpt-image-1'),

  // --- DB / ストレージ ---
  DATABASE_URL: z.string().default('file:./dev.db'),
  STORAGE_PROVIDER: z.enum(['local', 'minio']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage'),
  MINIO_ENDPOINT: optionalString,
  MINIO_PORT: z.coerce.number().int().optional(),
  MINIO_USE_SSL: booleanFromString.default('false'),
  MINIO_ACCESS_KEY: optionalString,
  MINIO_SECRET_KEY: optionalString,
  MINIO_BUCKET: z.string().default('shirabete-tsukurou'),

  // --- 認証 ---
  AUTH_SECRET: optionalString,
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  SMTP_FROM: z.string().default('noreply@shirabete-tsukurou.local'),

  // --- 絵柄パスワード ---
  KIDS_EMOJI_POOL_SIZE: z.coerce.number().int().min(4).max(30).default(12),
  KIDS_EMOJI_PASSWORD_LENGTH: z.coerce.number().int().min(2).max(6).default(3),
  KIDS_AUTH_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  KIDS_AUTH_LOCKOUT_MINUTES: z.coerce.number().int().min(1).default(10),

  // --- 安全設計 ---
  SAFETY_DAILY_LLM_CALL_LIMIT_PER_USER: z.coerce.number().int().default(100),
  SAFETY_CONTINUOUS_USE_WARN_MINUTES: z.coerce.number().int().default(20),
  SAFETY_FACE_BLUR_DEFAULT: booleanFromString.default('true'),
  SAFETY_INCIDENT_NOTIFY_EMAIL: optionalEmail,

  // --- 探究単元・研究機能 ---
  RESEARCH_FEATURES_ENABLED: booleanFromString.default('true'),
  RESEARCH_ANONYMOUS_ID_PEPPER: optionalString,
  STANDSTILL_USE_LLM: booleanFromString.default('true'),
  KUROMOJI_DICT_PATH: z.string().default('./public/dict'),
  SURVEY_AI_GEN_ENABLED: booleanFromString.default('true'),
  RESEARCH_DATA_RETENTION_DAYS: z.coerce.number().int().default(365),
  UNIT_MAX_HOURS: z.coerce.number().int().min(1).max(50).default(20),
  CHAT_LOG_RETURN_ENABLED: booleanFromString.default('true'),

  // --- 表現系 ---
  VIDEO_MAX_DURATION_SEC: z.coerce.number().int().default(60),
  MUSIC_MAX_DURATION_SEC: z.coerce.number().int().default(60),
  VIDEO_MAX_SLIDES: z.coerce.number().int().default(8),

  // --- アプリ ---
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  DEFAULT_GRADE_PROFILE: z.enum(['lower', 'middle', 'upper']).default('middle'),
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().default(365),

  // --- 開発支援 ---
  SENTRY_DSN: optionalString,
  POSTHOG_KEY: optionalString,
  POSTHOG_HOST: z.string().default('https://app.posthog.com'),
});

function loadEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ 環境変数の検証に失敗しました:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
