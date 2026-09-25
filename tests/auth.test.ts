import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { createAuth } from '@/lib/auth';
import { ensureDefaultWorkspace } from '@/lib/workspace';
import { applyMigrations } from './apply-migrations';
import type { AppDatabase } from '@/db/schema';
import * as schema from '@/db/schema';

const origin = 'http://localhost:3000';
const password = 'a-secure-test-password-123';
let client: PGlite;
let db: AppDatabase;
let auth: ReturnType<typeof createAuth>;
const sentMessages: Array<{ to: string; name: string; subject: string; url: string }> = [];

function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('origin', origin);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  return auth.handler(new Request(`${origin}/api/auth${path}`, { ...init, headers }));
}

beforeAll(async () => {
  client = new PGlite();
  await applyMigrations(client);
  db = drizzle(client, { schema }) as unknown as AppDatabase;
  auth = createAuth({
    database: db,
    secret: 'unit-test-secret-that-is-at-least-thirty-two-characters',
    baseURL: origin,
    sendEmail: async (message) => { sentMessages.push(message); },
    provisionWorkspace: (user) => ensureDefaultWorkspace(user, db),
  });
});

afterAll(async () => {
  await client.close();
});

describe('Better Auth integration', () => {
  it('requires verified email before granting a session and provisions an owner workspace', async () => {
    sentMessages.length = 0;
    const signup = await request('/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ name: 'Auth Test', email: 'auth-test@example.test', password, callbackURL: origin }),
    });
    expect(signup.status).toBe(200);
    const signupData = await signup.json() as { token?: string; user?: { id?: string } };
    expect(signupData.token).toBeNull();
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.subject).toContain('Verify');

    const userId = signupData.user?.id;
    expect(userId).toBeTruthy();
    const [workspace] = await db.select().from(schema.business);
    const [membership] = await db.select().from(schema.businessMember);
    expect(workspace?.createdBy).toBe(userId);
    expect(membership?.userId).toBe(userId);
    expect(membership?.role).toBe('owner');
    expect(membership?.isDefault).toBe(true);

    const deniedLogin = await request('/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email: 'auth-test@example.test', password }),
    });
    expect(deniedLogin.status).toBe(403);

    const verificationUrl = new URL(sentMessages[0]!.url);
    const verificationPath = `${verificationUrl.pathname}${verificationUrl.search}`.replace('/api/auth', '');
    const verify = await request(verificationPath, { method: 'GET', redirect: 'manual' });
    expect([302, 303, 307]).toContain(verify.status);

    const login = await request('/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email: 'auth-test@example.test', password }),
    });
    expect(login.status).toBe(200);
    const setCookie = login.headers.get('set-cookie');
    expect(setCookie).toContain('session_token');

    const session = await request('/get-session', {
      method: 'GET',
      headers: { cookie: setCookie?.split(';')[0] ?? '' },
    });
    expect(session.status).toBe(200);
    const current = await session.json() as { user?: { id?: string; emailVerified?: boolean } };
    expect(current.user?.id).toBe(userId);
    expect(current.user?.emailVerified).toBe(true);
  });

  it('rejects weak passwords and ignores repeated signup attempts without revealing account existence', async () => {
    const weak = await request('/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ name: 'Weak User', email: 'weak@example.test', password: 'short' }),
    });
    expect(weak.status).toBeGreaterThanOrEqual(400);

    const repeated = await request('/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ name: 'Again', email: 'auth-test@example.test', password }),
    });
    expect(repeated.status).toBe(200);
  });
});
