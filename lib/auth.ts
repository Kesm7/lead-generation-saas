import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { authSchema } from '@/db/schema';
import type { AppDatabase } from '@/db/schema';
import { getDb } from '@/lib/db';
import { sendAccountEmail } from '@/lib/email';
import { ensureDefaultWorkspace } from '@/lib/workspace';

type AccountEmail = Parameters<typeof sendAccountEmail>[0];

export type AuthFactoryOptions = {
  database: AppDatabase;
  secret: string;
  baseURL: string;
  trustedOrigins?: string[];
  sendEmail: (message: AccountEmail) => Promise<void>;
  provisionWorkspace: (user: { id: string; name: string; email: string }) => Promise<void>;
};

export function createAuth(options: AuthFactoryOptions) {
  if (options.secret.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters.');
  const base = new URL(options.baseURL);
  if (process.env.NODE_ENV === 'production' && base.protocol !== 'https:') {
    throw new Error('BETTER_AUTH_URL must use HTTPS in production.');
  }
  const trustedOrigins = [base.origin, ...(options.trustedOrigins ?? []).map((item) => new URL(item).origin)]
    .filter((value, index, origins) => origins.indexOf(value) === index);

  return betterAuth({
    appName: 'SignalDesk',
    baseURL: base.origin,
    secret: options.secret,
    database: drizzleAdapter(options.database, { provider: 'pg', schema: authSchema, camelCase: true, transaction: true }),
    trustedOrigins,
    advanced: { useSecureCookies: base.protocol === 'https:' },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await options.sendEmail({ to: user.email, name: user.name, subject: 'Reset your SignalDesk password', url });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => {
        await options.sendEmail({ to: user.email, name: user.name, subject: 'Verify your SignalDesk email', url });
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-up/email': { window: 60, max: 5 },
        '/sign-in/email': { window: 60, max: 10 },
        '/request-password-reset': { window: 60, max: 5 },
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            await options.provisionWorkspace(createdUser);
          },
        },
      },
    },
  });
}

type SignalDeskAuth = ReturnType<typeof createAuth>;
let authInstance: SignalDeskAuth | undefined;

export function getAuth(): SignalDeskAuth {
  if (!authInstance) {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret || secret.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters.');
    const baseURL = process.env.BETTER_AUTH_URL ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
    if (!baseURL) throw new Error('BETTER_AUTH_URL must be configured in production.');
    const extraOrigins = (process.env.AUTH_TRUSTED_ORIGINS ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    authInstance = createAuth({
      database: getDb(),
      secret,
      baseURL,
      trustedOrigins: extraOrigins,
      sendEmail: sendAccountEmail,
      provisionWorkspace: (user) => ensureDefaultWorkspace(user),
    });
  }
  return authInstance;
}

export function hasTrustedRequestOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const baseURL = process.env.BETTER_AUTH_URL ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
  if (!baseURL) return false;
  try {
    const allowed = new Set([new URL(baseURL).origin]);
    for (const value of (process.env.AUTH_TRUSTED_ORIGINS ?? '').split(',').map((entry) => entry.trim()).filter(Boolean)) {
      allowed.add(new URL(value).origin);
    }
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export async function getAuthenticatedUser(request: Request) {
  const current = await getAuth().api.getSession({ headers: request.headers });
  if (!current?.user || !current.user.emailVerified) return null;
  return current.user;
}
