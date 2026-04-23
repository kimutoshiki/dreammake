/**
 * 児童の絵柄パスワード、および教員の仮パスワードの hash/verify。
 *
 * node:crypto の scrypt を使用(依存を増やさない / Node 標準)。
 * 絵柄入力は選んだ絵柄の ID を canonical 順で結合した文字列として扱う。
 *
 * 本番で argon2id に置き換えたい場合は、このモジュールの差し替えで対応可能。
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_N = 16384;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const KEY_LEN = 64;

export function hashPassword(input: string, pepper = ''): {
  hash: string;
  salt: string;
} {
  const salt = randomBytes(16).toString('base64url');
  const derived = scryptSync(input + pepper, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_r,
    p: SCRYPT_p,
  });
  return { hash: derived.toString('base64url'), salt };
}

export function verifyPassword(
  input: string,
  salt: string,
  hash: string,
  pepper = '',
): boolean {
  const derived = scryptSync(input + pepper, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_r,
    p: SCRYPT_p,
  });
  const expected = Buffer.from(hash, 'base64url');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/**
 * 絵柄パスワードを canonical 化(選択順に依存しない)。
 * 児童が絵柄を「魚、桜、りんご」と選んでも「桜、魚、りんご」と選んでも
 * 同じハッシュを生むように、絵柄 ID を並べ替えてから結合する。
 */
export function canonicalizeEmojiPassword(emojiIds: string[]): string {
  return [...emojiIds].sort().join('|');
}
