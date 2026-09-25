import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Better Auth core PostgreSQL tables.
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt', { withTimezone: true, mode: 'date' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (t) => [index('session_user_id_idx').on(t.userId)]);

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true, mode: 'date' }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true, mode: 'date' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (t) => [index('account_user_id_idx').on(t.userId)]);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (t) => [index('verification_identifier_idx').on(t.identifier)]);

// Better Auth uses epoch milliseconds for lastRequest.
export const rateLimit = pgTable('rateLimit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('lastRequest', { mode: 'number' }).notNull(),
});

export const businessRole = pgEnum('business_role', ['owner', 'admin', 'member']);
export const leadStatus = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'nurturing']);

export const business = pgTable('business', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  createdBy: text('created_by').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const businessMember = pgTable('business_member', {
  businessId: uuid('business_id').notNull().references(() => business.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: businessRole('role').notNull().default('member'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ name: 'business_member_pk', columns: [t.businessId, t.userId] }),
  index('business_member_user_idx').on(t.userId),
  uniqueIndex('business_member_one_default_per_user_uq').on(t.userId).where(sql`${t.isDefault}`),
]);

export const lead = pgTable('lead', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => business.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull().references(() => user.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 160 }).notNull(),
  role: varchar('role', { length: 160 }),
  company: varchar('company', { length: 200 }),
  email: varchar('email', { length: 320 }),
  industry: varchar('industry', { length: 120 }),
  status: leadStatus('status').notNull().default('new'),
  source: varchar('source', { length: 80 }).notNull().default('manual'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('lead_business_id_id_uq').on(t.businessId, t.id),
  index('lead_business_created_idx').on(t.businessId, t.createdAt, t.id),
  index('lead_business_status_idx').on(t.businessId, t.status),
]);

export const leadSearch = pgTable('lead_search', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => business.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
  query: jsonb('query').$type<Record<string, unknown>>().notNull(),
  provider: varchar('provider', { length: 80 }).notNull().default('manual'),
  resultsCount: integer('results_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (t) => [index('lead_search_business_created_idx').on(t.businessId, t.createdAt)]);

export const leadScore = pgTable('lead_score', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull(),
  leadId: uuid('lead_id').notNull(),
  score: integer('score').notNull(),
  components: jsonb('components').$type<Record<string, number | string | boolean | null>>().notNull().default({}),
  modelVersion: varchar('model_version', { length: 80 }).notNull().default('rules-v1'),
  scoredBy: text('scored_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (t) => [
  check('lead_score_range_check', sql`${t.score} BETWEEN 0 AND 100`),
  foreignKey({
    name: 'lead_score_tenant_lead_fk',
    columns: [t.businessId, t.leadId],
    foreignColumns: [lead.businessId, lead.id],
  }).onDelete('cascade'),
  index('lead_score_business_lead_created_idx').on(t.businessId, t.leadId, t.createdAt),
]);

export const userRelations = relations(user, ({ many }) => ({ memberships: many(businessMember), leadsCreated: many(lead) }));
export const businessRelations = relations(business, ({ many }) => ({ members: many(businessMember), leads: many(lead), searches: many(leadSearch) }));
export const leadRelations = relations(lead, ({ one, many }) => ({
  business: one(business, { fields: [lead.businessId], references: [business.id] }),
  scores: many(leadScore),
}));

export const schema = { user, session, account, verification, rateLimit, business, businessMember, lead, leadSearch, leadScore };
export type AppDatabase = import('drizzle-orm/node-postgres').NodePgDatabase<typeof schema>;
export type Lead = typeof lead.$inferSelect;
export type NewLead = typeof lead.$inferInsert;
export type LeadStatus = (typeof leadStatus.enumValues)[number];
export type BusinessRole = (typeof businessRole.enumValues)[number];
export type LeadScoreComponents = Record<string, number | string | boolean | null>;
export const leadScoreBounds = { min: 0, max: 100 } as const;
export const leadDataFields = ['name', 'role', 'company', 'email', 'industry', 'status', 'source', 'notes'] as const;
export const schemaTableNames = ['user', 'session', 'account', 'verification', 'rateLimit', 'business', 'business_member', 'lead', 'lead_search', 'lead_score'] as const;
export const authSchema = { user, session, account, verification, rateLimit };
export const appSchema = { business, businessMember, lead, leadSearch, leadScore };
