/**
 * 入力モデレーションのエントリポイント。
 *   - まずルールベースで即判定
 *   - 決着しなければ Claude Haiku で判定
 *   - 結果は ModerationLog に記録(呼び出し側の責任)
 */
import { completeJson } from '@/lib/llm/anthropic';
import { env } from '@/lib/env';
import {
  buildModerationSystem,
  type ModerationResult,
  type ModerationStage,
} from '@/lib/prompts/moderation';
import { prejudgeByRules } from '@/lib/moderation/rules';

function coerceResult(raw: unknown): ModerationResult {
  const r = raw as Partial<ModerationResult>;
  const decision = r.decision;
  if (decision !== 'safe' && decision !== 'soft-flag' && decision !== 'hard-block') {
    throw new Error('moderation decision invalid');
  }
  return {
    decision,
    categories: Array.isArray(r.categories) ? (r.categories as ModerationResult['categories']) : [],
    confidence: typeof r.confidence === 'number' ? r.confidence : 0.5,
    reason: typeof r.reason === 'string' ? r.reason : '',
    suggestedAction: r.suggestedAction,
  };
}

export async function moderateInput(params: {
  text: string;
  stage: ModerationStage;
}): Promise<ModerationResult & { model: string }> {
  const pre = prejudgeByRules(params.text);
  if (pre.decided) {
    return {
      decision: pre.decision!,
      categories: pre.categories ?? [],
      confidence: 1.0,
      reason: pre.reason ?? '',
      suggestedAction:
        pre.decision === 'hard-block' ? 'discard' : 'notify-teacher',
      model: 'rules',
    };
  }

  const system = buildModerationSystem(params.stage);
  try {
    const result = await completeJson(
      {
        system: { text: system },
        messages: [{ role: 'user', content: params.text }],
        model: env.ANTHROPIC_MODEL_MODERATION,
        temperature: 0,
        maxTokens: 200,
      },
      coerceResult,
    );
    return { ...result, model: env.ANTHROPIC_MODEL_MODERATION };
  } catch (err) {
    // フェイルセーフ: 判定できなかったら soft-flag で保存、教員通知
    console.error('moderation-input failed, failing safe to soft-flag', err);
    return {
      decision: 'soft-flag',
      categories: [],
      confidence: 0.3,
      reason: `moderation error: ${err instanceof Error ? err.message : String(err)}`,
      suggestedAction: 'notify-teacher',
      model: env.ANTHROPIC_MODEL_MODERATION,
    };
  }
}
