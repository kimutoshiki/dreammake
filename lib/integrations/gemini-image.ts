/**
 * Google Gemini(Imagen 3)による画像生成。
 *
 * プロンプトは必ず 2 段階で処理する:
 *   1. Claude Haiku で 「安全化 + 英訳」(画像 API に渡してよいかの判定を含む)
 *   2. 承認されたら Gemini Imagen で 生成
 *
 * GOOGLE_API_KEY が未設定 なら モックで動く(開発体験維持)。
 */
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { env } from '@/lib/env';

export type ImageGenResult = {
  bytes: Uint8Array;
  mimeType: string;
  model: string;
  mocked: boolean;
};

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!env.GOOGLE_API_KEY) return null;
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });
  }
  return client;
}

export async function generateImage(
  promptEn: string,
  aspectRatio: '1:1' | '3:4' | '4:3' = '1:1',
): Promise<ImageGenResult> {
  const c = getClient();
  const model = env.GEMINI_IMAGE_MODEL || 'imagen-3.0-generate-002';

  if (!c) {
    return mockImage(model);
  }

  const res = await c.models.generateImages({
    model,
    prompt: promptEn,
    config: {
      numberOfImages: 1,
      aspectRatio,
      personGeneration: PersonGeneration.DONT_ALLOW, // 児童向け: 人物生成は原則しない
    },
  });

  const first = res.generatedImages?.[0];
  const imageBytes = first?.image?.imageBytes;
  if (!imageBytes) {
    throw new Error('Gemini から 画像が 返ってきませんでした');
  }

  const mimeType = first?.image?.mimeType ?? 'image/png';
  const bytes =
    typeof imageBytes === 'string'
      ? Buffer.from(imageBytes, 'base64')
      : new Uint8Array(imageBytes);

  return { bytes, mimeType, model, mocked: false };
}

// ---- モック ----
// GOOGLE_API_KEY 未設定 時は、SVG で「ここに絵が 入るよ」プレースホルダを返す
function mockImage(model: string): ImageGenResult {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#FFF9F2"/>
    <rect x="32" y="32" width="448" height="448" rx="24" fill="#F8EDD3" stroke="#FF8C42" stroke-width="4" stroke-dasharray="12 8"/>
    <text x="256" y="220" text-anchor="middle" font-size="96">🎨</text>
    <text x="256" y="300" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#2E2A27">ここに 絵が 入るよ</text>
    <text x="256" y="334" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#2E2A27" opacity="0.6">(GOOGLE_API_KEY 未設定 の 開発モック)</text>
  </svg>`;
  return {
    bytes: Buffer.from(svg, 'utf-8'),
    mimeType: 'image/svg+xml',
    model,
    mocked: true,
  };
}
