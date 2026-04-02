import { db } from '../config/database';
import { presenceHeartbeats, users } from '../db/schema';
import { and, eq, gt, lt, sql } from 'drizzle-orm';

/**
 * Upsert a heartbeat for a user viewing a specific record.
 * Uses INSERT ON CONFLICT to update lastSeenAt if row already exists.
 */
export async function upsertHeartbeat(
  userId: string,
  tenantId: string,
  appId: string,
  recordId: string,
) {
  await db
    .insert(presenceHeartbeats)
    .values({ userId, tenantId, appId, recordId, lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: [presenceHeartbeats.userId, presenceHeartbeats.appId, presenceHeartbeats.recordId],
      set: { lastSeenAt: new Date(), tenantId },
    });
}

/**
 * Get users actively viewing a record (heartbeat within last 30 seconds).
 * Excludes the requesting user. Also lazily cleans stale entries older than 5 minutes.
 */
export async function getActiveViewers(
  tenantId: string,
  appId: string,
  recordId: string,
  excludeUserId: string,
) {
  // Lazily clean stale entries (older than 5 minutes)
  await cleanStale();

  const thirtySecondsAgo = new Date(Date.now() - 30_000);

  const rows = await db
    .select({
      userId: presenceHeartbeats.userId,
      name: users.name,
      email: users.email,
    })
    .from(presenceHeartbeats)
    .innerJoin(users, eq(presenceHeartbeats.userId, users.id))
    .where(
      and(
        eq(presenceHeartbeats.tenantId, tenantId),
        eq(presenceHeartbeats.appId, appId),
        eq(presenceHeartbeats.recordId, recordId),
        gt(presenceHeartbeats.lastSeenAt, thirtySecondsAgo),
        sql`${presenceHeartbeats.userId} != ${excludeUserId}`,
      ),
    );

  return rows;
}

/**
 * Delete heartbeats older than 5 minutes.
 */
export async function cleanStale() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
  await db
    .delete(presenceHeartbeats)
    .where(lt(presenceHeartbeats.lastSeenAt, fiveMinutesAgo));
}
