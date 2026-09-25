import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from '@/db/schema';

const state = globalThis as typeof globalThis & {
  signalDeskPool?: Pool;
  signalDeskDb?: ReturnType<typeof drizzle<typeof schema>>;
};

export function getPool(): Pool {
  if (state.signalDeskPool) return state.signalDeskPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured.');
  const max = Number(process.env.DATABASE_POOL_MAX ?? 10);
  if (!Number.isInteger(max) || max < 1 || max > 100) throw new Error('DATABASE_POOL_MAX must be an integer from 1 to 100.');
  const sslSetting = process.env.DATABASE_SSL;
  if (sslSetting && sslSetting !== 'true' && sslSetting !== 'false') throw new Error('DATABASE_SSL must be true or false.');
  const hostname = new URL(connectionString).hostname;
  const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  const useSsl = sslSetting ? sslSetting === 'true' : !isLocalDatabase;
  state.signalDeskPool = new Pool({
    connectionString,
    max,
    connectionTimeoutMillis: 8_000,
    idleTimeoutMillis: 10_000,
    application_name: 'signaldesk-web',
    ...(useSsl ? { ssl: { rejectUnauthorized: true } } : {}),
  });
  return state.signalDeskPool;
}

export function getDb() {
  state.signalDeskDb ??= drizzle(getPool(), { schema });
  return state.signalDeskDb;
}

export async function closeDatabaseForTests(): Promise<void> {
  await state.signalDeskPool?.end();
  delete state.signalDeskPool;
  delete state.signalDeskDb;
}
