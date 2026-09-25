import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { business, businessMember } from '@/db/schema';
import { getAuthenticatedUser } from '@/lib/auth';
import { backendUnavailable, unauthorized } from '@/lib/api-response';
import { getDb } from '@/lib/db';
import { ensureDefaultWorkspace } from '@/lib/workspace';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    await ensureDefaultWorkspace(user);
    const items = await getDb().select({
      id: business.id,
      name: business.name,
      role: businessMember.role,
      isDefault: businessMember.isDefault,
      createdAt: business.createdAt,
    }).from(businessMember)
      .innerJoin(business, eq(business.id, businessMember.businessId))
      .where(eq(businessMember.userId, user.id))
      .orderBy(businessMember.createdAt);
    return NextResponse.json({ items });
  } catch {
    return backendUnavailable();
  }
}
