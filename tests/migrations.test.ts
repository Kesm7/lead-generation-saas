import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let client: PGlite;

beforeAll(() => {
  client = new PGlite();
});

afterAll(async () => {
  await client.close();
});

describe('additive PostgreSQL migrations', () => {
  it('preserves pre-existing Better Auth rate limits and backfills the new required ID', async () => {
    const initial = await readFile(new URL('../db/migrations/0001_initial.sql', import.meta.url), 'utf8');
    const upgrade = await readFile(new URL('../db/migrations/0002_rate_limit_id.sql', import.meta.url), 'utf8');
    await client.exec(initial);
    await client.exec(`INSERT INTO "rateLimit" (key, count, "lastRequest") VALUES ('legacy-login-ip', 3, 1700000000000)`);
    await client.exec(upgrade);

    const rows = await client.query<{ id: string; key: string; count: number; lastRequest: number }>(
      'SELECT id, key, count, "lastRequest" FROM "rateLimit" WHERE key = $1',
      ['legacy-login-ip'],
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]?.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(rows.rows[0]).toMatchObject({ key: 'legacy-login-ip', count: 3, lastRequest: 1_700_000_000_000 });
  });
});
