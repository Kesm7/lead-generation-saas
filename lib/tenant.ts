import 'server-only';
import { and, eq } from 'drizzle-orm';
import { businessMember } from '@/db/schema';
import { getDb } from '@/lib/db';

export async function getBusinessMembership(userId: string, businessId: string) {
  const [membership] = await getDb()
    .select({ businessId: businessMember.businessId, role: businessMember.role })
    .from(businessMember)
    .where(and(eq(businessMember.userId, userId), eq(businessMember.businessId, businessId)))
    .limit(1);
  return membership ?? null;
}
