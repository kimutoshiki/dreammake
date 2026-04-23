/**
 * ルールベースの PII / URL 検出。LLM を呼ぶ前に素早く確定判定を返す。
 */

export type RuleFinding = {
  kind: 'phone' | 'email' | 'external-url' | 'empty' | 'address-number';
  match: string;
  index: number;
};

const PHONE_RE = /0\d{1,4}-?\d{1,4}-?\d{3,4}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_RE = /https?:\/\/[^\s<>()]+/g;
// 〇丁目〇番地〇号 / 〇-〇-〇 のような住所っぽい連番
const ADDRESS_RE = /\d{1,3}(?:丁目|番地|番|号|[-ー‐−])\d{1,4}(?:番地|号|[-ー‐−]\d{1,4})?/g;

export function scanForRuleHits(text: string): RuleFinding[] {
  const findings: RuleFinding[] = [];
  if (!text.trim()) {
    findings.push({ kind: 'empty', match: '', index: 0 });
    return findings;
  }
  for (const m of text.matchAll(PHONE_RE)) {
    if (m.index !== undefined) {
      findings.push({ kind: 'phone', match: m[0], index: m.index });
    }
  }
  for (const m of text.matchAll(EMAIL_RE)) {
    if (m.index !== undefined) {
      findings.push({ kind: 'email', match: m[0], index: m.index });
    }
  }
  for (const m of text.matchAll(URL_RE)) {
    if (m.index !== undefined) {
      findings.push({ kind: 'external-url', match: m[0], index: m.index });
    }
  }
  for (const m of text.matchAll(ADDRESS_RE)) {
    if (m.index !== undefined) {
      findings.push({ kind: 'address-number', match: m[0], index: m.index });
    }
  }
  return findings;
}

/**
 * ルールベース判定の一次結果。
 *   - 電話 / メール / 番地数字 は即 hard-block (pii)
 *   - 外部 URL は soft-flag (lure)
 *   - 空文字は safe を即返し
 *   - その他は LLM モデレーションに回す
 */
export function prejudgeByRules(text: string): {
  decided: boolean;
  decision?: 'safe' | 'soft-flag' | 'hard-block';
  categories?: Array<'pii' | 'lure'>;
  reason?: string;
} {
  const hits = scanForRuleHits(text);
  if (hits.find((h) => h.kind === 'empty')) {
    return { decided: true, decision: 'safe', categories: [], reason: '空入力' };
  }
  if (hits.find((h) => ['phone', 'email', 'address-number'].includes(h.kind))) {
    return {
      decided: true,
      decision: 'hard-block',
      categories: ['pii'],
      reason: 'ルール: 電話/メール/番地を検出',
    };
  }
  if (hits.find((h) => h.kind === 'external-url')) {
    return {
      decided: true,
      decision: 'soft-flag',
      categories: ['lure'],
      reason: 'ルール: 外部 URL を検出',
    };
  }
  return { decided: false };
}
