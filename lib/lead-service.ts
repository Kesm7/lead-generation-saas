import 'server-only';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { lead, type AppDatabase, type LeadStatus } from '@/db/schema';
import type { CreateLeadInput, ListLeadsQuery, UpdateLeadInput } from '@/lib/lead-validation';

export async function listLeads(db: AppDatabase, businessId: string, query: ListLeadsQuery) {
  const conditions = [eq(lead.businessId, businessId)];
  if (query.status) conditions.push(eq(lead.status, query.status));
  if (query.search) {
    const pattern = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`;
    conditions.push(or(ilike(lead.name, pattern), ilike(lead.company, pattern), ilike(lead.email, pattern), ilike(lead.role, pattern))!);
  }
  const where = and(...conditions);
  const [items, [total]] = await Promise.all([
    db.select().from(lead).where(where).orderBy(desc(lead.createdAt), desc(lead.id)).limit(query.perPage).offset((query.page - 1) * query.perPage),
    db.select({ count: sql<number>`count(*)::int` }).from(lead).where(where),
  ]);
  return { items, page: query.page, perPage: query.perPage, total: total.count };
}

export async function getLead(db: AppDatabase, businessId: string, leadId: string) {
  const [item] = await db.select().from(lead).where(and(eq(lead.businessId, businessId), eq(lead.id, leadId))).limit(1);
  return item ?? null;
}

export async function createLead(db: AppDatabase, businessId: string, userId: string, input: CreateLeadInput) {
  const [item] = await db.insert(lead).values({
    businessId,
    createdBy: userId,
    name: input.name,
    role: input.role || null,
    company: input.company || null,
    email: input.email || null,
    industry: input.industry || null,
    status: input.status ?? 'new',
    source: input.source ?? 'manual',
    notes: input.notes || null,
  }).returning();
  return item;
}

export async function updateLead(db: AppDatabase, businessId: string, leadId: string, input: UpdateLeadInput) {
  const values: Partial<typeof lead.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) values.name = input.name;
  if (input.role !== undefined) values.role = input.role || null;
  if (input.company !== undefined) values.company = input.company || null;
  if (input.email !== undefined) values.email = input.email || null;
  if (input.industry !== undefined) values.industry = input.industry || null;
  if (input.status !== undefined) values.status = input.status as LeadStatus;
  if (input.source !== undefined) values.source = input.source;
  if (input.notes !== undefined) values.notes = input.notes || null;

  const [item] = await db.update(lead).set(values)
    .where(and(eq(lead.businessId, businessId), eq(lead.id, leadId))).returning();
  return item ?? null;
}

export async function deleteLead(db: AppDatabase, businessId: string, leadId: string): Promise<boolean> {
  const [deleted] = await db.delete(lead).where(and(eq(lead.businessId, businessId), eq(lead.id, leadId)))
    .returning({ id: lead.id });
  return Boolean(deleted);
}
