import { sql, eq, and } from 'drizzle-orm';
import { db } from '../config/database';
import { threads, emails } from '../db/schema';

/**
 * Search emails by query and return matching Thread objects.
 *
 * Strategy: find matching emails via LIKE, collect their distinct thread IDs,
 * then return full thread rows ordered by lastMessageAt.
 */
export async function searchEmails(accountId: string, query: string, limit = 50, offset = 0) {
  // Escape LIKE wildcards in user input to prevent wildcard injection
  const escapedQuery = query.replace(/[%_\\]/g, '\\$&');
  const likeTerm = `%${escapedQuery}%`;

  // Step 1: find distinct thread IDs from matching emails (bounded to 500)
  const matchingRows = await db
    .selectDistinct({ threadId: emails.threadId })
    .from(emails)
    .where(
      and(
        eq(emails.accountId, accountId),
        sql`(
          ${emails.subject} LIKE ${likeTerm} ESCAPE '\\'
          OR ${emails.fromName} LIKE ${likeTerm} ESCAPE '\\'
          OR ${emails.fromAddress} LIKE ${likeTerm} ESCAPE '\\'
          OR ${emails.bodyText} LIKE ${likeTerm} ESCAPE '\\'
        )`,
      ),
    )
    .limit(500);

  if (matchingRows.length === 0) return [];

  const threadIds = matchingRows.map((r) => r.threadId);

  // Step 2: fetch full thread rows for those IDs (scoped to accountId)
  const threadRows = await db
    .select()
    .from(threads)
    .where(
      and(
        eq(threads.accountId, accountId),
        sql`${threads.id} IN (${sql.join(threadIds.map((id) => sql`${id}`), sql`, `)})`,
      ),
    )
    .orderBy(sql`${threads.lastMessageAt} DESC`)
    .limit(limit)
    .offset(offset);

  // Step 3: attach the first email of each thread for sender info
  const resultThreadIds = threadRows.map((t) => t.id);
  if (resultThreadIds.length === 0) return [];

  const firstEmailRows = await db
    .select({
      threadId: emails.threadId,
      fromAddress: emails.fromAddress,
      fromName: emails.fromName,
      internalDate: emails.internalDate,
    })
    .from(emails)
    .where(
      and(
        eq(emails.accountId, accountId),
        sql`${emails.threadId} IN (${sql.join(resultThreadIds.map((id) => sql`${id}`), sql`, `)})`,
        sql`${emails.internalDate} = (
          SELECT MIN(e2.internal_date) FROM emails e2 WHERE e2.thread_id = ${emails.threadId}
        )`,
      ),
    );

  const senderByThread = new Map(
    firstEmailRows.map((e) => [e.threadId, { fromAddress: e.fromAddress, fromName: e.fromName }]),
  );

  return threadRows.map((t) => {
    const sender = senderByThread.get(t.id);
    return {
      ...t,
      senderName: sender?.fromName || sender?.fromAddress || null,
      senderEmail: sender?.fromAddress || null,
    };
  });
}
