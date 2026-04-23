/**
 * サーバー側で enforce する LLM 呼び出しのレート制限。
 *
 * 方針:
 *  - AuditLog (action='llm-call') を集計して、1 ユーザーの直近 24h の呼び出し数を数える
 *  - env.SAFETY_DAILY_LLM_CALL_LIMIT_PER_USER を超えたら制限
 *
 * 設計ポイント:
 *  - Anthropic Console の支出上限アラートと二重化(Console はアカウント全体)
 *  - 児童が大量リクエストを送っても、このアプリ側で止められる
 *  - 教員ダッシュボードで超過検知を可視化する土台(Phase 4 で UI 化)
 *
 * 注意: ここでは DB count を使う。高負荷環境では Redis + 固定ウィンドウに置換。
 */
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type RateLimitStatus = {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: Date;
};

export async function checkLLMRateLimit(userId: string): Promise<RateLimitStatus> {
  const since = new Date(Date.now() - WINDOW_MS);
  const used = await prisma.auditLog.count({
    where: {
      actorId: userId,
      action: 'llm-call',
      createdAt: { gte: since },
    },
  });
  const limit = env.SAFETY_DAILY_LLM_CALL_LIMIT_PER_USER;
  return {
    allowed: used < limit,
    used,
    limit,
    resetAt: new Date(Date.now() + WINDOW_MS),
  };
}

export function rateLimitMessageJa(status: RateLimitStatus): string {
  return `きょうは たくさん しらべたね!(${status.used}/${status.limit}かい)。つづきは あしたに しようね。`;
}
