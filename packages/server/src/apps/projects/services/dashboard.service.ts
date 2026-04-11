import { db } from '../../../config/database';
import {
  projectProjects, projectTimeEntries, invoices, crmCompanies,
} from '../../../db/schema';
import { eq, and, asc, desc, gte, lte, inArray, sql } from 'drizzle-orm';

/**
 * Returns the set of project IDs in this tenant that the given user
 * owns OR is a member of. Used to member-scope widget/dashboard data
 * for non-admin callers.
 */
async function getAccessibleProjectIds(tenantId: string, userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: projectProjects.id })
    .from(projectProjects)
    .where(and(
      eq(projectProjects.tenantId, tenantId),
      sql`(${projectProjects.userId} = ${userId} OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ${projectProjects.id} AND pm.user_id = ${userId}))`,
    ));
  return rows.map(r => r.id);
}

/**
 * Returns the set of CRM company IDs tied to projects the user can
 * access. Used to scope invoice queries so a non-admin never sees
 * revenue/billing info from outside their projects.
 */
async function getAccessibleCompanyIds(tenantId: string, userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ companyId: projectProjects.companyId })
    .from(projectProjects)
    .where(and(
      eq(projectProjects.tenantId, tenantId),
      sql`${projectProjects.companyId} IS NOT NULL`,
      sql`(${projectProjects.userId} = ${userId} OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ${projectProjects.id} AND pm.user_id = ${userId}))`,
    ));
  return rows.map(r => r.companyId).filter((id): id is string => !!id);
}

// ─── Widget ─────────────────────────────────────────────────────────

export async function getWidgetData(tenantId: string, userId?: string) {
  const now = new Date();
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday
  weekStart.setDate(weekStart.getDate() - diff);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  // Non-admins: restrict to projects they own or are a member of, and
  // to invoices for companies tied to those projects.
  let accessibleProjectIds: string[] | null = null;
  let accessibleCompanyIds: string[] | null = null;
  if (userId) {
    [accessibleProjectIds, accessibleCompanyIds] = await Promise.all([
      getAccessibleProjectIds(tenantId, userId),
      getAccessibleCompanyIds(tenantId, userId),
    ]);
  }
  const noProjects = accessibleProjectIds !== null && accessibleProjectIds.length === 0;
  const noCompanies = accessibleCompanyIds !== null && accessibleCompanyIds.length === 0;

  // Build project-scoped and invoice-scoped condition arrays.
  const projectScope = (extra: ReturnType<typeof eq>[]) => {
    const base = [
      eq(projectProjects.tenantId, tenantId),
      eq(projectProjects.isArchived, false),
      ...extra,
    ];
    if (accessibleProjectIds) base.push(inArray(projectProjects.id, accessibleProjectIds));
    return and(...base);
  };
  const timeEntryScope = (extra: any[]) => {
    const base: any[] = [
      eq(projectTimeEntries.tenantId, tenantId),
      eq(projectTimeEntries.isArchived, false),
      ...extra,
    ];
    if (accessibleProjectIds) base.push(inArray(projectTimeEntries.projectId, accessibleProjectIds));
    return and(...base);
  };
  const invoiceScope = (extra: any[]) => {
    const base: any[] = [
      eq(invoices.tenantId, tenantId),
      eq(invoices.isArchived, false),
      ...extra,
    ];
    if (accessibleCompanyIds) base.push(inArray(invoices.companyId, accessibleCompanyIds));
    return and(...base);
  };

  // Run all independent widget queries in parallel (short-circuited
  // to empty results when the caller has no accessible projects).
  const [projectCountResult, weekHoursResult, pendingInvoiceResult, overdueCountResult] = await Promise.all([
    // Active projects count
    noProjects
      ? Promise.resolve([{ count: 0 }] as Array<{ count: number }>)
      : db.select({ count: sql<number>`COUNT(*)`.as('count') })
          .from(projectProjects)
          .where(projectScope([eq(projectProjects.status, 'active')])),

    // Total tracked hours this week
    noProjects
      ? Promise.resolve([{ totalMinutes: 0 }] as Array<{ totalMinutes: number }>)
      : db.select({
          totalMinutes: sql<number>`COALESCE(SUM(${projectTimeEntries.durationMinutes}), 0)`.as('total_minutes'),
        })
          .from(projectTimeEntries)
          .where(timeEntryScope([
            gte(projectTimeEntries.workDate, weekStartStr),
            lte(projectTimeEntries.workDate, todayStr),
          ])),

    // Pending invoice amount (sent + viewed + overdue) — from shared invoices table
    noCompanies
      ? Promise.resolve([{ amount: 0 }] as Array<{ amount: number }>)
      : db.select({
          amount: sql<number>`COALESCE(SUM(${invoices.total}), 0)`.as('amount'),
        })
          .from(invoices)
          .where(invoiceScope([sql`${invoices.status} IN ('sent', 'viewed', 'overdue')`])),

    // Overdue invoice count
    noCompanies
      ? Promise.resolve([{ count: 0 }] as Array<{ count: number }>)
      : db.select({ count: sql<number>`COUNT(*)`.as('count') })
          .from(invoices)
          .where(invoiceScope([eq(invoices.status, 'overdue')])),
  ]);

  const projectCount = projectCountResult[0];
  const weekHours = weekHoursResult[0];
  const pendingInvoice = pendingInvoiceResult[0];
  const overdueCount = overdueCountResult[0];

  return {
    activeProjects: Number(projectCount?.count ?? 0),
    totalTrackedHoursThisWeek: Number(weekHours?.totalMinutes ?? 0) / 60,
    pendingInvoiceAmount: Number(pendingInvoice?.amount ?? 0),
    overdueInvoiceCount: Number(overdueCount?.count ?? 0),
  };
}

// ─── Enhanced Dashboard ─────────────────────────────────────────────

export async function getDashboardData(userId: string, tenantId: string) {
  const now = new Date();
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  const diff = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - diff);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const [
    projectCountResult,
    weekHoursResult,
    pendingInvoiceResult,
    overdueResult,
    revenueResult,
    hoursByDayResult,
    recentTimeEntries,
    recentInvoiceActions,
    unbilledResult,
  ] = await Promise.all([
    // Active projects count
    db.select({ count: sql<number>`COUNT(*)`.as('count') })
      .from(projectProjects)
      .where(and(
        eq(projectProjects.tenantId, tenantId),
        eq(projectProjects.isArchived, false),
        eq(projectProjects.status, 'active'),
      )),

    // Total tracked hours this week
    db.select({
      totalMinutes: sql<number>`COALESCE(SUM(${projectTimeEntries.durationMinutes}), 0)`.as('total_minutes'),
    })
      .from(projectTimeEntries)
      .where(and(
        eq(projectTimeEntries.tenantId, tenantId),
        eq(projectTimeEntries.isArchived, false),
        gte(projectTimeEntries.workDate, weekStartStr),
        lte(projectTimeEntries.workDate, todayStr),
      )),

    // Pending invoice amount (sent + viewed + overdue)
    db.select({
      count: sql<number>`COUNT(*)`.as('count'),
      amount: sql<number>`COALESCE(SUM(${invoices.total}), 0)`.as('amount'),
    })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.isArchived, false),
        sql`${invoices.status} IN ('sent', 'viewed', 'overdue')`,
      )),

    // Overdue invoice count + amount
    db.select({
      count: sql<number>`COUNT(*)`.as('count'),
      amount: sql<number>`COALESCE(SUM(${invoices.total}), 0)`.as('amount'),
    })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.isArchived, false),
        eq(invoices.status, 'overdue'),
      )),

    // Revenue breakdown: invoiced, paid, outstanding
    db.select({
      invoiced: sql<number>`COALESCE(SUM(${invoices.total}), 0)`.as('invoiced'),
      paid: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.total} ELSE 0 END), 0)`.as('paid'),
      outstanding: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} IN ('sent', 'viewed', 'overdue') THEN ${invoices.total} ELSE 0 END), 0)`.as('outstanding'),
    })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.isArchived, false),
      )),

    // Hours by day this week (Mon-Sun)
    db.select({
      date: projectTimeEntries.workDate,
      minutes: sql<number>`COALESCE(SUM(${projectTimeEntries.durationMinutes}), 0)`.as('minutes'),
    })
      .from(projectTimeEntries)
      .where(and(
        eq(projectTimeEntries.tenantId, tenantId),
        eq(projectTimeEntries.isArchived, false),
        gte(projectTimeEntries.workDate, weekStartStr),
        lte(projectTimeEntries.workDate, weekEndStr),
      ))
      .groupBy(projectTimeEntries.workDate)
      .orderBy(asc(projectTimeEntries.workDate)),

    // Recent time entries (last 5)
    db.select({
      id: projectTimeEntries.id,
      projectName: projectProjects.name,
      projectColor: projectProjects.color,
      durationMinutes: projectTimeEntries.durationMinutes,
      workDate: projectTimeEntries.workDate,
      taskDescription: projectTimeEntries.taskDescription,
      notes: projectTimeEntries.notes,
      createdAt: projectTimeEntries.createdAt,
    })
      .from(projectTimeEntries)
      .innerJoin(projectProjects, eq(projectTimeEntries.projectId, projectProjects.id))
      .where(and(
        eq(projectTimeEntries.tenantId, tenantId),
        eq(projectTimeEntries.isArchived, false),
      ))
      .orderBy(desc(projectTimeEntries.createdAt))
      .limit(5),

    // Recent invoice actions (last 5 non-draft invoices) — from shared invoices table
    db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      clientName: crmCompanies.name,
      status: invoices.status,
      amount: invoices.total,
      updatedAt: invoices.updatedAt,
    })
      .from(invoices)
      .leftJoin(crmCompanies, eq(invoices.companyId, crmCompanies.id))
      .where(and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.isArchived, false),
      ))
      .orderBy(desc(invoices.updatedAt))
      .limit(5),

    // Unbilled billable hours (time entries not linked to any invoice line item)
    db.select({
      totalMinutes: sql<number>`COALESCE(SUM(${projectTimeEntries.durationMinutes}), 0)`.as('total_minutes'),
    })
      .from(projectTimeEntries)
      .where(and(
        eq(projectTimeEntries.tenantId, tenantId),
        eq(projectTimeEntries.isArchived, false),
        eq(projectTimeEntries.billable, true),
        sql`NOT EXISTS (SELECT 1 FROM invoice_line_items ili WHERE ili.time_entry_id = ${projectTimeEntries.id})`,
      )),
  ]);

  const projectCount = projectCountResult[0];
  const weekHours = weekHoursResult[0];
  const pendingInvoice = pendingInvoiceResult[0];
  const overdue = overdueResult[0];
  const revenue = revenueResult[0];
  const unbilled = unbilledResult[0];

  // Build hours by day array (Mon-Sun)
  const dayMap = new Map<string, number>();
  for (const row of hoursByDayResult) {
    dayMap.set(String(row.date), Number(row.minutes) / 60);
  }
  const hoursByDay: Array<{ date: string; hours: number }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    hoursByDay.push({ date: dateStr, hours: dayMap.get(dateStr) ?? 0 });
  }

  return {
    hoursThisWeek: Number(weekHours?.totalMinutes ?? 0) / 60,
    activeProjects: Number(projectCount?.count ?? 0),
    outstandingInvoices: Number(pendingInvoice?.count ?? 0),
    totalOutstandingAmount: Number(pendingInvoice?.amount ?? 0),
    overdueInvoices: Number(overdue?.count ?? 0),
    totalOverdueAmount: Number(overdue?.amount ?? 0),
    unbilledHours: Number(unbilled?.totalMinutes ?? 0) / 60,
    revenue: {
      invoiced: Number(revenue?.invoiced ?? 0),
      paid: Number(revenue?.paid ?? 0),
      outstanding: Number(revenue?.outstanding ?? 0),
    },
    hoursByDay,
    recentTimeEntries: recentTimeEntries.map(e => ({
      id: e.id,
      projectName: e.projectName,
      projectColor: e.projectColor,
      hours: Number(e.durationMinutes) / 60,
      date: e.workDate,
      description: e.taskDescription || e.notes || null,
      createdAt: e.createdAt,
    })),
    recentInvoiceActions: recentInvoiceActions.map(i => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      clientName: i.clientName,
      status: i.status,
      amount: Number(i.amount),
      updatedAt: i.updatedAt,
    })),
  };
}
