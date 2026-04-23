/**
 * Prisma Client のシングルトン。
 * Next.js のホットリロードで複数インスタンスが作られないよう globalThis にキャッシュ。
 *
 * 使い方: `import { prisma } from '@/lib/prisma'`
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
