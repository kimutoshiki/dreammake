/**
 * ボット応答に対する出典の機械的付与。
 *
 * LLM 側にも <cite cards="..."/> タグを出してもらうが、最終的な出典表記は
 * アプリ層でカード ID → Source.title に解決して機械付与する。
 * これにより、LLM の気まぐれや失念に関わらず出典が必ず添えられる。
 */

export type CitedSource = { id: string; title: string };

const CITE_TAG_RE = /<cite\s+cards="([^"]*)"\s*\/>/i;

export function parseCiteTag(text: string): {
  cardIds: string[];
  body: string;
} {
  const match = text.match(CITE_TAG_RE);
  if (!match) return { cardIds: [], body: text.trim() };
  const ids = (match[1] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const body = text.replace(CITE_TAG_RE, '').trim();
  return { cardIds: ids, body };
}

/**
 * ボット応答の末尾に「📚 出典:◯◯、△△」を付与する。
 * sources が空のときは出典行を出さない(「調べていないよ」応答を想定)。
 */
export function appendCitation(
  body: string,
  sources: CitedSource[],
): string {
  if (sources.length === 0) return body;
  const titles = sources.map((s) => s.title).join('、');
  return `${body}\n\n📚 出典:${titles}`;
}
