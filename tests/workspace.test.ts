import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/db/schema';
import type { AppDatabase } from '@/db/schema';
import { business, businessMember } from '@/db/schema';
import { ensureDefaultWorkspace } from '@/lib/workspace';
import { applyMigrations } from './apply-migrations';

let client: PGlite;
let db: AppDatabase;

beforeAll(async () => {
  client = new PGlite();
  await applyMigrations(client);
  db = drizzle(client, { schema }) as unknown as AppDatabase;
});

afterAll(async () => {
  await client.close();
});

beforeEach(async () => {
  await client.exec(`
    TRUNCATE lead_score, lead_search, lead, business_member, business, account, session, verification, "rateLimit", "user" CASCADE;
    INSERT INTO "user" (id, name, email, "emailVerified") VALUES ('workspace-user', 'Taylor Example', 'taylor@example.test', true);
  `);
});

describe('default workspace provisioning', () => {
  it('creates a workspace and owner membership once, even when called repeatedly', async () => {
    const user = { id: 'workspace-user', name: 'Taylor Example', email: 'taylor@example.test' };
    await ensureDefaultWorkspace(user, db);
    await ensureDefaultWorkspace(user, db);

    const [workspace] = await db.select().from(business);
    const [membership] = await db.select().from(businessMember);
    expect(workspace?.name).toBe("Taylor Example's workspace");
    expect(membership?.businessId).toBe(workspace?.id);
    expect(membership?.role).toBe('owner');
    expect(membership?.isDefault).toBe(true);
  });
});
