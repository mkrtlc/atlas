import { eq } from 'drizzle-orm';
import { db } from '../config/database';
import { accounts } from '../db/schema';

/**
 * Look up the primary account ID for a given userId.
 * Returns null if no account exists (should not happen for authenticated users).
 */
export async function getAccountIdForUser(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);
  return row?.id ?? null;
}
