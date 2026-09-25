import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import type { AppDatabase } from '@/db/schema';
import * as schema from '@/db/schema';
import { createLeadSchema, updateLeadSchema } from '@/lib/lead-validation';
import { createLead, deleteLead, getLead, listLeads, updateLead } from '@/lib/lead-service';
import { applyMigrations } from './apply-migrations';

const userA = 'test-user-a';
const userB = 'test-user-b';
const businessA = '00000000-0000-4000-8000-000000000001';
const businessB = '00000000-0000-4000-8000-000000000002';
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
    INSERT INTO "user" (id, name, email, "emailVerified") VALUES
      ('${userA}', 'User A', 'a@example.test', true),
      ('${userB}', 'User B', 'b@example.test', true);
    INSERT INTO business (id, name, created_by) VALUES
      ('${businessA}', 'Business A', '${userA}'),
      ('${businessB}', 'Business B', '${userB}');
    INSERT INTO business_member (business_id, user_id, role, is_default) VALUES
      ('${businessA}', '${userA}', 'owner', true),
      ('${businessB}', '${userB}', 'owner', true);
  `);
});

describe('lead persistence and tenant isolation', () => {
  it('creates, reads, updates, filters, paginates, and deletes a lead in its business', async () => {
    const created = await createLead(db, businessA, userA, {
      name: 'Avery Example',
      company: 'Northstar',
      email: 'avery@example.test',
      status: 'new',
    });
    expect(created.businessId).toBe(businessA);
    expect(created.createdBy).toBe(userA);

    const listed = await listLeads(db, businessA, { page: 1, perPage: 10 });
    expect(listed.total).toBe(1);
    expect(listed.items[0]?.id).toBe(created.id);

    const filtered = await listLeads(db, businessA, { page: 1, perPage: 10, status: 'new', search: 'north' });
    expect(filtered.total).toBe(1);

    const updated = await updateLead(db, businessA, created.id, { status: 'qualified', notes: 'Reviewed' });
    expect(updated?.status).toBe('qualified');
    expect(updated?.notes).toBe('Reviewed');

    expect(await getLead(db, businessA, created.id)).not.toBeNull();
    expect(await deleteLead(db, businessA, created.id)).toBe(true);
    expect(await getLead(db, businessA, created.id)).toBeNull();
  });

  it('never returns or mutates a lead through another business ID', async () => {
    const created = await createLead(db, businessA, userA, { name: 'Private lead' });
    expect((await listLeads(db, businessB, { page: 1, perPage: 10 })).total).toBe(0);
    expect(await getLead(db, businessB, created.id)).toBeNull();
    expect(await updateLead(db, businessB, created.id, { name: 'Tampered' })).toBeNull();
    expect(await deleteLead(db, businessB, created.id)).toBe(false);
    expect((await getLead(db, businessA, created.id))?.name).toBe('Private lead');
  });

  it('keeps paging bounded and reports the full filtered count', async () => {
    await createLead(db, businessA, userA, { name: 'Lead One' });
    await createLead(db, businessA, userA, { name: 'Lead Two' });
    await createLead(db, businessA, userA, { name: 'Lead Three' });
    const page = await listLeads(db, businessA, { page: 2, perPage: 2 });
    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(1);
    expect(page.page).toBe(2);
  });

  it('rejects invalid fields, empty updates, and unbounded inputs', () => {
    expect(createLeadSchema.safeParse({ name: 'A', unexpected: true }).success).toBe(false);
    expect(createLeadSchema.safeParse({ name: '', notes: 'x' }).success).toBe(false);
    expect(updateLeadSchema.safeParse({}).success).toBe(false);
    expect(updateLeadSchema.safeParse({ businessId: businessB }).success).toBe(false);
  });

  it('prevents a score from referencing a lead in a different business', async () => {
    const created = await createLead(db, businessA, userA, { name: 'Scored lead' });
    await expect(db.insert(schema.leadScore).values({
      businessId: businessB,
      leadId: created.id,
      score: 50,
    })).rejects.toThrow();
  });
});
