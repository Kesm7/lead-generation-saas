import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set before running database migrations.');
}
const sslSetting = process.env.DATABASE_SSL;
if (sslSetting && sslSetting !== 'true' && sslSetting !== 'false') {
  throw new Error('DATABASE_SSL must be true or false.');
}
const hostname = new URL(databaseUrl).hostname;
const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(hostname);
const useSsl = sslSetting ? sslSetting === 'true' : !isLocalDatabase;

const migrationDirectory = fileURLToPath(new URL('../db/migrations/', import.meta.url));
const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 5_000,
  application_name: 'signaldesk-migrations',
  ...(useSsl ? { ssl: { rejectUnauthorized: true } } : {}),
});
const client = await pool.connect();
const advisoryLockId = 792_451_203;

try {
  await client.query('SELECT pg_advisory_lock($1)', [advisoryLockId]);
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const files = (await readdir(migrationDirectory))
    .filter((file) => /^\d+_[a-z0-9_]+\.sql$/.test(file))
    .sort();

  for (const file of files) {
    const alreadyApplied = await client.query('SELECT 1 FROM schema_migrations WHERE id = $1', [file.replace(/\.sql$/, '')]);
    if (alreadyApplied.rowCount) {
      console.log(`skip ${file} (already applied)`);
      continue;
    }

    const sql = await readFile(path.join(migrationDirectory, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file.replace(/\.sql$/, '')]);
      await client.query('COMMIT');
      console.log(`applied ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  try {
    await client.query('SELECT pg_advisory_unlock($1)', [advisoryLockId]);
  } finally {
    client.release();
    await pool.end();
  }
}
