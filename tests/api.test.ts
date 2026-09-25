import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import type { AppDatabase } from '@/db/schema';
import * as schema from '@/db/schema';
import { applyMigrations } from './apply-migrations';

const testState = vi.hoisted(() => ({
  db: undefined as unknown,
  user: null as null | { id: string; emailVerified: boolean },
}));

vi.mock('@/lib/db', () => ({ getDb: () => testState.db }));
vi.mock('@/lib/auth', () => ({
  getAuthenticatedUser: async () => testState.user,
  hasTrustedRequestOrigin: (request: Request) => request.headers.get('origin') === 'http://localhost:3000',
}));

import { GET as getLeadCollection, POST as postLead } from '@/app/api/businesses/[businessId]/leads/route';
import { DELETE as deleteLead, GET as getLeadItem, PATCH as patchLead } from '@/app/api/businesses/[businessId]/leads/[leadId]/route';

type CollectionContext = { params: Promise<{ businessId: string }> };
type ItemContext = { params: Promise<{ businessId: string; leadId: string }> };
const getLeadCollectionHandler = getLeadCollection as unknown as (request: Request, context: CollectionContext) => Promise<Response>;
const postLeadHandler = postLead as unknown as (request: Request, context: CollectionContext) => Promise<Response>;
const getLeadItemHandler = getLeadItem as unknown as (request: Request, context: ItemContext) => Promise<Response>;
const patchLeadHandler = patchLead as unknown as (request: Request, context: ItemContext) => Promise<Response>;
const deleteLeadHandler = deleteLead as unknown as (request: Request, context: ItemContext) => Promise<Response>;

const userA = 'route-user-a';
const userB = 'route-user-b';
const businessA = '00000000-0000-4000-8000-000000000011';
const businessB = '00000000-0000-4000-8000-000000000022';
let client: PGlite;
let db: AppDatabase;

afterAll(async () => {
  await client.close();
});

beforeAll(async () => {
  client = new PGlite();
  await applyMigrations(client);
  db = drizzle(client, { schema }) as unknown as AppDatabase;
  testState.db = db;
});

beforeEach(async () => {
  testState.user = { id: userA, emailVerified: true };
  await client.exec(`
    TRUNCATE lead_score, lead_search, lead, business_member, business, account, session, verification, "rateLimit", "user" CASCADE;
    INSERT INTO "user" (id, name, email, "emailVerified") VALUES
      ('${userA}', 'Route User A', 'route-a@example.test', true),
      ('${userB}', 'Route User B', 'route-b@example.test', true);
    INSERT INTO business (id, name, created_by) VALUES
      ('${businessA}', 'Business A', '${userA}'),
      ('${businessB}', 'Business B', '${userB}');
    INSERT INTO business_member (business_id, user_id, role, is_default) VALUES
      ('${businessA}', '${userA}', 'owner', true),
      ('${businessB}', '${userB}', 'owner', true);
  `);
});

const collectionContext = (businessId: string): CollectionContext => ({ params: Promise.resolve({ businessId }) });
const itemContext = (businessId: string, leadId: string): ItemContext => ({ params: Promise.resolve({ businessId, leadId }) });
const request = (method: string, body?: unknown, origin = 'http://localhost:3000') => new Request('http://localhost:3000/api/test', {
  method,
  headers: {
    ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    origin,
  },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

describe('business-scoped HTTP routes', () => {
  it('requires an authenticated, verified session', async () => {
    testState.user = null;
    const response = await getLeadCollectionHandler(request('GET'), collectionContext(businessA));
    expect(response.status).toBe(401);
  });

  it('rejects mutations from an untrusted Origin before writing', async () => {
    const response = await postLeadHandler(request('POST', { name: 'Blocked lead' }, 'https://attacker.example'), collectionContext(businessA));
    expect(response.status).toBe(400);
    const rows = await db.select().from(schema.lead);
    expect(rows).toHaveLength(0);
  });

  it('creates, lists, reads, updates, and deletes only within an authorized business', async () => {
    const createdResponse = await postLeadHandler(request('POST', { name: 'Route Prospect', company: 'Northstar' }), collectionContext(businessA));
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json() as { item: { id: string; businessId: string; createdBy: string } };
    expect(created.item.businessId).toBe(businessA);
    expect(created.item.createdBy).toBe(userA);

    const listResponse = await getLeadCollectionHandler(request('GET'), collectionContext(businessA));
    expect(listResponse.status).toBe(200);
    expect((await listResponse.json() as { total: number }).total).toBe(1);

    const itemResponse = await getLeadItemHandler(request('GET'), itemContext(businessA, created.item.id));
    expect(itemResponse.status).toBe(200);

    const crossTenantRead = await getLeadItemHandler(request('GET'), itemContext(businessB, created.item.id));
    expect(crossTenantRead.status).toBe(404);

    const crossTenantWrite = await patchLeadHandler(request('PATCH', { name: 'Leaked' }), itemContext(businessB, created.item.id));
    expect(crossTenantWrite.status).toBe(404);

    const updateResponse = await patchLeadHandler(request('PATCH', { status: 'qualified' }), itemContext(businessA, created.item.id));
    expect(updateResponse.status).toBe(200);
    expect(((await updateResponse.json()) as { item: { status: string } }).item.status).toBe('qualified');

    const deleteResponse = await deleteLeadHandler(request('DELETE'), itemContext(businessA, created.item.id));
    expect(deleteResponse.status).toBe(204);
    expect(await getLeadItemHandler(request('GET'), itemContext(businessA, created.item.id)).then((response) => response.status)).toBe(404);
  });
});
