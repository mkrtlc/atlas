import { db } from '../../../config/database';
import { sql } from 'drizzle-orm';

// Helper to extract rows array from db.execute result
function rows(result: any): any[] {
  return result.rows ?? result ?? [];
}

// ─── Expense Dashboard ──────────────────────────────────────────────

export async function getExpenseDashboard(tenantId: string) {
  // ── Summary: totalThisMonth ───────────────────────────────────────
  const totalThisMonthResult = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM hr_expenses
    WHERE tenant_id = ${tenantId}
      AND status NOT IN ('draft')
      AND is_archived = false
      AND DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', NOW())
  `);
  const totalThisMonthRow = rows(totalThisMonthResult)[0];

  // ── Summary: totalLastMonth ───────────────────────────────────────
  const totalLastMonthResult = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM hr_expenses
    WHERE tenant_id = ${tenantId}
      AND status NOT IN ('draft')
      AND is_archived = false
      AND DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
  `);
  const totalLastMonthRow = rows(totalLastMonthResult)[0];

  // ── Summary: pendingCount ─────────────────────────────────────────
  const pendingCountResult = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM hr_expenses
    WHERE tenant_id = ${tenantId}
      AND status = 'submitted'
      AND is_archived = false
  `);
  const pendingCountRow = rows(pendingCountResult)[0];

  // ── Summary: unpaidAmount (approved but not yet paid) ─────────────
  const unpaidAmountResult = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM hr_expenses
    WHERE tenant_id = ${tenantId}
      AND status = 'approved'
      AND is_archived = false
  `);
  const unpaidAmountRow = rows(unpaidAmountResult)[0];

  // ── Summary: reimbursedThisMonth ──────────────────────────────────
  const reimbursedResult = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM hr_expenses
    WHERE tenant_id = ${tenantId}
      AND status = 'paid'
      AND is_archived = false
      AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())
  `);
  const reimbursedRow = rows(reimbursedResult)[0];

  // ── Spend by category ────────────────────────────────────────────
  const spendByCategoryResult = await db.execute(sql`
    SELECT
      c.name AS "categoryName",
      c.color,
      COALESCE(SUM(e.amount), 0) AS total
    FROM hr_expenses e
    JOIN hr_expense_categories c ON c.id = e.category_id
    WHERE e.tenant_id = ${tenantId}
      AND e.status NOT IN ('draft', 'refused')
      AND e.is_archived = false
    GROUP BY c.id, c.name, c.color
    ORDER BY total DESC
    LIMIT 5
  `);

  // ── Monthly trend (last 6 months) ────────────────────────────────
  const monthlyTrendResult = await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', expense_date), 'YYYY-MM') AS month,
      COALESCE(SUM(amount), 0) AS total
    FROM hr_expenses
    WHERE tenant_id = ${tenantId}
      AND status NOT IN ('draft', 'refused')
      AND is_archived = false
      AND expense_date >= DATE_TRUNC('month', NOW() - INTERVAL '5 months')
    GROUP BY DATE_TRUNC('month', expense_date)
    ORDER BY month ASC
  `);

  // ── Top spenders (this month) ─────────────────────────────────────
  const topSpendersResult = await db.execute(sql`
    SELECT
      emp.name AS "employeeName",
      emp.avatar_url AS "avatarUrl",
      COALESCE(SUM(e.amount), 0) AS total
    FROM hr_expenses e
    JOIN employees emp ON emp.id = e.employee_id
    WHERE e.tenant_id = ${tenantId}
      AND e.status NOT IN ('draft', 'refused')
      AND e.is_archived = false
      AND DATE_TRUNC('month', e.expense_date) = DATE_TRUNC('month', NOW())
    GROUP BY emp.id, emp.name, emp.avatar_url
    ORDER BY total DESC
    LIMIT 5
  `);

  // ── Policy violations ─────────────────────────────────────────────
  const violationResult = await db.execute(sql`
    SELECT
      policy_violation AS violation,
      COUNT(*)::int AS count
    FROM hr_expenses
    WHERE tenant_id = ${tenantId}
      AND policy_violation IS NOT NULL
      AND is_archived = false
    GROUP BY policy_violation
    ORDER BY count DESC
    LIMIT 5
  `);

  const violationRowsArr = rows(violationResult);
  const violationCount = violationRowsArr.reduce(
    (sum: number, r: any) => sum + Number(r.count),
    0,
  );

  // ── Pending payments (approved, awaiting reimbursement) ───────────
  const pendingPaymentsResult = await db.execute(sql`
    SELECT
      e.id,
      emp.name AS "employeeName",
      e.amount,
      TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS "expenseDate"
    FROM hr_expenses e
    JOIN employees emp ON emp.id = e.employee_id
    WHERE e.tenant_id = ${tenantId}
      AND e.status = 'approved'
      AND e.is_archived = false
    ORDER BY e.expense_date ASC
    LIMIT 10
  `);

  return {
    summary: {
      totalThisMonth: Number(totalThisMonthRow?.total ?? 0),
      totalLastMonth: Number(totalLastMonthRow?.total ?? 0),
      pendingCount: Number(pendingCountRow?.count ?? 0),
      unpaidAmount: Number(unpaidAmountRow?.total ?? 0),
      reimbursedThisMonth: Number(reimbursedRow?.total ?? 0),
    },
    spendByCategory: rows(spendByCategoryResult).map((r: any) => ({
      categoryName: r.categoryName,
      color: r.color,
      total: Number(r.total),
    })),
    monthlyTrend: rows(monthlyTrendResult).map((r: any) => ({
      month: r.month,
      total: Number(r.total),
    })),
    topSpenders: rows(topSpendersResult).map((r: any) => ({
      employeeName: r.employeeName,
      avatarUrl: r.avatarUrl ?? null,
      total: Number(r.total),
    })),
    policyViolations: {
      count: violationCount,
      reasons: violationRowsArr.map((r: any) => ({
        violation: r.violation,
        count: Number(r.count),
      })),
    },
    pendingPayments: rows(pendingPaymentsResult).map((r: any) => ({
      id: r.id,
      employeeName: r.employeeName,
      amount: Number(r.amount),
      expenseDate: r.expenseDate,
    })),
  };
}
