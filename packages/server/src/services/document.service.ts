import { db } from '../config/database';
import { documents, documentVersions } from '../db/schema';
import { eq, and, isNull, asc, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import type {
  CreateDocumentInput,
  UpdateDocumentInput,
  MoveDocumentInput,
  DocumentTreeNode,
} from '@atlasmail/shared';

// ─── List all documents (flat) for building the tree ─────────────────

export async function listDocuments(accountId: string, includeArchived = false) {
  const conditions = [eq(documents.accountId, accountId)];

  if (!includeArchived) {
    conditions.push(eq(documents.isArchived, false));
  }

  return db
    .select({
      id: documents.id,
      parentId: documents.parentId,
      title: documents.title,
      icon: documents.icon,
      sortOrder: documents.sortOrder,
      isArchived: documents.isArchived,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(and(...conditions))
    .orderBy(asc(documents.sortOrder), asc(documents.createdAt));
}

/** Build a tree structure from a flat list of documents. */
export function buildDocumentTree(
  docs: Array<{
    id: string;
    parentId: string | null;
    title: string;
    icon: string | null;
    sortOrder: number;
    isArchived: boolean;
  }>,
): DocumentTreeNode[] {
  const map = new Map<string, DocumentTreeNode>();
  const roots: DocumentTreeNode[] = [];

  // First pass: create nodes
  for (const doc of docs) {
    map.set(doc.id, {
      id: doc.id,
      parentId: doc.parentId,
      title: doc.title,
      icon: doc.icon,
      sortOrder: doc.sortOrder,
      isArchived: doc.isArchived,
      children: [],
    });
  }

  // Second pass: assemble tree
  for (const doc of docs) {
    const node = map.get(doc.id)!;
    if (doc.parentId && map.has(doc.parentId)) {
      map.get(doc.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ─── Seed sample documents if the account has none ───────────────────

export async function seedSampleDocuments(accountId: string) {
  // Check if user has any meaningful docs (non-archived, with a title other than "Untitled")
  const meaningful = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.accountId, accountId),
        eq(documents.isArchived, false),
        sql`${documents.title} != 'Untitled'`,
      ),
    )
    .limit(1);

  if (meaningful.length > 0) return; // Already has real documents

  // Delete any leftover empty "Untitled" docs so we can start fresh
  await db.delete(documents).where(eq(documents.accountId, accountId));

  const now = new Date().toISOString();
  const c = (html: string) => ({ _html: html });

  // Cover image URLs (Unsplash, landscape-oriented)
  const covers = {
    gettingStarted: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=300&fit=crop',
    projects:       'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&h=300&fit=crop',
    personal:       'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=300&fit=crop',
    designSystem:   'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=300&fit=crop',
    apiReference:   'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=300&fit=crop',
    quickStart:     'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=300&fit=crop',
    shortcuts:      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1200&h=300&fit=crop',
    roadmap:        'https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?w=1200&h=300&fit=crop',
    meetingNotes:   'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&h=300&fit=crop',
    standup:        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=300&fit=crop',
    retro:          'https://images.unsplash.com/photo-1531498860502-7c67cf02f657?w=1200&h=300&fit=crop',
    readingList:    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&h=300&fit=crop',
    journal:        'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&h=300&fit=crop',
  };

  // Root docs
  const [gettingStarted] = await db.insert(documents).values({
    accountId, title: 'Getting started', icon: '🚀', sortOrder: 0, createdAt: now, updatedAt: now,
    coverImage: covers.gettingStarted,
    content: c('<h1>Getting started</h1><p>Welcome to your document workspace! This is where you can organize your notes, projects, and ideas.</p><p>Use the <strong>sidebar</strong> to navigate between pages. Click the <strong>+</strong> button to create new pages or sub-pages.</p><h2>Tips</h2><ul><li>Use the toolbar to format text — bold, italic, headings, lists, and more</li><li>Changes are <em>auto-saved</em> as you type</li><li>Pages can be nested as deep as you like</li></ul>'),
  }).returning();

  const [projects] = await db.insert(documents).values({
    accountId, title: 'Projects', icon: '📁', sortOrder: 1, createdAt: now, updatedAt: now,
    coverImage: covers.projects,
    content: c('<h1>Projects</h1><p>Organize your projects here. Each project can have its own sub-pages for documentation, meeting notes, and task tracking.</p>'),
  }).returning();

  const [personal] = await db.insert(documents).values({
    accountId, title: 'Personal', icon: '🏠', sortOrder: 2, createdAt: now, updatedAt: now,
    coverImage: covers.personal,
    content: c('<h1>Personal</h1><p>Your personal space for notes, journals, and reading lists.</p>'),
  }).returning();

  await db.insert(documents).values({
    accountId, title: 'Design system', icon: '🎨', sortOrder: 3, createdAt: now, updatedAt: now,
    coverImage: covers.designSystem,
    content: c('<h1>Design system</h1><p>Document your design system here — colors, typography, spacing, components.</p><h2>Colors</h2><ul><li><strong>Primary:</strong> #13715B</li><li><strong>Text:</strong> #1a1a1a</li><li><strong>Border:</strong> #d0d5dd</li></ul><h2>Typography</h2><p>Font: Inter, 14px base, 1.5 line-height</p><h2>Spacing</h2><p>4px grid, 8px base unit</p>'),
  });

  await db.insert(documents).values({
    accountId, title: 'API reference', icon: '⚡', sortOrder: 4, createdAt: now, updatedAt: now,
    coverImage: covers.apiReference,
    content: c('<h1>API reference</h1><p>Document your API endpoints here.</p><h2>Documents</h2><ul><li><code>GET /api/docs</code> — List all documents</li><li><code>POST /api/docs</code> — Create a new document</li><li><code>GET /api/docs/:id</code> — Get a document by ID</li><li><code>PATCH /api/docs/:id</code> — Update a document</li><li><code>DELETE /api/docs/:id</code> — Delete a document</li></ul>'),
  });

  // Children of "Getting started"
  await db.insert(documents).values({
    accountId, title: 'Quick start guide', icon: '📖', sortOrder: 0, parentId: gettingStarted.id, createdAt: now, updatedAt: now,
    coverImage: covers.quickStart,
    content: c('<h1>Quick start guide</h1><ol><li>Create a new page by clicking <strong>New page</strong> at the bottom of the sidebar</li><li>Use the toolbar to format text — headings, bold, italic, lists</li><li>Use keyboard shortcuts: <code>⌘B</code> bold, <code>⌘I</code> italic, <code>⌘U</code> underline</li><li>Changes are auto-saved as you type</li></ol>'),
  });
  await db.insert(documents).values({
    accountId, title: 'Keyboard shortcuts', icon: '⌨️', sortOrder: 1, parentId: gettingStarted.id, createdAt: now, updatedAt: now,
    coverImage: covers.shortcuts,
    content: c('<h1>Keyboard shortcuts</h1><h2>Text formatting</h2><ul><li><code>⌘ + B</code> — Bold</li><li><code>⌘ + I</code> — Italic</li><li><code>⌘ + U</code> — Underline</li><li><code>⌘ + Shift + S</code> — Strikethrough</li><li><code>⌘ + E</code> — Code</li></ul><h2>Blocks</h2><ul><li><code>⌘ + Shift + 7</code> — Numbered list</li><li><code>⌘ + Shift + 8</code> — Bullet list</li><li><code>⌘ + Shift + B</code> — Blockquote</li></ul><h2>General</h2><ul><li><code>⌘ + Z</code> — Undo</li><li><code>⌘ + Shift + Z</code> — Redo</li></ul>'),
  });

  // Children of "Projects"
  await db.insert(documents).values({
    accountId, title: 'Product roadmap', icon: '🗺️', sortOrder: 0, parentId: projects.id, createdAt: now, updatedAt: now,
    coverImage: covers.roadmap,
    content: c('<h1>Product roadmap</h1><h2>Q1</h2><p>Launch beta version with core features</p><h2>Q2</h2><p>Add collaboration and sharing</p><h2>Q3</h2><p>Implement templates and import/export</p><h2>Q4</h2><p>Performance optimizations and mobile support</p>'),
  });
  const [meetingNotes] = await db.insert(documents).values({
    accountId, title: 'Meeting notes', icon: '📝', sortOrder: 1, parentId: projects.id, createdAt: now, updatedAt: now,
    coverImage: covers.meetingNotes,
    content: c('<h1>Meeting notes</h1><p>Keep all your meeting notes organized under this page. Create a sub-page for each meeting.</p>'),
  }).returning();

  // Children of "Meeting notes"
  await db.insert(documents).values({
    accountId, title: 'Weekly standup', sortOrder: 0, parentId: meetingNotes.id, createdAt: now, updatedAt: now,
    coverImage: covers.standup,
    content: c('<h1>Weekly standup</h1><h2>What was done last week</h2><ul><li>Completed user authentication flow</li><li>Fixed 12 reported bugs</li></ul><h2>What\'s planned this week</h2><ul><li>Start working on document editor</li><li>Design sidebar navigation</li></ul>'),
  });
  await db.insert(documents).values({
    accountId, title: 'Sprint retrospective', sortOrder: 1, parentId: meetingNotes.id, createdAt: now, updatedAt: now,
    coverImage: covers.retro,
    content: c('<h1>Sprint retrospective</h1><h2>What went well</h2><p>Great collaboration on the calendar feature.</p><h2>What could improve</h2><p>Need better test coverage.</p><h2>Action items</h2><ul><li>Set up CI pipeline for automated tests</li><li>Add integration tests for API endpoints</li></ul>'),
  });

  // Children of "Personal"
  await db.insert(documents).values({
    accountId, title: 'Reading list', icon: '📚', sortOrder: 0, parentId: personal.id, createdAt: now, updatedAt: now,
    coverImage: covers.readingList,
    content: c('<h1>Reading list</h1><ul><li><strong>Designing Data-Intensive Applications</strong> — Martin Kleppmann</li><li><strong>Staff Engineer</strong> — Will Larson</li><li><strong>The Pragmatic Programmer</strong> — Andy Hunt &amp; Dave Thomas</li><li><strong>Building Microservices</strong> — Sam Newman</li></ul>'),
  });
  await db.insert(documents).values({
    accountId, title: 'Daily journal', icon: '✏️', sortOrder: 1, parentId: personal.id, createdAt: now, updatedAt: now,
    coverImage: covers.journal,
    content: c('<h1>Daily journal</h1><p>Use this space to reflect on your day.</p><blockquote><p>What went well today?</p><p>What could be improved?</p><p>What am I grateful for?</p></blockquote>'),
  });

  logger.info({ accountId }, 'Seeded sample documents');
}

// ─── Get a single document with full content ─────────────────────────

export async function getDocument(accountId: string, documentId: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.accountId, accountId)))
    .limit(1);

  return doc || null;
}

// ─── Create a new document ───────────────────────────────────────────

export async function createDocument(accountId: string, input: CreateDocumentInput) {
  const now = new Date().toISOString();

  // Determine the next sort order within the target parent
  const [maxSort] = await db
    .select({ max: sql<number>`COALESCE(MAX(${documents.sortOrder}), -1)` })
    .from(documents)
    .where(
      and(
        eq(documents.accountId, accountId),
        input.parentId
          ? eq(documents.parentId, input.parentId)
          : isNull(documents.parentId),
      ),
    );

  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db
    .insert(documents)
    .values({
      accountId,
      parentId: input.parentId ?? null,
      title: input.title || 'Untitled',
      content: input.content ?? null,
      icon: input.icon ?? null,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ accountId, documentId: created.id }, 'Document created');
  return created;
}

// ─── Update a document ───────────────────────────────────────────────

export async function updateDocument(
  accountId: string,
  documentId: string,
  input: UpdateDocumentInput,
) {
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.title !== undefined) updates.title = input.title;
  if (input.content !== undefined) updates.content = input.content;
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.coverImage !== undefined) updates.coverImage = input.coverImage;
  if (input.parentId !== undefined) updates.parentId = input.parentId;
  if (input.isArchived !== undefined) updates.isArchived = input.isArchived;

  await db
    .update(documents)
    .set(updates)
    .where(and(eq(documents.id, documentId), eq(documents.accountId, accountId)));

  // If archiving, also archive all descendants recursively
  if (input.isArchived === true) {
    await archiveDescendants(accountId, documentId, true);
  }

  const [updated] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.accountId, accountId)))
    .limit(1);

  return updated || null;
}

/** Recursively archive or unarchive all descendant documents. */
async function archiveDescendants(accountId: string, parentId: string, isArchived: boolean) {
  const children = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.accountId, accountId), eq(documents.parentId, parentId)));

  for (const child of children) {
    await db
      .update(documents)
      .set({ isArchived, updatedAt: new Date().toISOString() })
      .where(eq(documents.id, child.id));
    await archiveDescendants(accountId, child.id, isArchived);
  }
}

// ─── Move / reorder a document ───────────────────────────────────────

export async function moveDocument(
  accountId: string,
  documentId: string,
  input: MoveDocumentInput,
) {
  const now = new Date().toISOString();

  // Prevent a document from being moved under itself (circular reference)
  if (input.parentId) {
    const isDescendant = await checkIsDescendant(accountId, documentId, input.parentId);
    if (isDescendant) {
      throw new Error('Cannot move a document under one of its own descendants');
    }
  }

  await db
    .update(documents)
    .set({
      parentId: input.parentId,
      sortOrder: input.sortOrder,
      updatedAt: now,
    })
    .where(and(eq(documents.id, documentId), eq(documents.accountId, accountId)));

  const [updated] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.accountId, accountId)))
    .limit(1);

  return updated || null;
}

/**
 * Check if `candidateParentId` is a descendant of `documentId`.
 * Used to prevent circular parent references.
 */
async function checkIsDescendant(
  accountId: string,
  documentId: string,
  candidateParentId: string,
): Promise<boolean> {
  let currentId: string | null = candidateParentId;

  // Walk up the tree from candidateParentId. If we encounter documentId, it is a descendant.
  while (currentId) {
    if (currentId === documentId) return true;

    const [parent] = await db
      .select({ parentId: documents.parentId })
      .from(documents)
      .where(and(eq(documents.id, currentId), eq(documents.accountId, accountId)))
      .limit(1);

    currentId = parent?.parentId ?? null;
  }

  return false;
}

// ─── Delete (hard delete) a document and all descendants ─────────────

export async function deleteDocument(accountId: string, documentId: string) {
  // Soft delete: just archive
  await updateDocument(accountId, documentId, { isArchived: true });
}

// ─── Restore an archived document ────────────────────────────────────

export async function restoreDocument(accountId: string, documentId: string) {
  const now = new Date().toISOString();

  await db
    .update(documents)
    .set({ isArchived: false, updatedAt: now })
    .where(and(eq(documents.id, documentId), eq(documents.accountId, accountId)));

  // Also restore descendants
  await archiveDescendants(accountId, documentId, false);

  const [restored] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.accountId, accountId)))
    .limit(1);

  return restored || null;
}

// ─── Full-text search across document content ─────────────────────────

export async function searchDocuments(accountId: string, query: string) {
  const searchTerm = `%${query}%`;
  return db
    .select({
      id: documents.id,
      parentId: documents.parentId,
      title: documents.title,
      icon: documents.icon,
      sortOrder: documents.sortOrder,
      isArchived: documents.isArchived,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(
      and(
        eq(documents.accountId, accountId),
        eq(documents.isArchived, false),
        sql`(${documents.title} LIKE ${searchTerm} OR CAST(${documents.content} AS TEXT) LIKE ${searchTerm})`,
      ),
    )
    .orderBy(asc(documents.updatedAt))
    .limit(20);
}

// ─── Document version history (snapshots) ─────────────────────────────

export async function createVersion(accountId: string, documentId: string) {
  const doc = await getDocument(accountId, documentId);
  if (!doc) return null;

  const [version] = await db
    .insert(documentVersions)
    .values({
      documentId,
      accountId,
      title: doc.title,
      content: doc.content,
      createdAt: new Date().toISOString(),
    })
    .returning();

  // Keep only last 50 versions per document
  const versions = await db
    .select({ id: documentVersions.id })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(sql`${documentVersions.createdAt} DESC`)
    .limit(100)
    .offset(50);

  for (const v of versions) {
    await db.delete(documentVersions).where(eq(documentVersions.id, v.id));
  }

  return version;
}

export async function listVersions(accountId: string, documentId: string) {
  return db
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.accountId, accountId),
      ),
    )
    .orderBy(sql`${documentVersions.createdAt} DESC`)
    .limit(50);
}

export async function getVersion(accountId: string, versionId: string) {
  const [version] = await db
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.id, versionId),
        eq(documentVersions.accountId, accountId),
      ),
    )
    .limit(1);

  return version || null;
}

export async function restoreVersion(accountId: string, documentId: string, versionId: string) {
  const version = await getVersion(accountId, versionId);
  if (!version) return null;

  // Save current state as a version before restoring
  await createVersion(accountId, documentId);

  // Restore the old version's content
  return updateDocument(accountId, documentId, {
    title: version.title,
    content: version.content,
  });
}
