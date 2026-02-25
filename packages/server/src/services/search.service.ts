import { sql, eq, and } from 'drizzle-orm';
import { db, rawDb } from '../config/database';
import { threads, emails } from '../db/schema';

/**
 * Search emails using FTS5 full-text index and return matching Thread objects.
 *
 * Falls back to LIKE-based search if FTS5 returns no results (e.g. index
 * hasn't been populated yet for older emails).
 */
export async function searchEmails(accountId: string, query: string, limit = 50, offset = 0) {
  // Try FTS5 first — sub-millisecond searches
  const ftsResults = await searchViaFTS(accountId, query, limit, offset);
  if (ftsResults.length > 0) return ftsResults;

  // Fallback: LIKE-based search for unindexed emails
  return searchViaLike(accountId, query, limit, offset);
}

// ---------------------------------------------------------------------------
// FTS5-powered search (#3)
// ---------------------------------------------------------------------------

async function searchViaFTS(accountId: string, query: string, limit: number, offset: number) {
  // Sanitize query for FTS5: escape special chars, wrap terms in quotes if needed
  const sanitized = sanitizeFTSQuery(query);
  if (!sanitized) return [];

  try {
    // FTS5 match returns rowids from the email_fts_map table.
    // Join through the mapping table to get email UUIDs, then filter by account.
    const matchedEmails = rawDb.prepare(`
      SELECT DISTINCT e.thread_id
      FROM email_fts
      JOIN email_fts_map m ON m.fts_rowid = email_fts.rowid
      JOIN emails e ON e.id = m.email_id
      WHERE email_fts MATCH ?
        AND e.account_id = ?
      ORDER BY email_fts.rank
      LIMIT 500
    `).all(sanitized, accountId) as Array<{ thread_id: string }>;

    if (matchedEmails.length === 0) return [];

    const threadIds = matchedEmails.map((r) => r.thread_id);
    return fetchThreadsWithSenders(accountId, threadIds, limit, offset);
  } catch {
    // FTS5 query syntax error — fall back to LIKE
    return [];
  }
}

function sanitizeFTSQuery(query: string): string {
  // Remove FTS5 special operators that could cause syntax errors
  const cleaned = query
    .replace(/[*"():^{}<>]/g, ' ')
    .replace(/\b(AND|OR|NOT|NEAR)\b/gi, ' ')
    .trim();

  if (!cleaned) return '';

  // Wrap individual terms so FTS5 does an implicit AND
  const terms = cleaned.split(/\s+/).filter(Boolean);
  return terms.map((t) => `"${t}"`).join(' ');
}

// ---------------------------------------------------------------------------
// LIKE fallback (for emails not yet indexed in FTS5)
// ---------------------------------------------------------------------------

async function searchViaLike(accountId: string, query: string, limit: number, offset: number) {
  const escapedQuery = query.replace(/[%_\\]/g, '\\$&');
  const likeTerm = `%${escapedQuery}%`;

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
  return fetchThreadsWithSenders(accountId, threadIds, limit, offset);
}

// ---------------------------------------------------------------------------
// Shared: fetch threads + sender info
// ---------------------------------------------------------------------------

async function fetchThreadsWithSenders(accountId: string, threadIds: string[], limit: number, offset: number) {
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
          SELECT MIN(e2."internalDate") FROM emails e2 WHERE e2.thread_id = ${emails.threadId}
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
