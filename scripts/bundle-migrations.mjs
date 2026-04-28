#!/usr/bin/env node
// prisma/migrations/*/migration.sql を 一つの TS ファイルに 束ねて
// lib/db/_migrations.generated.ts を 出力する。
//
// Vercel 等の サーバレス環境で 関数バンドルに 含めるため、
// fs アクセスではなく 直接 import で 読めるように しておく。
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const migrationsDir = path.join(repoRoot, 'prisma', 'migrations');
const outFile = path.join(repoRoot, 'lib', 'db', '_migrations.generated.ts');

const dirs = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const migrations = dirs.map((name) => {
  const sqlPath = path.join(migrationsDir, name, 'migration.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  return { name, sql };
});

const banner = `/**
 * 自動生成 by scripts/bundle-migrations.mjs — 直接編集しない。
 * prisma/migrations/*\\/migration.sql の 内容を 関数バンドルに 含めるため、
 * TypeScript の 文字列定数として エクスポートしている。
 */
`;

const body = `export const BUNDLED_MIGRATIONS: ReadonlyArray<{ name: string; sql: string }> = [
${migrations
  .map(
    (m) =>
      `  {\n    name: ${JSON.stringify(m.name)},\n    sql: ${JSON.stringify(m.sql)},\n  },`,
  )
  .join('\n')}
];
`;

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, banner + body, 'utf8');
console.log(`wrote ${outFile} (${migrations.length} migrations)`);
