import { db } from '../../config/database';
import { spreadsheets } from '../../db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import type { CreateSpreadsheetInput, UpdateSpreadsheetInput } from '@atlasmail/shared';

// ─── List all spreadsheets (flat list) ───────────────────────────────

export async function listSpreadsheets(userId: string, includeArchived = false) {
  const conditions = [eq(spreadsheets.userId, userId)];

  if (!includeArchived) {
    conditions.push(eq(spreadsheets.isArchived, false));
  }

  return db
    .select({
      id: spreadsheets.id,
      accountId: spreadsheets.accountId,
      userId: spreadsheets.userId,
      title: spreadsheets.title,
      columns: spreadsheets.columns,
      viewConfig: spreadsheets.viewConfig,
      sortOrder: spreadsheets.sortOrder,
      isArchived: spreadsheets.isArchived,
      color: spreadsheets.color,
      icon: spreadsheets.icon,
      createdAt: spreadsheets.createdAt,
      updatedAt: spreadsheets.updatedAt,
    })
    .from(spreadsheets)
    .where(and(...conditions))
    .orderBy(asc(spreadsheets.sortOrder), asc(spreadsheets.createdAt));
}

// ─── Get a single spreadsheet with full data ──────────────────────────

export async function getSpreadsheet(userId: string, spreadsheetId: string) {
  const [spreadsheet] = await db
    .select()
    .from(spreadsheets)
    .where(and(eq(spreadsheets.id, spreadsheetId), eq(spreadsheets.userId, userId)))
    .limit(1);

  return spreadsheet || null;
}

// ─── Seed sample spreadsheets on first visit ─────────────────────────

export async function seedSampleSpreadsheets(userId: string, accountId: string) {
  const existing = await db
    .select({ id: spreadsheets.id })
    .from(spreadsheets)
    .where(eq(spreadsheets.userId, userId))
    .limit(1);

  if (existing.length > 0) return { skipped: true }; // User already has tables

  const now = new Date();
  const ts = now.toISOString();

  // ── 1. Product inventory ──────────────────────────────────────────
  const inventoryCols = [
    { id: 'col_name', name: 'Name', type: 'text' as const, width: 220 },
    { id: 'col_sku', name: 'SKU', type: 'text' as const, width: 130 },
    { id: 'col_price', name: 'Price', type: 'number' as const, width: 100 },
    { id: 'col_stock', name: 'In Stock', type: 'number' as const, width: 100 },
    { id: 'col_category', name: 'Category', type: 'singleSelect' as const, width: 140, options: ['Electronics', 'Clothing', 'Home', 'Food'] },
    { id: 'col_status', name: 'Status', type: 'singleSelect' as const, width: 140, options: ['Active', 'Discontinued'] },
  ];

  const inventoryRows = [
    { _id: 'inv_1', _createdAt: ts, col_name: 'Wireless earbuds', col_sku: 'ELEC-001', col_price: 79.99, col_stock: 245, col_category: 'Electronics', col_status: 'Active' },
    { _id: 'inv_2', _createdAt: ts, col_name: 'USB-C hub', col_sku: 'ELEC-002', col_price: 49.99, col_stock: 132, col_category: 'Electronics', col_status: 'Active' },
    { _id: 'inv_3', _createdAt: ts, col_name: 'Merino wool sweater', col_sku: 'CLTH-010', col_price: 89.00, col_stock: 58, col_category: 'Clothing', col_status: 'Active' },
    { _id: 'inv_4', _createdAt: ts, col_name: 'Linen shirt', col_sku: 'CLTH-011', col_price: 54.50, col_stock: 0, col_category: 'Clothing', col_status: 'Discontinued' },
    { _id: 'inv_5', _createdAt: ts, col_name: 'Ceramic plant pot', col_sku: 'HOME-020', col_price: 24.00, col_stock: 310, col_category: 'Home', col_status: 'Active' },
    { _id: 'inv_6', _createdAt: ts, col_name: 'Scented candle set', col_sku: 'HOME-021', col_price: 32.00, col_stock: 87, col_category: 'Home', col_status: 'Active' },
    { _id: 'inv_7', _createdAt: ts, col_name: 'Organic granola', col_sku: 'FOOD-030', col_price: 8.99, col_stock: 520, col_category: 'Food', col_status: 'Active' },
    { _id: 'inv_8', _createdAt: ts, col_name: 'Cold-brew concentrate', col_sku: 'FOOD-031', col_price: 14.50, col_stock: 190, col_category: 'Food', col_status: 'Active' },
  ];

  await db.insert(spreadsheets).values({
    accountId, userId, title: 'Product inventory', columns: inventoryCols, rows: inventoryRows,
    viewConfig: { activeView: 'grid' }, sortOrder: 0, createdAt: now, updatedAt: now,
  });

  // ── 2. Team roster ────────────────────────────────────────────────
  const rosterCols = [
    { id: 'col_name', name: 'Name', type: 'text' as const, width: 200 },
    { id: 'col_email', name: 'Email', type: 'text' as const, width: 240 },
    { id: 'col_role', name: 'Role', type: 'text' as const, width: 180 },
    { id: 'col_dept', name: 'Department', type: 'singleSelect' as const, width: 150, options: ['Engineering', 'Design', 'Marketing', 'Sales'] },
    { id: 'col_start', name: 'Start Date', type: 'date' as const, width: 130 },
  ];

  const rosterRows = [
    { _id: 'ros_1', _createdAt: ts, col_name: 'Alice Chen', col_email: 'alice@example.com', col_role: 'Senior engineer', col_dept: 'Engineering', col_start: '2022-03-14' },
    { _id: 'ros_2', _createdAt: ts, col_name: 'Bob Martinez', col_email: 'bob@example.com', col_role: 'Product designer', col_dept: 'Design', col_start: '2023-01-09' },
    { _id: 'ros_3', _createdAt: ts, col_name: 'Carol Nguyen', col_email: 'carol@example.com', col_role: 'Marketing manager', col_dept: 'Marketing', col_start: '2021-11-01' },
    { _id: 'ros_4', _createdAt: ts, col_name: 'David Park', col_email: 'david@example.com', col_role: 'Account executive', col_dept: 'Sales', col_start: '2023-06-20' },
    { _id: 'ros_5', _createdAt: ts, col_name: 'Eva Schmidt', col_email: 'eva@example.com', col_role: 'Frontend engineer', col_dept: 'Engineering', col_start: '2024-02-05' },
    { _id: 'ros_6', _createdAt: ts, col_name: 'Frank Okafor', col_email: 'frank@example.com', col_role: 'Content strategist', col_dept: 'Marketing', col_start: '2024-08-12' },
  ];

  await db.insert(spreadsheets).values({
    accountId, userId, title: 'Team roster', columns: rosterCols, rows: rosterRows,
    viewConfig: { activeView: 'grid' }, sortOrder: 1, createdAt: now, updatedAt: now,
  });

  // ── 3. Bug tracker ────────────────────────────────────────────────
  const bugCols = [
    { id: 'col_title', name: 'Title', type: 'text' as const, width: 280 },
    { id: 'col_priority', name: 'Priority', type: 'singleSelect' as const, width: 120, options: ['Critical', 'High', 'Medium', 'Low'] },
    { id: 'col_status', name: 'Status', type: 'singleSelect' as const, width: 130, options: ['Open', 'In Progress', 'Fixed', 'Closed'] },
    { id: 'col_assigned', name: 'Assigned To', type: 'text' as const, width: 160 },
  ];

  const bugRows = [
    { _id: 'bug_1', _createdAt: ts, col_title: 'Login page crashes on Safari 17', col_priority: 'Critical', col_status: 'In Progress', col_assigned: 'Alice Chen' },
    { _id: 'bug_2', _createdAt: ts, col_title: 'Dark mode flicker on page load', col_priority: 'High', col_status: 'Open', col_assigned: 'Eva Schmidt' },
    { _id: 'bug_3', _createdAt: ts, col_title: 'CSV export missing last column', col_priority: 'Medium', col_status: 'Fixed', col_assigned: 'Alice Chen' },
    { _id: 'bug_4', _createdAt: ts, col_title: 'Tooltip cut off near screen edge', col_priority: 'Low', col_status: 'Open', col_assigned: 'Bob Martinez' },
    { _id: 'bug_5', _createdAt: ts, col_title: 'Search returns stale results after delete', col_priority: 'High', col_status: 'Closed', col_assigned: 'Eva Schmidt' },
  ];

  await db.insert(spreadsheets).values({
    accountId, userId, title: 'Bug tracker', columns: bugCols, rows: bugRows,
    viewConfig: { activeView: 'grid' }, sortOrder: 2, createdAt: now, updatedAt: now,
  });

  logger.info({ userId }, 'Seeded sample spreadsheets');
  return { spreadsheets: 3 };
}

// ─── Create a new spreadsheet ────────────────────────────────────────

export async function createSpreadsheet(userId: string, accountId: string, input: CreateSpreadsheetInput) {
  const now = new Date();

  const [created] = await db
    .insert(spreadsheets)
    .values({
      accountId,
      userId,
      title: input.title || 'Untitled table',
      columns: input.columns ?? [],
      rows: input.rows ?? [],
      viewConfig: input.viewConfig ?? { activeView: 'grid' as const },
      sortOrder: sql`COALESCE((SELECT MAX(${spreadsheets.sortOrder}) FROM spreadsheets WHERE ${spreadsheets.userId} = ${userId}), -1) + 1`,
      color: input.color ?? null,
      icon: input.icon ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ userId, spreadsheetId: created.id }, 'Spreadsheet created');
  return created;
}

// ─── Update a spreadsheet ────────────────────────────────────────────

export async function updateSpreadsheet(
  userId: string,
  spreadsheetId: string,
  input: UpdateSpreadsheetInput,
) {
  const now = new Date();

  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.title !== undefined) updates.title = input.title;
  if (input.columns !== undefined) updates.columns = input.columns;
  if (input.rows !== undefined) updates.rows = input.rows;
  if (input.viewConfig !== undefined) updates.viewConfig = input.viewConfig;
  if (input.isArchived !== undefined) updates.isArchived = input.isArchived;
  if (input.color !== undefined) updates.color = input.color;
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.guide !== undefined) updates.guide = input.guide;

  const [updated] = await db
    .update(spreadsheets)
    .set(updates)
    .where(and(eq(spreadsheets.id, spreadsheetId), eq(spreadsheets.userId, userId)))
    .returning();

  return updated || null;
}

// ─── Delete (soft delete) a spreadsheet ──────────────────────────────

export async function deleteSpreadsheet(userId: string, spreadsheetId: string) {
  return updateSpreadsheet(userId, spreadsheetId, { isArchived: true });
}

// ─── Restore an archived spreadsheet ─────────────────────────────────

export async function restoreSpreadsheet(userId: string, spreadsheetId: string) {
  const now = new Date();

  const [restored] = await db
    .update(spreadsheets)
    .set({ isArchived: false, updatedAt: now })
    .where(and(eq(spreadsheets.id, spreadsheetId), eq(spreadsheets.userId, userId)))
    .returning();

  return restored || null;
}

// ─── Search spreadsheets by title ────────────────────────────────────

export async function searchSpreadsheets(userId: string, query: string) {
  const searchTerm = `%${query}%`;
  return db
    .select({
      id: spreadsheets.id,
      accountId: spreadsheets.accountId,
      userId: spreadsheets.userId,
      title: spreadsheets.title,
      columns: spreadsheets.columns,
      viewConfig: spreadsheets.viewConfig,
      sortOrder: spreadsheets.sortOrder,
      isArchived: spreadsheets.isArchived,
      color: spreadsheets.color,
      icon: spreadsheets.icon,
      createdAt: spreadsheets.createdAt,
      updatedAt: spreadsheets.updatedAt,
    })
    .from(spreadsheets)
    .where(
      and(
        eq(spreadsheets.userId, userId),
        eq(spreadsheets.isArchived, false),
        sql`${spreadsheets.title} LIKE ${searchTerm}`,
      ),
    )
    .orderBy(asc(spreadsheets.updatedAt))
    .limit(20);
}
