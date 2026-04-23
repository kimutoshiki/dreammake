import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { isChildSafetyPromptPlaceholder } from '@/lib/prompts/child-safety';

/**
 * ヘルスチェック・エンドポイント。
 *
 * 開発中に環境変数が正しく読めているか、主要フラグの状態を素早く確認するため。
 * 秘密情報(API キー等)は絶対に返さない。
 */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    phase: 'Phase 1 (scaffold)',
    nodeEnv: env.NODE_ENV,
    features: {
      researchEnabled: env.RESEARCH_FEATURES_ENABLED,
      standstillUseLlm: env.STANDSTILL_USE_LLM,
      surveyAiGen: env.SURVEY_AI_GEN_ENABLED,
      chatLogReturn: env.CHAT_LOG_RETURN_ENABLED,
      imageProvider: env.IMAGE_PROVIDER,
      storageProvider: env.STORAGE_PROVIDER,
    },
    anthropicConfigured: Boolean(env.ANTHROPIC_API_KEY),
    authSecretConfigured: Boolean(env.AUTH_SECRET),
    childSafetyPrompt: isChildSafetyPromptPlaceholder()
      ? 'placeholder (replace with Anthropic official prompt before deploy)'
      : 'configured',
    dailyLlmLimitPerUser: env.SAFETY_DAILY_LLM_CALL_LIMIT_PER_USER,
    defaultGradeProfile: env.DEFAULT_GRADE_PROFILE,
    timestamp: new Date().toISOString(),
  });
}
