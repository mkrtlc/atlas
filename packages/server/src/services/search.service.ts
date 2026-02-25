import { sql, eq, and } from 'drizzle-orm';
import { db, rawDb } from '../config/database';
import { threads, emails } from '../db/schema';

// ---------------------------------------------------------------------------
// Search query parser — extracts structured operators from the query string
// ---------------------------------------------------------------------------

interface ParsedQuery {
  from: string | null;
  to: string | null;
  subject: string | null;
  hasAttachment: boolean;
  inMailbox: string | null;   // inbox, sent, trash, spam, archive, starred, drafts
  isFilter: string | null;    // unread, starred, read
  newerThan: string | null;   // e.g. 7d, 2w, 1m
  olderThan: string | null;
  freeText: string;
}

function parseSearchQuery(query: string): ParsedQuery {
  const parsed: ParsedQuery = {
    from: null,
    to: null,
    subject: null,
    hasAttachment: false,
    inMailbox: null,
    isFilter: null,
    newerThan: null,
    olderThan: null,
    freeText: '',
  };

  let remaining = query;

  remaining = remaining.replace(/\bfrom:(\S+)/gi, (_, val) => {
    parsed.from = val;
    return '';
  });

  remaining = remaining.replace(/\bto:(\S+)/gi, (_, val) => {
    parsed.to = val;
    return '';
  });

  // subject: supports quoted strings — subject:"multi word"
  remaining = remaining.replace(/\bsubject:"([^"]+)"/gi, (_, val) => {
    parsed.subject = val;
    return '';
  });
  remaining = remaining.replace(/\bsubject:(\S+)/gi, (_, val) => {
    parsed.subject = val;
    return '';
  });

  remaining = remaining.replace(/\bhas:attachment\b/gi, () => {
    parsed.hasAttachment = true;
    return '';
  });

  remaining = remaining.replace(/\bin:(\S+)/gi, (_, val) => {
    parsed.inMailbox = val.toLowerCase();
    return '';
  });

  remaining = remaining.replace(/\bis:(\S+)/gi, (_, val) => {
    parsed.isFilter = val.toLowerCase();
    return '';
  });

  remaining = remaining.replace(/\bnewer_than:(\S+)/gi, (_, val) => {
    parsed.newerThan = val;
    return '';
  });

  remaining = remaining.replace(/\bolder_than:(\S+)/gi, (_, val) => {
    parsed.olderThan = val;
    return '';
  });

  parsed.freeText = remaining.trim();

  return parsed;
}

function hasOperators(parsed: ParsedQuery): boolean {
  return (
    parsed.from !== null ||
    parsed.to !== null ||
    parsed.subject !== null ||
    parsed.hasAttachment ||
    parsed.inMailbox !== null ||
    parsed.isFilter !== null ||
    parsed.newerThan !== null ||
    parsed.olderThan !== null
  );
}

/** Convert "7d", "2w", "1m" to an ISO date string */
function durationToDate(value: string): string | null {
  const match = value.match(/^(\d+)([dwm])$/);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2];
  const now = Date.now();
  let ms = 0;
  if (unit === 'd') ms = num * 86400000;
  else if (unit === 'w') ms = num * 7 * 86400000;
  else if (unit === 'm') ms = num * 30 * 86400000;
  else return null;
  return new Date(now - ms).toISOString();
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Search emails using structured operators + FTS5 full-text search.
 * Supports: from:, to:, subject:, has:attachment, in:, is:, newer_than:, older_than:
 */
export async function searchEmails(accountId: string, query: string, limit = 50, offset = 0) {
  const parsed = parseSearchQuery(query);

  if (hasOperators(parsed)) {
    return searchWithOperators(accountId, parsed, limit, offset);
  }

  // Pure free-text search — use FTS5, fall back to LIKE
  const ftsResults = await searchViaFTS(accountId, parsed.freeText, limit, offset);
  if (ftsResults.length > 0) return ftsResults;
  return searchViaLike(accountId, parsed.freeText, limit, offset);
}

// ---------------------------------------------------------------------------
// Operator-aware search
// ---------------------------------------------------------------------------

async function searchWithOperators(accountId: string, parsed: ParsedQuery, limit: number, offset: number) {
  // Step 1: Find matching thread IDs from the emails table using operator filters
  const conditions: string[] = [];
  const params: unknown[] = [];

  // Always scope to the account
  conditions.push('e.account_id = ?');
  params.push(accountId);

  // from: — match from_address or from_name (case-insensitive LIKE)
  if (parsed.from) {
    const likeTerm = `%${escapeLike(parsed.from)}%`;
    conditions.push('(e.from_address LIKE ? ESCAPE \'\\\' OR e.from_name LIKE ? ESCAPE \'\\\')');
    params.push(likeTerm, likeTerm);
  }

  // to: — match to_addresses JSON (case-insensitive LIKE on the serialized JSON)
  if (parsed.to) {
    const likeTerm = `%${escapeLike(parsed.to)}%`;
    conditions.push('e.to_addresses LIKE ? ESCAPE \'\\\'');
    params.push(likeTerm);
  }

  // subject: — match email subject
  if (parsed.subject) {
    const likeTerm = `%${escapeLike(parsed.subject)}%`;
    conditions.push('e.subject LIKE ? ESCAPE \'\\\'');
    params.push(likeTerm);
  }

  // is:unread — only unread emails
  if (parsed.isFilter === 'unread') {
    conditions.push('e.is_unread = 1');
  }
  // is:read
  if (parsed.isFilter === 'read') {
    conditions.push('e.is_unread = 0');
  }

  // newer_than: — emails newer than the given duration
  if (parsed.newerThan) {
    const cutoff = durationToDate(parsed.newerThan);
    if (cutoff) {
      conditions.push('e."internalDate" >= ?');
      params.push(cutoff);
    }
  }

  // older_than: — emails older than the given duration
  if (parsed.olderThan) {
    const cutoff = durationToDate(parsed.olderThan);
    if (cutoff) {
      conditions.push('e."internalDate" <= ?');
      params.push(cutoff);
    }
  }

  // in:sent — emails with SENT label
  if (parsed.inMailbox === 'sent') {
    conditions.push("e.gmail_labels LIKE '%SENT%'");
  }

  // in:inbox — not archived, not trashed, not spam
  // (We'll filter on the threads table after getting thread IDs)

  // Free-text portion: use FTS5 to get a candidate set of thread IDs,
  // then intersect with operator results
  let ftsThreadIds: Set<string> | null = null;
  if (parsed.freeText) {
    const sanitized = sanitizeFTSQuery(parsed.freeText);
    if (sanitized) {
      try {
        const ftsRows = rawDb.prepare(`
          SELECT DISTINCT e.thread_id
          FROM email_fts
          JOIN email_fts_map m ON m.fts_rowid = email_fts.rowid
          JOIN emails e ON e.id = m.email_id
          WHERE email_fts MATCH ?
            AND e.account_id = ?
          ORDER BY email_fts.rank
          LIMIT 1000
        `).all(sanitized, accountId) as Array<{ thread_id: string }>;
        ftsThreadIds = new Set(ftsRows.map((r) => r.thread_id));
      } catch {
        // FTS syntax error — fall through and use LIKE for free text
      }
    }

    // If FTS didn't work, add LIKE conditions for free text
    if (!ftsThreadIds) {
      const likeTerm = `%${escapeLike(parsed.freeText)}%`;
      conditions.push(`(
        e.subject LIKE ? ESCAPE '\\'
        OR e.from_name LIKE ? ESCAPE '\\'
        OR e.from_address LIKE ? ESCAPE '\\'
        OR e.body_text LIKE ? ESCAPE '\\'
      )`);
      params.push(likeTerm, likeTerm, likeTerm, likeTerm);
    }
  }

  // Execute the email query to get candidate thread IDs
  const whereClause = conditions.join(' AND ');
  const candidateRows = rawDb.prepare(`
    SELECT DISTINCT e.thread_id
    FROM emails e
    WHERE ${whereClause}
    LIMIT 500
  `).all(...params) as Array<{ thread_id: string }>;

  let threadIds = candidateRows.map((r) => r.thread_id);

  // Intersect with FTS results if we had free text
  if (ftsThreadIds) {
    threadIds = threadIds.filter((id) => ftsThreadIds!.has(id));
  }

  if (threadIds.length === 0) return [];

  // Step 2: Apply thread-level filters and fetch results
  return fetchThreadsWithFilters(accountId, threadIds, parsed, limit, offset);
}

// ---------------------------------------------------------------------------
// Thread-level filtering + fetch
// ---------------------------------------------------------------------------

async function fetchThreadsWithFilters(
  accountId: string,
  threadIds: string[],
  parsed: ParsedQuery,
  limit: number,
  offset: number,
) {
  // Build thread-level WHERE conditions
  const threadConditions: string[] = [];
  const threadParams: unknown[] = [];

  threadConditions.push('t.account_id = ?');
  threadParams.push(accountId);

  // Scope to the candidate thread IDs
  const placeholders = threadIds.map(() => '?').join(', ');
  threadConditions.push(`t.id IN (${placeholders})`);
  threadParams.push(...threadIds);

  // has:attachment — filter at thread level
  if (parsed.hasAttachment) {
    threadConditions.push('t.has_attachments = 1');
  }

  // is:starred — filter at thread level
  if (parsed.isFilter === 'starred') {
    threadConditions.push('t.is_starred = 1');
  }

  // in:inbox — not archived, not trashed, not spam
  if (parsed.inMailbox === 'inbox') {
    threadConditions.push('t.is_archived = 0 AND t.is_trashed = 0 AND t.is_spam = 0');
  }

  // in:archive
  if (parsed.inMailbox === 'archive') {
    threadConditions.push('t.is_archived = 1');
  }

  // in:trash
  if (parsed.inMailbox === 'trash') {
    threadConditions.push('t.is_trashed = 1');
  }

  // in:spam
  if (parsed.inMailbox === 'spam') {
    threadConditions.push('t.is_spam = 1');
  }

  // in:starred
  if (parsed.inMailbox === 'starred') {
    threadConditions.push('t.is_starred = 1');
  }

  const threadWhere = threadConditions.join(' AND ');
  const threadRows = rawDb.prepare(`
    SELECT *
    FROM threads t
    WHERE ${threadWhere}
    ORDER BY t."lastMessageAt" DESC
    LIMIT ? OFFSET ?
  `).all(...threadParams, limit, offset) as any[];

  if (threadRows.length === 0) return [];

  // Attach sender info (from the first email in each thread)
  const resultThreadIds = threadRows.map((t: any) => t.id);
  const senderPlaceholders = resultThreadIds.map(() => '?').join(', ');
  const firstEmailRows = rawDb.prepare(`
    SELECT e.thread_id, e.from_address, e.from_name
    FROM emails e
    WHERE e.account_id = ?
      AND e.thread_id IN (${senderPlaceholders})
      AND e."internalDate" = (
        SELECT MIN(e2."internalDate") FROM emails e2 WHERE e2.thread_id = e.thread_id
      )
  `).all(accountId, ...resultThreadIds) as Array<{ thread_id: string; from_address: string; from_name: string | null }>;

  const senderByThread = new Map(
    firstEmailRows.map((e) => [e.thread_id, { fromAddress: e.from_address, fromName: e.from_name }]),
  );

  return threadRows.map((t: any) => {
    const sender = senderByThread.get(t.id);
    return {
      ...mapRawThread(t),
      senderName: sender?.fromName || sender?.fromAddress || null,
      senderEmail: sender?.fromAddress || null,
    };
  });
}

/** Map raw SQLite row to the shape expected by the client */
function mapRawThread(row: any) {
  return {
    id: row.id,
    accountId: row.account_id,
    gmailThreadId: row.gmail_thread_id,
    subject: row.subject,
    snippet: row.snippet,
    messageCount: row.message_count,
    unreadCount: row.unread_count,
    hasAttachments: !!row.has_attachments,
    lastMessageAt: row.lastMessageAt,
    category: row.category,
    labels: typeof row.labels === 'string' ? JSON.parse(row.labels) : row.labels,
    isStarred: !!row.is_starred,
    isArchived: !!row.is_archived,
    isTrashed: !!row.is_trashed,
    isSpam: !!row.is_spam,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// FTS5-powered search (pure free-text only)
// ---------------------------------------------------------------------------

async function searchViaFTS(accountId: string, query: string, limit: number, offset: number) {
  const sanitized = sanitizeFTSQuery(query);
  if (!sanitized) return [];

  try {
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
    return [];
  }
}

function sanitizeFTSQuery(query: string): string {
  const cleaned = query
    .replace(/[*"():^{}<>]/g, ' ')
    .replace(/\b(AND|OR|NOT|NEAR)\b/gi, ' ')
    .trim();

  if (!cleaned) return '';

  const terms = cleaned.split(/\s+/).filter(Boolean);
  return terms.map((t) => `"${t}"`).join(' ');
}

// ---------------------------------------------------------------------------
// LIKE fallback (for emails not yet indexed in FTS5)
// ---------------------------------------------------------------------------

async function searchViaLike(accountId: string, query: string, limit: number, offset: number) {
  const likeTerm = `%${escapeLike(query)}%`;

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

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Shared: fetch threads + sender info (for pure free-text results)
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
