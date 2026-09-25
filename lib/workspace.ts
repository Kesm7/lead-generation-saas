import 'server-only';
import { and, eq } from 'drizzle-orm';
import { business, businessMember, type AppDatabase } from '@/db/schema';
import { getDb } from '@/lib/db';

export async function ensureDefaultWorkspace(
  user: { id: string; name: string; email: string },
  db: AppDatabase = getDb(),
): Promise<void> {
  const findDefaultMembership = () => db.select({ businessId: businessMember.businessId })
    .from(businessMember)
    .where(and(eq(businessMember.userId, user.id), eq(businessMember.isDefault, true)))
    .limit(1);

  if ((await findDefaultMembership()).length) return;

  try {
    await db.transaction(async (tx) => {
      const [workspace] = await tx.insert(business).values({
        name: `${user.name.trim() || user.email.split('@')[0]}'s workspace`.slice(0, 120),
        createdBy: user.id,
      }).returning({ id: business.id });
      await tx.insert(businessMember).values({
        businessId: workspace.id,
        userId: user.id,
        role: 'owner',
        isDefault: true,
      });
    });
  } catch (error) {
    if ((error as { code?: string }).code !== '23505') throw error;
    if (!(await findDefaultMembership()).length) throw error;
  }
}
