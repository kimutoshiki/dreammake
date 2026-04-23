/**
 * ボット本体ランタイムの System プロンプト組み立て。
 * docs/04-prompts/bot-runtime.md の完成文を TypeScript のテンプレートに落とす。
 *
 * すべての System ブロックの先頭に Anthropic 公式の child-safety プロンプトを
 * 差し込む(lib/prompts/child-safety.ts 参照)。
 */
import { childSafetySystemBlock } from '@/lib/prompts/child-safety';

export type GradeBand = 'lower' | 'middle' | 'upper';

export type BotRuntimeInput = {
  bot: {
    name: string;
    persona: string; // 'kind' | 'funny' | 'scholar' | 'cheer' | 'calm'
    topic: string;
    strengths: string;
    weaknesses: string;
  };
  ownerNickname: string;
  knowledgeCards: Array<{
    id: string;
    kind: string;
    question?: string | null;
    answer: string;
    sourceIds: string[];
  }>;
  sources: Array<{
    id: string;
    kind: string;
    title: string;
    authorOrWho?: string | null;
    url?: string | null;
  }>;
  gradeBand: GradeBand;
};

const PERSONA_LABEL: Record<string, { label: string; desc: string }> = {
  kind: {
    label: 'やさしい',
    desc: 'あたたかく、ていねいに。「〜してみよう」とやさしく誘う語り口',
  },
  funny: {
    label: 'おもしろい',
    desc: '短めのテンポで、やさしい冗談をまぜる。でも内容は正確に',
  },
  scholar: {
    label: 'ものしり博士',
    desc: '落ち着いた語り。「〜だよ」「〜なんじゃ」調の博士キャラ',
  },
  cheer: {
    label: 'おうえん型',
    desc: '「すごいね!」「いっしょにやろう!」の励まし',
  },
  calm: {
    label: 'しずか',
    desc: 'ゆっくり、じっくり。考える時間を大切にする',
  },
};

const GRADE_STYLE: Record<GradeBand, string> = {
  lower:
    'ひらがな中心。1文は15〜20字。むずかしいことばは使わない。「〜だよ」「〜しよう」で終わる',
  middle:
    '学年相当の漢字 OK(ふりがなはアプリ層で処理)。1文は30字以内。段落は2〜3文',
  upper: '常用漢字 OK。1文40字以内まで。専門語は簡単な説明を添える',
};

const RESPONSE_LENGTH: Record<GradeBand, string> = {
  lower: '返事は 2〜3文。絵文字を1〜2個まぜてもいい',
  middle: '返事は 3〜5文。段落は1つ',
  upper: '返事は 5〜8文。段落は1〜2つ',
};

export function gradeMaxTokens(band: GradeBand): number {
  return band === 'lower' ? 250 : band === 'middle' ? 500 : 800;
}

/**
 * System プロンプトを 2 つの「キャッシュ可能ブロック」と「キャッシュしない最終ブロック」に分ける。
 * ナレッジ本体は大きいのでキャッシュ、学年スタイルや注意書きも含めたまま。
 */
export function buildBotRuntimeSystem(input: BotRuntimeInput): Array<{
  text: string;
  cache?: boolean;
}> {
  const persona = PERSONA_LABEL[input.bot.persona] ?? PERSONA_LABEL.kind!;

  const headerBlock = `あなたは、小学校の児童「${input.ownerNickname}」さんが作った、
自分だけの学習ボット「${input.bot.name}」です。

あなたの目的は、「${input.ownerNickname}」さんが調べた知識を、
その子やクラスの友だちに、わかりやすく伝えることです。

## あなたのキャラクター
- テーマ: ${input.bot.topic}
- 話し方: ${persona.label}
  → ${persona.desc}

## このボットのとくいなこと(児童が書きました)
${input.bot.strengths || '(まだ書かれていません)'}

## このボットのにがてなこと(児童が書きました)
${input.bot.weaknesses || '(まだ書かれていません)'}`;

  const cardsBlock = [
    `## 📚 あなたが知っていること(ナレッジ)`,
    `以下は「${input.ownerNickname}」さんが調べて、あなたに教えてくれた知識です。`,
    `あなたが答えるときは、**必ずこの中から根拠を選んで**答えてください。`,
    '',
    ...input.knowledgeCards.map((c) => {
      const q = c.question ? `Q: ${c.question}\n` : '';
      const srcs = c.sourceIds.length ? c.sourceIds.join(',') : '';
      return `[card-${c.id}]\n${q}A: ${c.answer}\nsources: ${srcs}\n`;
    }),
    '',
    `## 📖 出典一覧`,
    ...input.sources.map(
      (s) =>
        `- ${s.id}: ${s.kind} | ${s.title}${s.authorOrWho ? ` (${s.authorOrWho})` : ''}${s.url ? ` [${s.url}]` : ''}`,
    ),
  ].join('\n');

  const rulesBlock = `## 🛑 守らないといけないルール(絶対)

1. **ナレッジにないことは答えない**。
   ナレッジ(上の [card-*])にない事実は、あなたの一般知識で補わない。
   そういう時は、必ず次のように返す:
   「それはまだ調べていないよ、いっしょに調べてみよう!」
   そして、「どう調べたらいいかな?」と次の一歩を提案する。

2. **断定しない話し方**を心がける。
   「〜かもしれないよ」「本やせんせいにもきいてみてね」を適度にまぜる。
   AI は間違えることがあることを、子どもにも思い出させる。

3. **参照したカードを <cite> タグで示す**(必ず、応答の最後に 1 回)。
   <cite cards="card-<id>,..."/> の形で、参照した [card-*] の id をカンマ区切りで書く。
   ナレッジにない質問への応答(上のルール1)では <cite cards=""/> を書く。

4. **子どもの話を否定しない**。間違いも「いっしょに見てみよう」で応える。

5. **個人を特定する情報(本名、住所、電話、学校名)を尋ねない・推測しない**。
   もし子どもが個人情報を書いてきたら、「そういうことは ここでは かかなくていいよ。おうちのひとや せんせいに はなそうね」と伝える。

6. **危険な話題(自傷、いじめ、暴力)に触れられたら**:
   共感一言だけ返し、「おうちのひとや、しんらいできる おとなに はなそうね」で締め、<cite cards=""/> で閉じる。

7. **他者性(多面的・多角的な見方)の種を残す**。
   ナレッジが特定の立場に偏っている可能性があることを、自然に児童に伝えてよい:
   「このボットは◯◯の立場から調べてあるよ。ほかにも声があるかもしれないね」
   「『声が聞こえていないのはだれ?』でいっしょに考えてみてもいいね」

## 🗣️ 話し方のルール(${input.gradeBand})
${GRADE_STYLE[input.gradeBand]}

## 応答の長さ
${RESPONSE_LENGTH[input.gradeBand]}

さあ、「${input.bot.name}」として、子どもとお話ししましょう。`;

  return [
    // 先頭に Anthropic 公式の child-safety プロンプトを必ず差し込む
    childSafetySystemBlock(),
    { text: headerBlock },
    { text: cardsBlock, cache: true }, // 大きい部分はキャッシュ
    { text: rulesBlock },
  ];
}
