import { db } from '../../../config/database';
import { sql } from 'drizzle-orm';

interface ReceivablesBuckets {
  total: number;
  current: number;
  overdue1to15: number;
  overdue16to30: number;
  overdue31to45: number;
  overdue45plus: number;
}

interface MonthlyActivity {
  month: string;
  invoiced: number;
  paid: number;
}

interface PeriodRow {
  invoiced: number;
  received: number;
  due: number;
}

interface PeriodSummary {
  today: PeriodRow;
  thisWeek: PeriodRow;
  thisMonth: PeriodRow;
  thisQuarter: PeriodRow;
  thisYear: PeriodRow;
}

export async function getInvoicesDashboard(tenantId: string) {
  const [receivables, monthlyActivity, periodSummary] = await Promise.all([
    getReceivables(tenantId),
    getMonthlyActivity(tenantId),
    getPeriodSummary(tenantId),
  ]);

  return { receivables, monthlyActivity, periodSummary };
}

// ─── Receivables ────────────────────────────────────────────────────

async function getReceivables(tenantId: string): Promise<ReceivablesBuckets> {
  const result = await db.execute(sql`
    SELECT
      COALESCE(SUM(total), 0) AS total,
      COALESCE(SUM(CASE WHEN due_date >= NOW() THEN total ELSE 0 END), 0) AS current_amount,
      COALESCE(SUM(CASE WHEN due_date < NOW() AND due_date >= NOW() - INTERVAL '15 days' THEN total ELSE 0 END), 0) AS overdue_1_15,
      COALESCE(SUM(CASE WHEN due_date < NOW() - INTERVAL '15 days' AND due_date >= NOW() - INTERVAL '30 days' THEN total ELSE 0 END), 0) AS overdue_16_30,
      COALESCE(SUM(CASE WHEN due_date < NOW() - INTERVAL '30 days' AND due_date >= NOW() - INTERVAL '45 days' THEN total ELSE 0 END), 0) AS overdue_31_45,
      COALESCE(SUM(CASE WHEN due_date < NOW() - INTERVAL '45 days' THEN total ELSE 0 END), 0) AS overdue_45_plus
    FROM invoices
    WHERE tenant_id = ${tenantId}
      AND status IN ('sent', 'viewed', 'approved')
      AND is_archived = false
  `);

  const row = result.rows[0] as Record<string, string>;
  return {
    total: Number(row.total) || 0,
    current: Number(row.current_amount) || 0,
    overdue1to15: Number(row.overdue_1_15) || 0,
    overdue16to30: Number(row.overdue_16_30) || 0,
    overdue31to45: Number(row.overdue_31_45) || 0,
    overdue45plus: Number(row.overdue_45_plus) || 0,
  };
}

// ─── Monthly Activity ───────────────────────────────────────────────

async function getMonthlyActivity(tenantId: string): Promise<MonthlyActivity[]> {
  // Get invoiced amounts by month (last 12 months)
  const invoicedResult = await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', issue_date), 'YYYY-MM') AS month,
      COALESCE(SUM(total), 0) AS amount
    FROM invoices
    WHERE tenant_id = ${tenantId}
      AND status != 'draft'
      AND is_archived = false
      AND issue_date >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
    GROUP BY DATE_TRUNC('month', issue_date)
    ORDER BY month
  `);

  // Get paid amounts by month (last 12 months)
  const paidResult = await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', paid_at), 'YYYY-MM') AS month,
      COALESCE(SUM(total), 0) AS amount
    FROM invoices
    WHERE tenant_id = ${tenantId}
      AND status = 'paid'
      AND is_archived = false
      AND paid_at IS NOT NULL
      AND paid_at >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
    GROUP BY DATE_TRUNC('month', paid_at)
    ORDER BY month
  `);

  // Build a map of all 12 months
  const months: Map<string, MonthlyActivity> = new Map();
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.set(key, { month: key, invoiced: 0, paid: 0 });
  }

  for (const row of invoicedResult.rows as Array<{ month: string; amount: string }>) {
    const entry = months.get(row.month);
    if (entry) entry.invoiced = Number(row.amount) || 0;
  }

  for (const row of paidResult.rows as Array<{ month: string; amount: string }>) {
    const entry = months.get(row.month);
    if (entry) entry.paid = Number(row.amount) || 0;
  }

  return Array.from(months.values());
}

// ─── Period Summary ─────────────────────────────────────────────────

async function getPeriodSummary(tenantId: string): Promise<PeriodSummary> {
  const result = await db.execute(sql`
    SELECT
      -- Today
      COALESCE(SUM(CASE WHEN issue_date::date = CURRENT_DATE AND status != 'draft' THEN total ELSE 0 END), 0) AS today_invoiced,
      COALESCE(SUM(CASE WHEN paid_at::date = CURRENT_DATE AND status = 'paid' THEN total ELSE 0 END), 0) AS today_received,

      -- This week (Monday-based)
      COALESCE(SUM(CASE WHEN issue_date >= DATE_TRUNC('week', NOW()) AND status != 'draft' THEN total ELSE 0 END), 0) AS week_invoiced,
      COALESCE(SUM(CASE WHEN paid_at >= DATE_TRUNC('week', NOW()) AND status = 'paid' THEN total ELSE 0 END), 0) AS week_received,

      -- This month
      COALESCE(SUM(CASE WHEN issue_date >= DATE_TRUNC('month', NOW()) AND status != 'draft' THEN total ELSE 0 END), 0) AS month_invoiced,
      COALESCE(SUM(CASE WHEN paid_at >= DATE_TRUNC('month', NOW()) AND status = 'paid' THEN total ELSE 0 END), 0) AS month_received,

      -- This quarter
      COALESCE(SUM(CASE WHEN issue_date >= DATE_TRUNC('quarter', NOW()) AND status != 'draft' THEN total ELSE 0 END), 0) AS quarter_invoiced,
      COALESCE(SUM(CASE WHEN paid_at >= DATE_TRUNC('quarter', NOW()) AND status = 'paid' THEN total ELSE 0 END), 0) AS quarter_received,

      -- This year
      COALESCE(SUM(CASE WHEN issue_date >= DATE_TRUNC('year', NOW()) AND status != 'draft' THEN total ELSE 0 END), 0) AS year_invoiced,
      COALESCE(SUM(CASE WHEN paid_at >= DATE_TRUNC('year', NOW()) AND status = 'paid' THEN total ELSE 0 END), 0) AS year_received
    FROM invoices
    WHERE tenant_id = ${tenantId}
      AND is_archived = false
  `);

  const row = result.rows[0] as Record<string, string>;

  function buildPeriod(prefix: string): PeriodRow {
    const invoiced = Number(row[`${prefix}_invoiced`]) || 0;
    const received = Number(row[`${prefix}_received`]) || 0;
    return { invoiced, received, due: invoiced - received };
  }

  return {
    today: buildPeriod('today'),
    thisWeek: buildPeriod('week'),
    thisMonth: buildPeriod('month'),
    thisQuarter: buildPeriod('quarter'),
    thisYear: buildPeriod('year'),
  };
}
