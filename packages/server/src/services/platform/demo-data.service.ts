import { db } from '../../config/database';
import {
  demoDataSeeds,
  crmCompanies, crmContacts, crmDeals, crmLeads, crmActivities, crmLeadForms,
  employees, departments, timeOffRequests, hrLeaveApplications,
  invoices, invoiceLineItems, invoicePayments,
  driveItems,
  documents,
  drawings,
  tasks, projectProjects, projectTimeEntries,
  // Note: intentionally NOT tracking per-tenant platform defaults like
  // crm_deal_stages, crm_activity_types, hr_leave_types, sign_templates —
  // those are real platform data every tenant benefits from, not "demo".
} from '../../db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { seedSampleData as seedCrmSampleData } from '../../apps/crm/services/dashboard.service';
import { seedSampleData as seedHrSampleData } from '../../apps/hr/services/dashboard.service';
import { seedSampleInvoices } from '../../apps/invoices/services/seed.service';
import { seedSampleData as seedDriveSampleData } from '../../apps/drive/services/items.service';
import { seedSampleDocuments } from '../../apps/docs/services/document.service';
import { seedSampleDrawings } from '../../apps/draw/service';

// ─── Entity registry ─────────────────────────────────────────────────
// Every table we track here gets diffed before/after each seeder runs;
// every new row becomes a demo_data_seeds entry. Delete order mirrors
// foreign-key dependencies (children before parents).

interface TrackedEntity {
  /** Entity type string written to demo_data_seeds.entity_type. */
  key: string;
  /** Drizzle table reference. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any;
  /** Column containing the tenant id on this table (usually tenantId). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tenantIdCol: any;
  /** Primary-key column (always `id` for our tables). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  idCol: any;
}

// Ordered so removals cascade correctly when we iterate in REVERSE:
//   parents first in this list → removal iterates bottom-up, deleting
//   children before their parents.
const TRACKED: TrackedEntity[] = [
  { key: 'crm_companies',     table: crmCompanies,     tenantIdCol: crmCompanies.tenantId,     idCol: crmCompanies.id },
  { key: 'crm_contacts',      table: crmContacts,      tenantIdCol: crmContacts.tenantId,      idCol: crmContacts.id },
  { key: 'crm_deals',         table: crmDeals,         tenantIdCol: crmDeals.tenantId,         idCol: crmDeals.id },
  { key: 'crm_leads',         table: crmLeads,         tenantIdCol: crmLeads.tenantId,         idCol: crmLeads.id },
  { key: 'crm_activities',    table: crmActivities,    tenantIdCol: crmActivities.tenantId,    idCol: crmActivities.id },
  { key: 'crm_lead_forms',    table: crmLeadForms,     tenantIdCol: crmLeadForms.tenantId,     idCol: crmLeadForms.id },
  { key: 'employees',         table: employees,        tenantIdCol: employees.tenantId,        idCol: employees.id },
  { key: 'departments',       table: departments,      tenantIdCol: departments.tenantId,      idCol: departments.id },
  { key: 'time_off_requests', table: timeOffRequests,  tenantIdCol: timeOffRequests.tenantId,  idCol: timeOffRequests.id },
  { key: 'hr_leave_applications', table: hrLeaveApplications, tenantIdCol: hrLeaveApplications.tenantId, idCol: hrLeaveApplications.id },
  { key: 'invoices',          table: invoices,         tenantIdCol: invoices.tenantId,         idCol: invoices.id },
  { key: 'invoice_line_items',table: invoiceLineItems, tenantIdCol: null,                      idCol: invoiceLineItems.id },
  { key: 'invoice_payments',  table: invoicePayments,  tenantIdCol: invoicePayments.tenantId,  idCol: invoicePayments.id },
  { key: 'drive_items',       table: driveItems,       tenantIdCol: driveItems.tenantId,       idCol: driveItems.id },
  { key: 'documents',         table: documents,        tenantIdCol: documents.tenantId,        idCol: documents.id },
  { key: 'drawings',          table: drawings,         tenantIdCol: drawings.tenantId,         idCol: drawings.id },
  { key: 'tasks',             table: tasks,            tenantIdCol: tasks.tenantId,            idCol: tasks.id },
  { key: 'project_projects',  table: projectProjects,  tenantIdCol: projectProjects.tenantId,  idCol: projectProjects.id },
  { key: 'project_time_entries', table: projectTimeEntries, tenantIdCol: projectTimeEntries.tenantId, idCol: projectTimeEntries.id },
];

async function snapshotIdsFor(tenantId: string): Promise<Map<string, Set<string>>> {
  const snapshot = new Map<string, Set<string>>();
  for (const entity of TRACKED) {
    if (!entity.tenantIdCol) {
      // Line items don't have a direct tenant column — resolve via
      // their parent invoice's tenant. We snapshot via join below
      // (separate code path so it only runs when we need it).
      const rows = await db.select({ id: entity.idCol })
        .from(entity.table)
        .innerJoin(invoices, eq(invoiceLineItems.invoiceId, invoices.id))
        .where(eq(invoices.tenantId, tenantId));
      snapshot.set(entity.key, new Set(rows.map((r) => r.id)));
      continue;
    }
    const rows = await db.select({ id: entity.idCol })
      .from(entity.table)
      .where(eq(entity.tenantIdCol, tenantId));
    snapshot.set(entity.key, new Set(rows.map((r) => r.id)));
  }
  return snapshot;
}

// ─── Seed ────────────────────────────────────────────────────────────

/**
 * Run every app's seeder, then diff each tracked table against the
 * pre-seed snapshot. Any new row is registered in demo_data_seeds so
 * we can later identify and remove exactly the planted rows.
 */
export async function seedDemoData(tenantId: string, userId: string): Promise<{
  inserted: Record<string, number>;
}> {
  const before = await snapshotIdsFor(tenantId);

  // Call each app's seeder. Each is idempotent — running twice is safe,
  // just won't duplicate data. We swallow per-app errors so one failing
  // seeder doesn't abort the rest.
  const apps = [
    { name: 'crm',      run: () => seedCrmSampleData(userId, tenantId) },
    { name: 'hr',       run: () => seedHrSampleData(userId, tenantId) },
    { name: 'invoices', run: () => seedSampleInvoices(userId, tenantId) },
    { name: 'drive',    run: () => seedDriveSampleData(userId, tenantId) },
    { name: 'docs',     run: () => seedSampleDocuments(userId, tenantId) },
    { name: 'draw',     run: () => seedSampleDrawings(userId, tenantId) },
  ];
  for (const app of apps) {
    try {
      await app.run();
    } catch (err) {
      logger.error({ err, app: app.name, tenantId }, 'Demo data seeder failed');
    }
  }

  const after = await snapshotIdsFor(tenantId);

  // Compute the diff and register the new rows.
  const inserted: Record<string, number> = {};
  const toRegister: Array<{ tenantId: string; entityType: string; entityId: string }> = [];
  for (const entity of TRACKED) {
    const prev = before.get(entity.key) ?? new Set<string>();
    const curr = after.get(entity.key) ?? new Set<string>();
    const newIds = [...curr].filter((id) => !prev.has(id));
    inserted[entity.key] = newIds.length;
    for (const id of newIds) {
      toRegister.push({ tenantId, entityType: entity.key, entityId: id });
    }
  }

  if (toRegister.length > 0) {
    // Chunk inserts — some tenants with heavy seeders may produce
    // hundreds of rows; a single INSERT of 500+ rows is fine but we
    // cap at 200 per round-trip to stay well under parameter limits.
    const CHUNK = 200;
    for (let i = 0; i < toRegister.length; i += CHUNK) {
      await db.insert(demoDataSeeds).values(toRegister.slice(i, i + CHUNK));
    }
  }

  logger.info({ tenantId, userId, inserted }, 'Demo data seeded');
  return { inserted };
}

// ─── Remove ──────────────────────────────────────────────────────────

/**
 * Delete every row whose id lives in demo_data_seeds for this tenant,
 * then clear the registry rows themselves. Iterates TRACKED in reverse
 * so children (invoice_line_items, invoice_payments) delete before
 * parents (invoices).
 */
export async function removeDemoData(tenantId: string): Promise<{
  removed: Record<string, number>;
}> {
  const registry = await db.select().from(demoDataSeeds)
    .where(eq(demoDataSeeds.tenantId, tenantId));

  const byEntity = new Map<string, string[]>();
  for (const row of registry) {
    const list = byEntity.get(row.entityType) ?? [];
    list.push(row.entityId);
    byEntity.set(row.entityType, list);
  }

  const removed: Record<string, number> = {};
  // Delete in reverse TRACKED order — children first so FK cascades
  // don't surprise us if a row was linked to user-created data.
  for (const entity of [...TRACKED].reverse()) {
    const ids = byEntity.get(entity.key);
    if (!ids || ids.length === 0) {
      removed[entity.key] = 0;
      continue;
    }
    // inArray has a parameter cap — chunk large lists.
    const CHUNK = 500;
    let deleted = 0;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const batch = ids.slice(i, i + CHUNK);
      const result = await db.delete(entity.table)
        .where(inArray(entity.idCol, batch));
      // drizzle returns { rowCount } on pg — fall back if not available.
      deleted += (result as { rowCount?: number }).rowCount ?? batch.length;
    }
    removed[entity.key] = deleted;
  }

  // Clear the registry now that everything is gone.
  await db.delete(demoDataSeeds).where(eq(demoDataSeeds.tenantId, tenantId));

  logger.info({ tenantId, removed }, 'Demo data removed');
  return { removed };
}

// ─── Status ──────────────────────────────────────────────────────────

export async function hasDemoData(tenantId: string): Promise<boolean> {
  const [{ n }] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(demoDataSeeds)
    .where(eq(demoDataSeeds.tenantId, tenantId));
  return Number(n) > 0;
}

export async function getDemoDataSummary(tenantId: string): Promise<{
  hasDemoData: boolean;
  counts: Record<string, number>;
}> {
  const rows = await db.select({
    entityType: demoDataSeeds.entityType,
    n: sql<number>`COUNT(*)::int`,
  }).from(demoDataSeeds)
    .where(eq(demoDataSeeds.tenantId, tenantId))
    .groupBy(demoDataSeeds.entityType);

  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const n = Number(row.n);
    counts[row.entityType] = n;
    total += n;
  }
  return { hasDemoData: total > 0, counts };
}

