/**
 * libSQL(file:/tmp/dev.db や Turso クラウド)に Prisma migrations を 適用する。
 *
 * Vercel 等の サーバレス環境では Prisma CLI が 動かないので、
 * 起動時に この関数で 直接 SQL を 流す。冪等(_prisma_migrations テーブルで
 * 適用済みを 追跡)。
 *
 * 関数バンドル に 含めるため、SQL は scripts/bundle-migrations.mjs で
 * `_migrations.generated.ts` に 束ねた TypeScript 定数を 使う。
 */
import { createClient } from '@libsql/client';
import { BUNDLED_MIGRATIONS } from './_migrations.generated';

let migratedFor: string | null = null;
let inProgress: Promise<void> | null = null;

export async function migrateLibsql(url: string, authToken?: string): Promise<void> {
  if (migratedFor === url) return;
  if (inProgress) return inProgress;

  inProgress = (async () => {
    const client = createClient({ url, authToken });
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS _prisma_migrations (
          id TEXT PRIMARY KEY,
          checksum TEXT,
          finished_at TEXT,
          migration_name TEXT,
          logs TEXT,
          rolled_back_at TEXT,
          started_at TEXT DEFAULT CURRENT_TIMESTAMP,
          applied_steps_count INTEGER DEFAULT 0
        )
      `);

      for (const m of BUNDLED_MIGRATIONS) {
        const applied = await client.execute({
          sql: 'SELECT 1 FROM _prisma_migrations WHERE migration_name = ? AND finished_at IS NOT NULL LIMIT 1',
          args: [m.name],
        });
        if (applied.rows.length > 0) continue;

        const statements = splitSql(m.sql);
        console.log(`📦 適用中: ${m.name} (${statements.length} statements)`);
        for (const stmt of statements) {
          if (!stmt.trim()) continue;
          try {
            await client.execute(stmt);
          } catch (err) {
            const msg = (err as Error)?.message ?? String(err);
            // すでに 存在する 場合は スキップ(冪等運用)
            if (/already exists/i.test(msg) || /duplicate/i.test(msg)) continue;
            console.error(`migration ${m.name} statement failed:`, msg);
            throw err;
          }
        }
        await client.execute({
          sql: 'INSERT INTO _prisma_migrations (id, migration_name, finished_at, applied_steps_count) VALUES (?, ?, CURRENT_TIMESTAMP, ?)',
          args: [`${m.name}-${Date.now()}`, m.name, statements.length],
        });
      }

      migratedFor = url;
      console.log('✅ libSQL migrations 適用完了');
    } finally {
      client.close();
    }
  })();

  try {
    await inProgress;
  } finally {
    inProgress = null;
  }
}

/** SQL 文字列を `;` で 分割。文字列リテラル内の `;` は 区別しない簡易版 */
function splitSql(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]!;
    if (inString) {
      buf += c;
      if (c === stringChar && sql[i - 1] !== '\\') inString = false;
    } else if (c === "'" || c === '"') {
      buf += c;
      inString = true;
      stringChar = c;
    } else if (c === ';') {
      const s = buf.trim();
      if (s) out.push(s);
      buf = '';
    } else {
      buf += c;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}
