/**
 * Prisma Client のシングルトン。
 *
 * - ローカル開発:SQLite ファイル (`file:./dev.db`) を 直接 開く
 * - Vercel 等の 本番:`TURSO_DATABASE_URL` が あれば libSQL ドライバアダプタ経由で
 *   Turso(SQLite クラウド)に つなぐ。同じ Prisma スキーマで 動く。
 *
 * 使い方: `import { prisma } from '@/lib/prisma'`
 */
import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function makePrisma(): PrismaClient {
  const log =
    process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'];

  if (process.env.TURSO_DATABASE_URL) {
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter, log: log as never });
  }

  return new PrismaClient({ log: log as never });
}

export const prisma = globalForPrisma.prisma ?? makePrisma();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
