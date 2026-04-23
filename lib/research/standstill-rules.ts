/**
 * 立ち止まりの言葉をルールベースで検出する。
 *
 * 児童の振り返り・対話から「でも」「なぜ」「別の見方をすれば」などを抽出し、
 * カテゴリ別に集計。完全ではないが、軽量で決定的な指標として使える。
 *
 * 将来、Claude Haiku による追加検出を重ねて、ニュアンスのある言い回しも拾えるようにする。
 */

export type StandstillCategory =
  | 'hesitation'
  | 'questioning'
  | 'reframing'
  | 'self-correction'
  | 'empathizing'
  | 'uncertainty';

export type StandstillMatch = {
  term: string;
  phrase: string;
  position: { start: number; end: number };
  category: StandstillCategory;
};

type Rule = {
  term: string;
  category: StandstillCategory;
  /** 助詞的用法(「でも行く」)を弾くための前後コンテキストチェック(任意)。 */
  contextOk?: (before: string, after: string) => boolean;
};

const RULES: Rule[] = [
  { term: 'でも', category: 'hesitation' },
  { term: 'けれど', category: 'hesitation' },
  { term: 'しかし', category: 'hesitation' },
  { term: 'だけど', category: 'hesitation' },
  { term: 'なぜ', category: 'questioning' },
  { term: 'どうして', category: 'questioning' },
  { term: 'ほんとに', category: 'questioning' },
  { term: '本当に', category: 'questioning' },
  { term: '別の見方', category: 'reframing' },
  { term: '違う見方', category: 'reframing' },
  { term: 'ちがう見方', category: 'reframing' },
  { term: 'もしかしたら', category: 'reframing' },
  { term: 'やっぱり', category: 'self-correction' },
  { term: 'の気持ちになる', category: 'empathizing' },
  { term: 'の立場', category: 'empathizing' },
  { term: 'もしわたしが', category: 'empathizing' },
  { term: 'もしぼくが', category: 'empathizing' },
  { term: 'もし私が', category: 'empathizing' },
  { term: 'わからない', category: 'uncertainty' },
  { term: '分からない', category: 'uncertainty' },
  { term: '迷う', category: 'uncertainty' },
  { term: '決められない', category: 'uncertainty' },
];

export function detectStandstillWords(text: string): {
  matches: StandstillMatch[];
  countsByCategory: Record<StandstillCategory, number>;
  total: number;
} {
  const matches: StandstillMatch[] = [];
  for (const rule of RULES) {
    let from = 0;
    while (true) {
      const idx = text.indexOf(rule.term, from);
      if (idx === -1) break;
      const before = text.slice(Math.max(0, idx - 1), idx);
      const after = text.slice(idx + rule.term.length, idx + rule.term.length + 1);
      const okCtx = rule.contextOk ? rule.contextOk(before, after) : true;
      if (okCtx) {
        matches.push({
          term: rule.term,
          phrase: extractSentenceAround(text, idx),
          position: { start: idx, end: idx + rule.term.length },
          category: rule.category,
        });
      }
      from = idx + rule.term.length;
    }
  }
  matches.sort((a, b) => a.position.start - b.position.start);

  const counts: Record<StandstillCategory, number> = {
    hesitation: 0,
    questioning: 0,
    reframing: 0,
    'self-correction': 0,
    empathizing: 0,
    uncertainty: 0,
  };
  for (const m of matches) counts[m.category] += 1;
  return { matches, countsByCategory: counts, total: matches.length };
}

function extractSentenceAround(text: string, idx: number): string {
  const sepRe = /[。！？\n]/;
  // 前方
  let start = idx;
  while (start > 0 && !sepRe.test(text[start - 1]!)) start--;
  let end = idx;
  while (end < text.length && !sepRe.test(text[end]!)) end++;
  return text.slice(start, Math.min(end + 1, text.length)).trim();
}

export function encouragementFor(
  count: number,
  band: 'lower' | 'middle' | 'upper',
): string {
  if (count === 0) {
    return band === 'lower'
      ? 'つぎは、たちどまって かんがえた ことばを 書いてみよう!'
      : '次はぜひ、立ち止まって考えた言葉を書いてみてね。';
  }
  if (count <= 3) {
    return band === 'lower'
      ? `${count}かい、たちどまって かんがえられたね`
      : `${count}回、立ち止まって考えられたね。`;
  }
  return band === 'lower'
    ? 'たくさん たちどまって かんがえているね。すごいよ!'
    : 'たくさん立ち止まって考えているね。とても良い姿勢だよ。';
}
