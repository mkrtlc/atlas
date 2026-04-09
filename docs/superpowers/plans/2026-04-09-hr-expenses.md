# HR Expenses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add expense management to the HR app — employees submit expenses, managers approve/refuse, admins process payments, with policy enforcement, optional report grouping, project linking, email notifications, and dashboard analytics.

**Architecture:** Expenses live inside the HR app as a new sidebar section. Server follows the existing HR pattern: services in `services/`, controllers in `controllers/`, routes added to `routes.ts`, barrel re-exports in `service.ts` and `controller.ts`. Client adds views under `components/expenses/`. The approval workflow mirrors the leave application pattern (auto-assign manager, dedicated action endpoints, pending queue with badge).

**Tech Stack:** React + TypeScript on client, Express + Drizzle ORM + PostgreSQL on server. Shared types in `@atlasmail/shared`. Email via `sendEmail` from `packages/server/src/services/email.service.ts`.

**Spec:** `docs/superpowers/specs/2026-04-09-hr-expenses-design.md`

---

## Phase 1: Schema & Types

### Task 1: Create expense schema tables

**Files:**
- Modify: `packages/server/src/db/schema.ts` (after `hr_lifecycle_events` at ~line 1326)
- Modify: `packages/server/src/db/migrate.ts` (after last HR CREATE TABLE at ~line 1494)

- [ ] **Step 1: Add hr_expense_categories table to schema.ts**

Add after the `hr_lifecycle_events` table, before the CRM section:

```typescript
// ─── HR: Expense Categories ───────────────────────────────────────
export const hrExpenseCategories = pgTable('hr_expense_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 50 }).notNull().default('receipt'),
  color: varchar('color', { length: 20 }).notNull().default('#6b7280'),
  maxAmount: real('max_amount'),
  receiptRequired: boolean('receipt_required').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_hr_expense_categories_tenant').on(table.tenantId),
}));
```

- [ ] **Step 2: Add hr_expense_policies table**

```typescript
// ─── HR: Expense Policies ─────────────────────────────────────────
export const hrExpensePolicies = pgTable('hr_expense_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  monthlyLimit: real('monthly_limit'),
  requireReceiptAbove: real('require_receipt_above'),
  autoApproveBelow: real('auto_approve_below'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_hr_expense_policies_tenant').on(table.tenantId),
}));
```

- [ ] **Step 3: Add hr_expense_policy_assignments table**

```typescript
export const hrExpensePolicyAssignments = pgTable('hr_expense_policy_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  policyId: uuid('policy_id').notNull().references(() => hrExpensePolicies.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'cascade' }),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  policyIdx: index('idx_hr_expense_policy_assignments_policy').on(table.policyId),
}));
```

- [ ] **Step 4: Add hr_expense_reports table**

```typescript
// ─── HR: Expense Reports ──────────────────────────────────────────
export const hrExpenseReports = pgTable('hr_expense_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').notNull(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  totalAmount: real('total_amount').notNull().default(0),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  refusedAt: timestamp('refused_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  approverId: uuid('approver_id'),
  approverComment: text('approver_comment'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_hr_expense_reports_tenant').on(table.tenantId),
  employeeIdx: index('idx_hr_expense_reports_employee').on(table.employeeId),
  statusIdx: index('idx_hr_expense_reports_status').on(table.status),
}));
```

- [ ] **Step 5: Add hr_expenses table**

```typescript
// ─── HR: Expenses ─────────────────────────────────────────────────
export const hrExpenses = pgTable('hr_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').notNull(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => hrExpenseCategories.id, { onDelete: 'set null' }),
  projectId: uuid('project_id').references(() => projectProjects.id, { onDelete: 'set null' }),
  reportId: uuid('report_id').references(() => hrExpenseReports.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  notes: text('notes'),
  amount: real('amount').notNull(),
  taxAmount: real('tax_amount').notNull().default(0),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  quantity: real('quantity').notNull().default(1),
  expenseDate: timestamp('expense_date', { withTimezone: true }).notNull(),
  merchantName: varchar('merchant_name', { length: 255 }),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull().default('personal_card'),
  receiptPath: text('receipt_path'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  refusedAt: timestamp('refused_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  approverId: uuid('approver_id'),
  approverComment: text('approver_comment'),
  policyViolation: text('policy_violation'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('idx_hr_expenses_tenant').on(table.tenantId),
  employeeIdx: index('idx_hr_expenses_employee').on(table.employeeId),
  categoryIdx: index('idx_hr_expenses_category').on(table.categoryId),
  statusIdx: index('idx_hr_expenses_status').on(table.status),
  reportIdx: index('idx_hr_expenses_report').on(table.reportId),
  projectIdx: index('idx_hr_expenses_project').on(table.projectId),
  dateIdx: index('idx_hr_expenses_date').on(table.expenseDate),
}));
```

- [ ] **Step 6: Add CREATE TABLE statements to migrate.ts**

Add after the last HR CREATE TABLE (~line 1494). Add `CREATE TABLE IF NOT EXISTS` for all 5 tables: `hr_expense_categories`, `hr_expense_policies`, `hr_expense_policy_assignments`, `hr_expense_reports`, `hr_expenses`. Include all columns and constraints. Add index creation statements to the existing index array.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/db/schema.ts packages/server/src/db/migrate.ts
git commit -m "$(cat <<'EOF'
feat: add HR expense schema tables

Add hr_expense_categories, hr_expense_policies,
hr_expense_policy_assignments, hr_expense_reports, and hr_expenses
tables with indexes and migrations.
EOF
)"
```

---

### Task 2: Create shared types for expenses

**Files:**
- Modify: `packages/shared/src/types/hr.ts`

- [ ] **Step 1: Add expense types to hr.ts**

Add at the end of the file:

```typescript
// ─── Expenses ─────────────────────────────────────────────────────

export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'refused' | 'paid';
export type PaymentMethod = 'personal_card' | 'company_card' | 'cash';

export interface HrExpenseCategory {
  id: string;
  tenantId: string;
  name: string;
  icon: string;
  color: string;
  maxAmount?: number | null;
  receiptRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface HrExpensePolicy {
  id: string;
  tenantId: string;
  name: string;
  monthlyLimit?: number | null;
  requireReceiptAbove?: number | null;
  autoApproveBelow?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HrExpensePolicyAssignment {
  id: string;
  tenantId: string;
  policyId: string;
  employeeId?: string | null;
  departmentId?: string | null;
  createdAt: string;
  // Joined
  employeeName?: string;
  departmentName?: string;
}

export interface HrExpenseReport {
  id: string;
  tenantId: string;
  userId: string;
  employeeId: string;
  title: string;
  status: ExpenseStatus;
  totalAmount: number;
  currency: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  refusedAt?: string | null;
  paidAt?: string | null;
  approverId?: string | null;
  approverComment?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined
  employeeName?: string;
  expenseCount?: number;
}

export interface HrExpense {
  id: string;
  tenantId: string;
  userId: string;
  employeeId: string;
  categoryId?: string | null;
  projectId?: string | null;
  reportId?: string | null;
  description: string;
  notes?: string | null;
  amount: number;
  taxAmount: number;
  currency: string;
  quantity: number;
  expenseDate: string;
  merchantName?: string | null;
  paymentMethod: PaymentMethod;
  receiptPath?: string | null;
  status: ExpenseStatus;
  submittedAt?: string | null;
  approvedAt?: string | null;
  refusedAt?: string | null;
  paidAt?: string | null;
  approverId?: string | null;
  approverComment?: string | null;
  policyViolation?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  projectName?: string;
  employeeName?: string;
  employeeAvatar?: string;
  reportTitle?: string;
}

export interface CreateExpenseInput {
  categoryId?: string;
  projectId?: string;
  reportId?: string;
  description: string;
  notes?: string;
  amount: number;
  taxAmount?: number;
  currency?: string;
  quantity?: number;
  expenseDate: string;
  merchantName?: string;
  paymentMethod?: PaymentMethod;
  receiptPath?: string;
}

export interface UpdateExpenseInput {
  categoryId?: string | null;
  projectId?: string | null;
  reportId?: string | null;
  description?: string;
  notes?: string | null;
  amount?: number;
  taxAmount?: number;
  currency?: string;
  quantity?: number;
  expenseDate?: string;
  merchantName?: string | null;
  paymentMethod?: PaymentMethod;
  receiptPath?: string | null;
}

export interface CreateExpenseReportInput {
  title: string;
  currency?: string;
}

export interface CreateExpenseCategoryInput {
  name: string;
  icon?: string;
  color?: string;
  maxAmount?: number | null;
  receiptRequired?: boolean;
}

export interface CreateExpensePolicyInput {
  name: string;
  monthlyLimit?: number | null;
  requireReceiptAbove?: number | null;
  autoApproveBelow?: number | null;
}

export function getExpenseStatusVariant(status: ExpenseStatus): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'draft': return 'default';
    case 'submitted': return 'primary';
    case 'approved': return 'success';
    case 'refused': return 'error';
    case 'paid': return 'success';
    default: return 'default';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/types/hr.ts
git commit -m "feat: add shared types for HR expenses"
```

---

### Task 3: Add query keys for expenses

**Files:**
- Modify: `packages/client/src/config/query-keys.ts`

- [ ] **Step 1: Add expense query keys**

Inside the existing `hr` namespace, add:

```typescript
expenses: {
  all: ['hr', 'expenses'] as const,
  list: (filters?: Record<string, unknown>) => ['hr', 'expenses', 'list', filters] as const,
  my: ['hr', 'expenses', 'my'] as const,
  detail: (id: string) => ['hr', 'expenses', id] as const,
  pending: ['hr', 'expenses', 'pending'] as const,
  pendingCount: ['hr', 'expenses', 'pending-count'] as const,
  dashboard: ['hr', 'expenses', 'dashboard'] as const,
},
expenseReports: {
  all: ['hr', 'expense-reports'] as const,
  list: (filters?: Record<string, unknown>) => ['hr', 'expense-reports', 'list', filters] as const,
  my: ['hr', 'expense-reports', 'my'] as const,
  detail: (id: string) => ['hr', 'expense-reports', id] as const,
},
expenseCategories: {
  all: ['hr', 'expense-categories'] as const,
  list: ['hr', 'expense-categories', 'list'] as const,
},
expensePolicies: {
  all: ['hr', 'expense-policies'] as const,
  list: ['hr', 'expense-policies', 'list'] as const,
  detail: (id: string) => ['hr', 'expense-policies', id] as const,
},
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/config/query-keys.ts
git commit -m "feat: add query keys for HR expenses"
```

---

## Phase 2: Server — Expense Categories & Policies

### Task 4: Create expense category service and controller

**Files:**
- Create: `packages/server/src/apps/hr/services/expense-category.service.ts`
- Create: `packages/server/src/apps/hr/controllers/expense-category.controller.ts`

- [ ] **Step 1: Create expense-category.service.ts**

Follow the pattern in `leave-config.service.ts` (read it first for the CRUD pattern). Functions:

- `listExpenseCategories(tenantId)` — select from `hrExpenseCategories` where `tenantId`, order by `sortOrder`
- `createExpenseCategory(tenantId, input)` — insert into `hrExpenseCategories`
- `updateExpenseCategory(tenantId, id, input)` — partial update
- `deleteExpenseCategory(tenantId, id)` — hard delete (or soft delete via `isActive = false`)
- `reorderExpenseCategories(tenantId, items: { id: string; sortOrder: number }[])` — bulk update sort orders
- `seedExpenseCategories(tenantId)` — insert 10 default categories if none exist: Travel (#3b82f6, plane), Accommodation (#8b5cf6, bed), Meals (#f97316, utensils), Transportation (#10b981, car), Office Supplies (#6366f1, package), Software (#0ea5e9, monitor), Client Entertainment (#ec4899, wine), Training (#f59e0b, graduation-cap), Phone/Internet (#6b7280, phone), Miscellaneous (#9ca3af, receipt)

- [ ] **Step 2: Create expense-category.controller.ts**

Follow the pattern in `leave-config.controller.ts`. Functions: `listExpenseCategories`, `createExpenseCategory`, `updateExpenseCategory`, `deleteExpenseCategory`, `reorderExpenseCategories`, `seedExpenseCategories`. Each extracts `tenantId` from `req.auth!`, calls service, returns JSON.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/apps/hr/services/expense-category.service.ts packages/server/src/apps/hr/controllers/expense-category.controller.ts
git commit -m "feat: add expense category service and controller"
```

---

### Task 5: Create expense policy service and controller

**Files:**
- Create: `packages/server/src/apps/hr/services/expense-policy.service.ts`
- Create: `packages/server/src/apps/hr/controllers/expense-policy.controller.ts`

- [ ] **Step 1: Create expense-policy.service.ts**

Functions:
- `listExpensePolicies(tenantId)` — select from `hrExpensePolicies` where `tenantId` and `isActive`
- `getExpensePolicy(tenantId, id)` — get policy + LEFT JOIN its assignments (with employee name / department name)
- `createExpensePolicy(tenantId, input)` — insert
- `updateExpensePolicy(tenantId, id, input)` — partial update
- `deleteExpensePolicy(tenantId, id)` — delete (cascade removes assignments)
- `assignPolicy(tenantId, policyId, { employeeId?, departmentId? })` — insert into `hrExpensePolicyAssignments`
- `removeAssignment(tenantId, assignmentId)` — delete from `hrExpensePolicyAssignments`
- `getEmployeePolicy(tenantId, employeeId, departmentId?)` — find applicable policy: first check employee-level assignment, then department-level. Return the policy or null.

- [ ] **Step 2: Create expense-policy.controller.ts**

Functions: `listExpensePolicies`, `getExpensePolicy`, `createExpensePolicy`, `updateExpensePolicy`, `deleteExpensePolicy`, `assignPolicy`, `removeAssignment`.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/apps/hr/services/expense-policy.service.ts packages/server/src/apps/hr/controllers/expense-policy.controller.ts
git commit -m "feat: add expense policy service and controller"
```

---

## Phase 3: Server — Core Expense CRUD & Lifecycle

### Task 6: Create expense service

**Files:**
- Create: `packages/server/src/apps/hr/services/expense.service.ts`

- [ ] **Step 1: Create the service**

This is the core service. Follow the `leave.service.ts` pattern for the lifecycle actions. Functions:

- `listExpenses(tenantId, filters?)` — select from `hrExpenses` with LEFT JOINs on `hrExpenseCategories` (name, icon, color), `projectProjects` (name), `employees` (name, avatar_url). Filters: status, employeeId, categoryId, projectId, reportId, dateRange (startDate/endDate), search (ILIKE on description). Order by `expenseDate` desc.

- `listMyExpenses(tenantId, userId)` — same as listExpenses but filtered by `userId`

- `getExpense(tenantId, id)` — single expense with all joins

- `createExpense(userId, tenantId, employeeId, input: CreateExpenseInput)` — insert with status `'draft'`

- `updateExpense(tenantId, id, input: UpdateExpenseInput)` — update only if status is `'draft'` or `'refused'`. Return null if not in editable state.

- `deleteExpense(tenantId, id)` — soft delete (isArchived = true), only if status is `'draft'`

- `submitExpense(tenantId, id, employeeId)` — the key lifecycle action:
  1. Fetch expense — must be in `'draft'` status
  2. Fetch employee to get `managerId`
  3. Run policy enforcement (call `getEmployeePolicy` from expense-policy.service):
     a. Check `requireReceiptAbove` — if amount > threshold and no receiptPath, throw Error
     b. Check `maxAmount` on category — if exceeded, set `policyViolation` text
     c. Check `monthlyLimit` — sum all non-draft expenses for employee this month, if exceeded set `policyViolation`
     d. Check `autoApproveBelow` — if amount < threshold, set status to `'approved'` directly
  4. If not auto-approved: set status to `'submitted'`, `approverId` to `managerId`, `submittedAt` to now
  5. Send email notification to approver (import `sendEmail` from `../../../services/email.service`)

- `recallExpense(tenantId, id, userId)` — set status back to `'draft'` if currently `'submitted'` and owned by userId. Clear `approverId`, `submittedAt`.

- `approveExpense(tenantId, id, approverId)` — set status to `'approved'`, `approvedAt` to now. Send email to employee.

- `refuseExpense(tenantId, id, approverId, comment)` — set status to `'refused'`, `refusedAt` to now, `approverComment` to comment. Reset status to `'draft'` so employee can edit and resubmit. Send email to employee.

  Wait — the spec says "refused" returns to draft. But if we set status to `'draft'`, the refusal history is lost. Better approach: set status to `'refused'`, store the comment. When the employee edits and resubmits, the submit action changes status from `'refused'` to `'submitted'`. So `updateExpense` should allow editing when status is `'refused'`, and `submitExpense` should allow submitting from `'refused'` status.

  Updated: `submitExpense` accepts status `'draft'` OR `'refused'`. `updateExpense` accepts status `'draft'` OR `'refused'`.

- `bulkPayExpenses(tenantId, expenseIds: string[])` — update all expenses with given IDs to status `'paid'`, `paidAt` to now. Only update those currently in `'approved'` status. Send email to each employee.

- `getPendingExpenses(tenantId, approverId)` — select expenses where `approverId` matches and status is `'submitted'`. Include all joins.

- `getPendingExpenseCount(tenantId, approverId)` — count of pending.

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/apps/hr/services/expense.service.ts
git commit -m "feat: add expense service with full lifecycle and policy enforcement"
```

---

### Task 7: Create expense controller

**Files:**
- Create: `packages/server/src/apps/hr/controllers/expense.controller.ts`

- [ ] **Step 1: Create the controller**

Follow the `leave-application.controller.ts` pattern. Each handler extracts `tenantId`, `userId` from `req.auth!`, calls the service.

Functions: `listExpenses`, `listMyExpenses`, `getExpense`, `createExpense`, `updateExpense`, `deleteExpense`, `submitExpense`, `recallExpense`, `approveExpense`, `refuseExpense`, `bulkPayExpenses`, `getPendingExpenses`, `getPendingExpenseCount`.

For `createExpense`: need to find the employee record for the current user. Query `employees` where `userId` matches and `tenantId` matches to get `employeeId`.

For `refuseExpense`: extract `comment` from `req.body`.

For `bulkPayExpenses`: extract `expenseIds: string[]` from `req.body`.

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/apps/hr/controllers/expense.controller.ts
git commit -m "feat: add expense controller"
```

---

### Task 8: Create expense report service and controller

**Files:**
- Create: `packages/server/src/apps/hr/services/expense-report.service.ts`
- Create: `packages/server/src/apps/hr/controllers/expense-report.controller.ts`

- [ ] **Step 1: Create expense-report.service.ts**

Functions:
- `listExpenseReports(tenantId, filters?)` — select with employee name join, expense count subquery
- `listMyExpenseReports(tenantId, userId)` — filtered by userId
- `getExpenseReport(tenantId, id)` — report + all its expenses (join `hrExpenses` where `reportId`)
- `createExpenseReport(userId, tenantId, employeeId, input: CreateExpenseReportInput)` — insert with status `'draft'`
- `updateExpenseReport(tenantId, id, input)` — update title, draft only
- `deleteExpenseReport(tenantId, id)` — soft delete, draft only. Also unlink expenses (set `reportId = null`)
- `submitExpenseReport(tenantId, id, employeeId)` — in a transaction:
  1. Fetch all expenses in this report with status `'draft'` or `'refused'`
  2. Run policy enforcement on each
  3. Compute totalAmount = sum of all expense amounts
  4. Set report status to `'submitted'`, all expenses to `'submitted'`
  5. Auto-assign approverId from employee's managerId
  6. Send email to approver
- `approveExpenseReport(tenantId, id, approverId)` — set report + all its expenses to `'approved'`
- `refuseExpenseReport(tenantId, id, approverId, comment)` — set report + all its expenses to `'refused'`

- [ ] **Step 2: Create expense-report.controller.ts**

Functions: `listExpenseReports`, `listMyExpenseReports`, `getExpenseReport`, `createExpenseReport`, `updateExpenseReport`, `deleteExpenseReport`, `submitExpenseReport`, `approveExpenseReport`, `refuseExpenseReport`.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/apps/hr/services/expense-report.service.ts packages/server/src/apps/hr/controllers/expense-report.controller.ts
git commit -m "feat: add expense report service and controller"
```

---

### Task 9: Create expense dashboard service and controller

**Files:**
- Create: `packages/server/src/apps/hr/services/expense-dashboard.service.ts`
- Create: `packages/server/src/apps/hr/controllers/expense-dashboard.controller.ts`

- [ ] **Step 1: Create expense-dashboard.service.ts**

Single function `getExpenseDashboard(tenantId)` that returns:

```typescript
{
  summary: {
    totalThisMonth: number;
    totalLastMonth: number;
    pendingCount: number;
    unpaidAmount: number;
    reimbursedThisMonth: number;
  };
  spendByCategory: Array<{ categoryName: string; color: string; total: number }>;
  monthlyTrend: Array<{ month: string; total: number }>;  // last 6 months
  topSpenders: Array<{ employeeName: string; avatarUrl: string | null; total: number }>;  // top 5
  policyViolations: { count: number; reasons: Array<{ violation: string; count: number }> };
  pendingPayments: Array<{ id: string; employeeName: string; amount: number; expenseDate: string }>;
}
```

Use raw SQL queries with `sql` template tag for aggregations. Group by category, group by month (DATE_TRUNC), etc.

- [ ] **Step 2: Create expense-dashboard.controller.ts**

Single function `getExpenseDashboard` that calls the service.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/apps/hr/services/expense-dashboard.service.ts packages/server/src/apps/hr/controllers/expense-dashboard.controller.ts
git commit -m "feat: add expense dashboard service and controller"
```

---

### Task 10: Add routes, update barrels, update manifest

**Files:**
- Modify: `packages/server/src/apps/hr/routes.ts`
- Modify: `packages/server/src/apps/hr/controller.ts`
- Modify: `packages/server/src/apps/hr/service.ts`
- Modify: `packages/server/src/apps/hr/manifest.ts`

- [ ] **Step 1: Add barrel re-exports**

In `controller.ts`, add:
```typescript
export * from './controllers/expense.controller';
export * from './controllers/expense-category.controller';
export * from './controllers/expense-policy.controller';
export * from './controllers/expense-report.controller';
export * from './controllers/expense-dashboard.controller';
```

In `service.ts`, add:
```typescript
export * as expenseCategoryService from './services/expense-category.service';
export * as expensePolicyService from './services/expense-policy.service';
export * as expenseService from './services/expense.service';
export * as expenseReportService from './services/expense-report.service';
export * as expenseDashboardService from './services/expense-dashboard.service';
```

- [ ] **Step 2: Add routes**

Add all expense routes to `routes.ts` after the existing routes. Read the file to find the right insertion point (before the employee root routes `GET /`, `POST /`).

```typescript
// ─── Expense Categories ─────────────────────────────────────────
router.get('/expense-categories/list', hrController.listExpenseCategories);
router.post('/expense-categories', hrController.createExpenseCategory);
router.post('/expense-categories/seed', hrController.seedExpenseCategories);
router.post('/expense-categories/reorder', hrController.reorderExpenseCategories);
router.patch('/expense-categories/:id', hrController.updateExpenseCategory);
router.delete('/expense-categories/:id', hrController.deleteExpenseCategory);

// ─── Expense Policies ───────────────────────────────────────────
router.get('/expense-policies/list', hrController.listExpensePolicies);
router.post('/expense-policies', hrController.createExpensePolicy);
router.get('/expense-policies/:id', hrController.getExpensePolicy);
router.patch('/expense-policies/:id', hrController.updateExpensePolicy);
router.delete('/expense-policies/:id', hrController.deleteExpensePolicy);
router.post('/expense-policies/:id/assign', hrController.assignPolicy);
router.delete('/expense-policies/:id/assign/:assignmentId', hrController.removeAssignment);

// ─── Expenses ───────────────────────────────────────────────────
router.get('/expenses/list', hrController.listExpenses);
router.get('/expenses/my', hrController.listMyExpenses);
router.get('/expenses/pending', hrController.getPendingExpenses);
router.get('/expenses/pending/count', hrController.getPendingExpenseCount);
router.get('/expenses/dashboard', hrController.getExpenseDashboard);
router.post('/expenses', hrController.createExpense);
router.post('/expenses/bulk-pay', hrController.bulkPayExpenses);
router.get('/expenses/:id', hrController.getExpense);
router.patch('/expenses/:id', hrController.updateExpense);
router.delete('/expenses/:id', hrController.deleteExpense);
router.post('/expenses/:id/submit', hrController.submitExpense);
router.post('/expenses/:id/recall', hrController.recallExpense);
router.post('/expenses/:id/approve', hrController.approveExpense);
router.post('/expenses/:id/refuse', hrController.refuseExpense);

// ─── Expense Reports ────────────────────────────────────────────
router.get('/expense-reports/list', hrController.listExpenseReports);
router.get('/expense-reports/my', hrController.listMyExpenseReports);
router.post('/expense-reports', hrController.createExpenseReport);
router.get('/expense-reports/:id', hrController.getExpenseReport);
router.patch('/expense-reports/:id', hrController.updateExpenseReport);
router.delete('/expense-reports/:id', hrController.deleteExpenseReport);
router.post('/expense-reports/:id/submit', hrController.submitExpenseReport);
router.post('/expense-reports/:id/approve', hrController.approveExpenseReport);
router.post('/expense-reports/:id/refuse', hrController.refuseExpenseReport);
```

- [ ] **Step 3: Update manifest**

Add the 5 new tables to the `tables` array and add `objects` entries for `hr_expenses` and `hr_expense_categories`.

- [ ] **Step 4: Verify server compiles**

Run: `cd /Users/gorkemcetin/atlasmail/packages/server && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/apps/hr/
git commit -m "feat: add expense routes, update HR barrels and manifest"
```

---

## Phase 4: Client — Hooks & Translations

### Task 11: Add expense hooks

**Files:**
- Modify: `packages/client/src/apps/hr/hooks.ts`

- [ ] **Step 1: Add expense hooks**

Add at the end of the file, after existing hooks. Import types from `@atlasmail/shared`. Follow the existing hook patterns in the file.

Hooks to create:
- `useExpenseCategories()` — GET `/hr/expense-categories/list`
- `useCreateExpenseCategory()`, `useUpdateExpenseCategory()`, `useDeleteExpenseCategory()`
- `useSeedExpenseCategories()`, `useReorderExpenseCategories()`
- `useExpensePolicies()`, `useExpensePolicy(id)`, `useCreateExpensePolicy()`, `useUpdateExpensePolicy()`, `useDeleteExpensePolicy()`
- `useAssignExpensePolicy()`, `useRemoveExpensePolicyAssignment()`
- `useExpenses(filters?)`, `useMyExpenses()`, `useExpense(id)`
- `useCreateExpense()`, `useUpdateExpense()`, `useDeleteExpense()`
- `useSubmitExpense()`, `useRecallExpense()`, `useApproveExpense()`, `useRefuseExpense()`
- `useBulkPayExpenses()`
- `usePendingExpenses()`, `usePendingExpenseCount()`
- `useExpenseReports(filters?)`, `useMyExpenseReports()`, `useExpenseReport(id)`
- `useCreateExpenseReport()`, `useUpdateExpenseReport()`, `useDeleteExpenseReport()`
- `useSubmitExpenseReport()`, `useApproveExpenseReport()`, `useRefuseExpenseReport()`
- `useExpenseDashboard()`

All mutations should invalidate the appropriate query keys on success.

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/apps/hr/hooks.ts
git commit -m "feat: add HR expense hooks"
```

---

### Task 12: Add expense translations

**Files:**
- Modify all 5 locale files: `packages/client/src/i18n/locales/{en,tr,de,fr,it}.json`

- [ ] **Step 1: Add English translations**

Add `hr.expenses` section with all keys specified in the spec section 16: sidebar labels, form labels, payment methods, status labels, actions, empty states, dashboard labels, policy labels, report labels.

- [ ] **Step 2: Add translations for TR, DE, FR, IT**

Translate all keys.

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/i18n/locales/
git commit -m "feat: add HR expense translations for all 5 locales"
```

---

## Phase 5: Client — Views & Components

### Task 13: Create My Expenses view

**Files:**
- Create: `packages/client/src/apps/hr/components/expenses/my-expenses-view.tsx`

- [ ] **Step 1: Create the component**

DataTable with columns: date, category (icon + name), description, amount (formatted), project name, status badge. Client-side search. Status filter tabs (All, Draft, Submitted, Approved, Refused, Paid).

Uses `useMyExpenses()` hook. "New expense" button. On row click, open detail panel or select expense.

Follow the pattern in `my-leave-view.tsx` for structure.

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/apps/hr/components/expenses/my-expenses-view.tsx
git commit -m "feat: add My Expenses view"
```

---

### Task 14: Create Expense Form modal

**Files:**
- Create: `packages/client/src/apps/hr/components/expenses/expense-form-modal.tsx`

- [ ] **Step 1: Create the component**

Modal form with fields from the spec: category selector, date, description, merchant, amount, tax, quantity, currency, payment method, project selector, receipt upload, add-to-report toggle, notes.

Props:
```tsx
interface ExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  expense?: HrExpense | null; // For editing
}
```

Uses `useCreateExpense()` and `useUpdateExpense()` hooks. `useExpenseCategories()` for category dropdown. `useProjects()` from Projects hooks or a direct API call for project dropdown.

Receipt upload: use a file input, upload via `api.post('/upload', formData)` (global upload endpoint), store returned path.

Footer: Save (creates/updates as draft) and Submit (creates/updates then calls `useSubmitExpense()`).

Show inline policy warnings when amount exceeds category `maxAmount`.

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/apps/hr/components/expenses/expense-form-modal.tsx
git commit -m "feat: add expense form modal"
```

---

### Task 15: Create Expense Detail panel

**Files:**
- Create: `packages/client/src/apps/hr/components/expenses/expense-detail-panel.tsx`

- [ ] **Step 1: Create the component**

Shows expense detail with:
- StatusTimeline (happy path: Draft → Submitted → Approved → Paid)
- If status is `'refused'`: show red callout above timeline with approver comment
- Category, date, description, merchant, amount, tax, total
- Project link (if set)
- Receipt image/file viewer (if receiptPath exists)
- Policy violation warning (if set)
- Actions based on status:
  - Draft: Edit, Submit, Delete
  - Submitted: Recall
  - Approved: (no actions for employee)
  - Refused: Edit, Resubmit

Uses `StatusTimeline` from `../../../../components/shared/status-timeline`.

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/apps/hr/components/expenses/expense-detail-panel.tsx
git commit -m "feat: add expense detail panel"
```

---

### Task 16: Create Expense Approvals view

**Files:**
- Create: `packages/client/src/apps/hr/components/expenses/expense-approvals-view.tsx`

- [ ] **Step 1: Create the component**

Follow the `approvals-view.tsx` pattern exactly. Card list showing: employee avatar + name, category icon + name, description, amount, date, merchant, policy violation warning badge, receipt thumbnail.

Approve (green primary) / Refuse (red, expands inline comment textarea) buttons.

Uses `usePendingExpenses()`, `useApproveExpense()`, `useRefuseExpense()` hooks.

State: `refusingId: string | null` + `refuseComment: string`.

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/apps/hr/components/expenses/expense-approvals-view.tsx
git commit -m "feat: add expense approvals view"
```

---

### Task 17: Create All Expenses view (admin)

**Files:**
- Create: `packages/client/src/apps/hr/components/expenses/all-expenses-view.tsx`

- [ ] **Step 1: Create the component**

Org-wide DataTable: employee name, date, category, description, amount, project, status badge. Filters by status, employee, category, date range.

Bulk "Mark as paid" feature: checkbox column, bulk action button that calls `useBulkPayExpenses()` with selected IDs. Only enabled for expenses in `'approved'` status.

Uses `useExpenses(filters)` hook.

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/apps/hr/components/expenses/all-expenses-view.tsx
git commit -m "feat: add All Expenses admin view"
```

---

### Task 18: Create Expense Reports view

**Files:**
- Create: `packages/client/src/apps/hr/components/expenses/expense-reports-view.tsx`
- Create: `packages/client/src/apps/hr/components/expenses/expense-report-detail.tsx`

- [ ] **Step 1: Create expense-reports-view.tsx**

List of reports: title, status badge, total amount, expense count, date range. "Create report" button opens a simple modal (title input). Uses `useMyExpenseReports()` and `useCreateExpenseReport()`.

- [ ] **Step 2: Create expense-report-detail.tsx**

Report detail view: title, status, approver comment (if refused), list of grouped expenses as a compact table. Total at bottom. Submit button (if draft), status actions (if manager viewing).

Uses `useExpenseReport(id)`, `useSubmitExpenseReport()`.

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/apps/hr/components/expenses/expense-reports-view.tsx packages/client/src/apps/hr/components/expenses/expense-report-detail.tsx
git commit -m "feat: add expense reports view and detail"
```

---

### Task 19: Create Expense Categories view (admin)

**Files:**
- Create: `packages/client/src/apps/hr/components/expenses/expense-categories-view.tsx`

- [ ] **Step 1: Create the component**

CRUD list following the `leave-types-view.tsx` pattern. Shows: name, icon preview, color swatch, max amount, receipt required toggle, active toggle.

Add/edit via inline or modal. Seed button: "Add default categories" calls `useSeedExpenseCategories()`.

Uses `useExpenseCategories()`, `useCreateExpenseCategory()`, `useUpdateExpenseCategory()`, `useDeleteExpenseCategory()`, `useSeedExpenseCategories()`.

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/apps/hr/components/expenses/expense-categories-view.tsx
git commit -m "feat: add expense categories admin view"
```

---

### Task 20: Create Expense Policies view (admin)

**Files:**
- Create: `packages/client/src/apps/hr/components/expenses/expense-policies-view.tsx`

- [ ] **Step 1: Create the component**

CRUD list following `leave-policies-view.tsx` pattern. Shows: name, monthly limit, receipt threshold, auto-approve threshold, active toggle.

Policy detail: shows assignments (employees and departments). "Assign" button opens a picker (employee or department select). Uses `useExpensePolicy(id)`, `useAssignExpensePolicy()`, `useRemoveExpensePolicyAssignment()`.

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/apps/hr/components/expenses/expense-policies-view.tsx
git commit -m "feat: add expense policies admin view"
```

---

### Task 21: Create Expense Dashboard section

**Files:**
- Create: `packages/client/src/apps/hr/components/expenses/expense-dashboard-section.tsx`

- [ ] **Step 1: Create the component**

A section component that renders inside the existing HR dashboard. Uses `useExpenseDashboard()` hook.

Summary cards row: Total expenses, Pending approvals, Unpaid amount, Reimbursed this month.

Charts: Spend by category (horizontal bars), Monthly trend (simple bar chart using inline SVG or CSS-based bars — no charting library dependency unless one already exists in the project).

Lists: Top spenders (avatar + name + amount), Policy violations (count + reasons), Pending payments (compact list).

Read `dashboard-view.tsx` to understand how the existing HR dashboard is structured and add this section to it.

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/apps/hr/components/expenses/expense-dashboard-section.tsx
git commit -m "feat: add expense dashboard section"
```

---

## Phase 6: Client — Integration & Wiring

### Task 22: Wire expenses into HR sidebar and page

**Files:**
- Modify: `packages/client/src/apps/hr/page.tsx`
- Modify: HR sidebar component (find it by reading page.tsx — likely inline or a separate component)

- [ ] **Step 1: Extend NavSection type**

Add to the `NavSection` union in `page.tsx`:
```typescript
| 'my-expenses' | 'expense-approvals' | 'all-expenses' | 'expense-reports'
| 'expense-categories' | 'expense-policies' | 'expense-report-detail'
```

- [ ] **Step 2: Add to PORTAL_VIEWS**

Add `'my-expenses'` and `'expense-reports'` to the `PORTAL_VIEWS` set.

- [ ] **Step 3: Add sidebar items**

Find where sidebar sections are rendered (read page.tsx). Add a new "Expenses" `SidebarSection` after the "Leave" section:

- My expenses (Receipt icon, all users)
- Expense approvals (ClipboardCheck icon, visible when pending count > 0 or admin, badge with count)
- All expenses (LayoutList icon, admin only)
- Expense reports (FolderOpen icon, all users)
- Expense categories (Tag icon, admin only)
- Expense policies (Shield icon, admin only)

Use `usePendingExpenseCount()` for the badge. Use `hrPerm.role === 'admin'` for admin visibility.

- [ ] **Step 4: Add view rendering**

In the content/view switcher (where `activeView` determines which component renders), add cases for all 6 expense views:

```tsx
case 'my-expenses': return <MyExpensesView ... />;
case 'expense-approvals': return <ExpenseApprovalsView ... />;
case 'all-expenses': return <AllExpensesView ... />;
case 'expense-reports': return <ExpenseReportsView ... />;
case 'expense-categories': return <ExpenseCategoriesView ... />;
case 'expense-policies': return <ExpensePoliciesView ... />;
```

- [ ] **Step 5: Integrate dashboard section**

Read `dashboard-view.tsx` and add `<ExpenseDashboardSection />` as a new section within it.

- [ ] **Step 6: Verify client compiles**

Run: `cd /Users/gorkemcetin/atlasmail/packages/client && npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add packages/client/src/apps/hr/
git commit -m "$(cat <<'EOF'
feat: wire expenses into HR sidebar, page routing, and dashboard

- 6 new sidebar items in Expenses section
- NavSection type extended with expense views
- Portal views include my-expenses and expense-reports
- Expense dashboard section added to HR dashboard
EOF
)"
```

---

## Phase 7: Build Verification

### Task 23: Full build verification

- [ ] **Step 1: Build shared**

```bash
cd /Users/gorkemcetin/atlasmail/packages/shared && npm run build
```

- [ ] **Step 2: Build server**

```bash
cd /Users/gorkemcetin/atlasmail/packages/server && npm run build
```

- [ ] **Step 3: Build client**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build
```

- [ ] **Step 4: Fix any compilation errors**

If errors, fix and re-build.

- [ ] **Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve build errors from HR expenses feature"
```

---

## Summary of files

### New files (create)
- `packages/server/src/apps/hr/services/expense.service.ts`
- `packages/server/src/apps/hr/services/expense-category.service.ts`
- `packages/server/src/apps/hr/services/expense-policy.service.ts`
- `packages/server/src/apps/hr/services/expense-report.service.ts`
- `packages/server/src/apps/hr/services/expense-dashboard.service.ts`
- `packages/server/src/apps/hr/controllers/expense.controller.ts`
- `packages/server/src/apps/hr/controllers/expense-category.controller.ts`
- `packages/server/src/apps/hr/controllers/expense-policy.controller.ts`
- `packages/server/src/apps/hr/controllers/expense-report.controller.ts`
- `packages/server/src/apps/hr/controllers/expense-dashboard.controller.ts`
- `packages/client/src/apps/hr/components/expenses/my-expenses-view.tsx`
- `packages/client/src/apps/hr/components/expenses/expense-form-modal.tsx`
- `packages/client/src/apps/hr/components/expenses/expense-detail-panel.tsx`
- `packages/client/src/apps/hr/components/expenses/expense-approvals-view.tsx`
- `packages/client/src/apps/hr/components/expenses/all-expenses-view.tsx`
- `packages/client/src/apps/hr/components/expenses/expense-reports-view.tsx`
- `packages/client/src/apps/hr/components/expenses/expense-report-detail.tsx`
- `packages/client/src/apps/hr/components/expenses/expense-categories-view.tsx`
- `packages/client/src/apps/hr/components/expenses/expense-policies-view.tsx`
- `packages/client/src/apps/hr/components/expenses/expense-dashboard-section.tsx`

### Modified files
- `packages/server/src/db/schema.ts`
- `packages/server/src/db/migrate.ts`
- `packages/server/src/apps/hr/routes.ts`
- `packages/server/src/apps/hr/controller.ts`
- `packages/server/src/apps/hr/service.ts`
- `packages/server/src/apps/hr/manifest.ts`
- `packages/shared/src/types/hr.ts`
- `packages/client/src/config/query-keys.ts`
- `packages/client/src/apps/hr/hooks.ts`
- `packages/client/src/apps/hr/page.tsx`
- `packages/client/src/apps/hr/components/views/dashboard-view.tsx`
- `packages/client/src/i18n/locales/{en,tr,de,fr,it}.json`
