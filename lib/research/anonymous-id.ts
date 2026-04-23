/**
 * 研究用の匿名 ID。
 * 単元内で一貫、単元間では異なる。
 *   hash(userId + unitId + pepper)
 */
import { createHash } from 'node:crypto';
import { env } from '@/lib/env';

export function anonymousId(userId: string, unitId: string): string {
  const pepper = env.RESEARCH_ANONYMOUS_ID_PEPPER ?? '';
  return createHash('sha256')
    .update(`${userId}|${unitId}|${pepper}`)
    .digest('base64url')
    .slice(0, 16);
}
