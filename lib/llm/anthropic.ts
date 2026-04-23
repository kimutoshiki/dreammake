/**
 * Anthropic Claude API の薄いラッパー。
 *
 * - デフォルトモデル(Sonnet)と モデレーションモデル(Haiku)を区別
 * - プロンプトキャッシュをサポート
 * - ストリーミング対応(SSE 用)
 * - JSON 強制ヘルパー
 * - ANTHROPIC_API_KEY 未設定時はモック応答を返し、開発体験を壊さない
 */
import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

export type LLMMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type LLMSystemBlock = {
  text: string;
  cache?: boolean;
};

export type LLMCompleteInput = {
  system: LLMSystemBlock | LLMSystemBlock[];
  messages: LLMMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
};

export type LLMCompleteOutput = {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
  };
  finishReason: string;
  latencyMs: number;
  model: string;
  mocked: boolean;
};

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  if (!client) {
    client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      maxRetries: env.ANTHROPIC_MAX_RETRIES,
      timeout: env.ANTHROPIC_TIMEOUT_MS,
    });
  }
  return client;
}

function systemToBlocks(input: LLMSystemBlock | LLMSystemBlock[]) {
  const blocks = Array.isArray(input) ? input : [input];
  return blocks.map((b) => ({
    type: 'text' as const,
    text: b.text,
    ...(b.cache ? { cache_control: { type: 'ephemeral' as const } } : {}),
  }));
}

/** 非ストリーミングで 1 回分の応答を取得。 */
export async function complete(
  input: LLMCompleteInput,
): Promise<LLMCompleteOutput> {
  const c = getClient();
  const model = input.model ?? env.ANTHROPIC_MODEL_DEFAULT;
  const start = Date.now();

  if (!c) {
    // 開発モード:API キー未設定でも画面が動くようにモック応答を返す
    return mockResponse(input, model, start);
  }

  const res = await c.messages.create({
    model,
    max_tokens: input.maxTokens ?? 800,
    temperature: input.temperature ?? 0.4,
    system: systemToBlocks(input.system),
    messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    stop_sequences: input.stopSequences,
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  return {
    text,
    usage: {
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      cacheReadInputTokens: (res.usage as unknown as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? undefined,
      cacheCreationInputTokens: (res.usage as unknown as { cache_creation_input_tokens?: number }).cache_creation_input_tokens ?? undefined,
    },
    finishReason: res.stop_reason ?? 'stop',
    latencyMs: Date.now() - start,
    model,
    mocked: false,
  };
}

/** Claude の応答をチャンク単位で yield する AsyncIterable。 */
export async function* stream(
  input: LLMCompleteInput,
): AsyncIterable<{ type: 'delta'; delta: string } | { type: 'done'; output: LLMCompleteOutput }> {
  const c = getClient();
  const model = input.model ?? env.ANTHROPIC_MODEL_DEFAULT;
  const start = Date.now();

  if (!c) {
    const mock = await mockResponse(input, model, start);
    // 1文字ずつ(小さすぎるので 10文字ずつ)チャンク化して模擬ストリーム
    const chunks = mock.text.match(/.{1,20}/gs) ?? [];
    for (const chunk of chunks) {
      await new Promise((r) => setTimeout(r, 40));
      yield { type: 'delta', delta: chunk };
    }
    yield { type: 'done', output: mock };
    return;
  }

  const res = c.messages.stream({
    model,
    max_tokens: input.maxTokens ?? 800,
    temperature: input.temperature ?? 0.4,
    system: systemToBlocks(input.system),
    messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    stop_sequences: input.stopSequences,
  });

  for await (const chunk of res) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      yield { type: 'delta', delta: chunk.delta.text };
    }
  }

  const final = await res.finalMessage();
  const text = final.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  yield {
    type: 'done',
    output: {
      text,
      usage: {
        inputTokens: final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
        cacheReadInputTokens: (final.usage as unknown as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? undefined,
        cacheCreationInputTokens: (final.usage as unknown as { cache_creation_input_tokens?: number }).cache_creation_input_tokens ?? undefined,
      },
      finishReason: final.stop_reason ?? 'stop',
      latencyMs: Date.now() - start,
      model,
      mocked: false,
    },
  };
}

/** JSON を強制して返す(モデルのテキスト応答から JSON 部分を抽出)。 */
export async function completeJson<T>(
  input: LLMCompleteInput,
  parser: (raw: unknown) => T,
): Promise<T> {
  const out = await complete(input);
  const raw = extractJson(out.text);
  return parser(raw);
}

function extractJson(text: string): unknown {
  // コードフェンス剥がし
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1]! : text;
  const trimmed = candidate.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // 最初の { から最後の } を取る簡易フォールバック
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first >= 0 && last > first) {
      return JSON.parse(trimmed.slice(first, last + 1));
    }
    throw new Error(`LLM output is not valid JSON: ${trimmed.slice(0, 200)}`);
  }
}

// -------------------------------------------------------------------
// モック応答:ANTHROPIC_API_KEY 未設定時に開発体験を維持するための最小実装。
// 実運用では必ず API キーを設定する前提。
// -------------------------------------------------------------------
async function mockResponse(
  input: LLMCompleteInput,
  model: string,
  start: number,
): Promise<LLMCompleteOutput> {
  const last = input.messages[input.messages.length - 1]?.content ?? '';
  const sysText = Array.isArray(input.system)
    ? input.system.map((s) => s.text).join('\n')
    : input.system.text;

  let text: string;
  if (sysText.includes('JSON') && sysText.includes('decision')) {
    // モデレーション系のモック
    text = JSON.stringify({
      decision: 'safe',
      categories: [],
      confidence: 0.9,
      reason: '(mock) API キー未設定のため安全側に判定',
      suggestedAction: undefined,
    });
  } else if (sysText.includes('missing') || sysText.includes('出てこない')) {
    text = JSON.stringify({
      prominentInRecentExchange: [
        { label: '大人のお店の人', whyProminent: '(mock) 対話で多く登場した視点' },
      ],
      possiblyMissingVoices: [
        {
          label: '赤ちゃん・小さな子',
          whyMightBeMissing: 'まだ言葉にしにくい立場だから',
          suggestedProbe: '保護者や保育園の人に聞いてみよう',
        },
        {
          label: 'その町の動物・川',
          whyMightBeMissing: '人以外の声は AI も拾いにくいよ',
          suggestedProbe: '川や林を観察してみよう',
        },
      ],
      invitation: '(mock) あなたが大切だと思う声はどれ?その人にどう聞いてみる?',
      sourceHint: '(mock) 学習データの傾向から',
    });
  } else {
    const snippet =
      last.length > 40 ? last.slice(0, 40) + '…' : last || 'こんにちは';
    text = `(開発モードの仮の返事です)\n\n「${snippet}」について、ナレッジに書かれたことから答えたいところですが、今は API キーが設定されていません。\n\nそれはまだ調べていないよ、いっしょに調べてみよう!\n<cite cards=""/>`;
  }

  return {
    text,
    usage: { inputTokens: 0, outputTokens: 0 },
    finishReason: 'stop',
    latencyMs: Date.now() - start,
    model,
    mocked: true,
  };
}
