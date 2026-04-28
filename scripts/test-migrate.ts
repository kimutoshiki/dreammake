import { migrateLibsql } from '../lib/db/migrate-libsql';
import { createClient } from '@libsql/client';

async function main() {
  const url = process.env.TURSO_DATABASE_URL!;
  try {
    await migrateLibsql(url);
    console.log('migrate OK');
    const c = createClient({ url });
    const tables = await c.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('tables:', tables.rows.map(r => r.name));
    c.close();
  } catch (e) {
    console.error('FAIL:', e);
    process.exit(1);
  }
}
main();
