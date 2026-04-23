/**
 * 事前/事後アンケートの既定テンプレ。
 * 測定の 3 軸(初期立場・多数派集中度・違う考えへの意識)を含む。
 * 教員が後から編集できる前提の骨子。
 */

export type SurveyAxis =
  | 'axis-initial-position'
  | 'axis-majority-pull'
  | 'axis-other-awareness'
  | 'context'
  | 'post-reflection';

export type SurveyQuestion = {
  id: string;
  axis: SurveyAxis;
  kind: 'single-choice' | 'likert-5' | 'short-text' | 'long-text';
  questionJa: string;
  choices?: Array<{ id: string; labelJa: string }>;
  likertLabels?: { min: string; max: string };
  hintJa?: string;
  stableAcrossPrePost: boolean;
  required: boolean;
};

export type DefaultSurvey = {
  title: string;
  introJa: string;
  questions: SurveyQuestion[];
};

export function buildDefaultSurvey(
  kind: 'pre' | 'post',
  unit: { title: string; themeQuestion: string; stances: Array<{ label: string }> },
): DefaultSurvey {
  const stanceChoices = unit.stances
    .slice(0, 5)
    .map((s, i) => ({ id: `stance-${i}`, labelJa: s.label }));
  stanceChoices.push({ id: 'none', labelJa: 'まだ 決められない・わからない' });

  const questions: SurveyQuestion[] = [
    {
      id: 'q-initial-1',
      axis: 'axis-initial-position',
      kind: 'single-choice',
      questionJa: `「${unit.themeQuestion}」と聞いて、いちばん 気になる 立場は どれ?`,
      choices: stanceChoices,
      stableAcrossPrePost: true,
      required: true,
    },
    {
      id: 'q-initial-2',
      axis: 'axis-initial-position',
      kind: 'short-text',
      questionJa: 'その 立場に 気持ちが 向いた 理由は?',
      stableAcrossPrePost: true,
      required: false,
    },
    {
      id: 'q-majority-1',
      axis: 'axis-majority-pull',
      kind: 'likert-5',
      questionJa: 'まわりの 人と 同じ 意見を いう 方が あんしんする。',
      likertLabels: { min: 'そう思わない', max: 'そう思う' },
      stableAcrossPrePost: true,
      required: true,
    },
    {
      id: 'q-majority-2',
      axis: 'axis-majority-pull',
      kind: 'likert-5',
      questionJa: 'みんなと ちがう 意見は 言いにくい と 感じる。',
      likertLabels: { min: 'そう思わない', max: 'そう思う' },
      stableAcrossPrePost: true,
      required: true,
    },
    {
      id: 'q-majority-3',
      axis: 'axis-majority-pull',
      kind: 'likert-5',
      questionJa: '自分の 考えと にた 意見が 多いと うれしい。',
      likertLabels: { min: 'そう思わない', max: 'そう思う' },
      stableAcrossPrePost: true,
      required: true,
    },
    {
      id: 'q-other-1',
      axis: 'axis-other-awareness',
      kind: 'likert-5',
      questionJa: '自分と ちがう 考えの 人がいても、話を 最後まで 聞けると 思う。',
      likertLabels: { min: 'そう思わない', max: 'そう思う' },
      stableAcrossPrePost: true,
      required: true,
    },
    {
      id: 'q-other-2',
      axis: 'axis-other-awareness',
      kind: 'likert-5',
      questionJa: '自分と ちがう 意見を 聞くと、ちがう 見方を してみたくなる。',
      likertLabels: { min: 'そう思わない', max: 'そう思う' },
      stableAcrossPrePost: true,
      required: true,
    },
    {
      id: 'q-other-3',
      axis: 'axis-other-awareness',
      kind: 'long-text',
      questionJa: `「${unit.themeQuestion}」について、自分と ちがう 意見の 人は、どんな 理由で そう 考えていると 思う?`,
      stableAcrossPrePost: true,
      required: false,
    },
    {
      id: 'q-context-1',
      axis: 'context',
      kind: 'short-text',
      questionJa: 'この テーマについて、家の人や 友だちと 話すことは ある?',
      stableAcrossPrePost: true,
      required: false,
    },
  ];

  if (kind === 'post') {
    questions.push(
      {
        id: 'q-post-1',
        axis: 'post-reflection',
        kind: 'long-text',
        questionJa:
          '単元の 前と 後で、自分の 考えは 変わった?変わらなかった?どう?',
        stableAcrossPrePost: false,
        required: false,
      },
      {
        id: 'q-post-2',
        axis: 'post-reflection',
        kind: 'long-text',
        questionJa:
          'いま、自分と ちがう 意見の 人に どう 話してみたい?',
        stableAcrossPrePost: false,
        required: false,
      },
    );
  }

  return {
    title:
      kind === 'pre' ? `事前アンケート:${unit.title}` : `事後アンケート:${unit.title}`,
    introJa:
      kind === 'pre'
        ? 'この 単元の はじめに、あなたの 考えや 気持ちを おしえてね。正解は ないから、じぶんで 思うままに こたえて 大丈夫だよ。'
        : 'この 単元が 終わりました。いま 感じていることを、ゆっくり 書いてみよう。',
    questions,
  };
}
