# Atlas Best Practices (Audit-Derived)

Rules that have been **confirmed across 2+ modules** during the audit process. These are candidates for promotion to `CLAUDE.md`.

A rule lives here when:
- It was surfaced as a pattern in `platform-findings.md`.
- The same finding was confirmed in at least 2 modules.
- A concrete check (grep pattern / code review rule) exists.

---

## Rules

### Query hooks must surface `isError` with a retry fallback

**Why**: Components that destructure `isLoading` but not `isError` render silently empty on a failed GET — the user sees a blank screen with no retry. Confirmed in HRM (15 views), Sign (3 views), and Invoices (6 views) — same bug shape each time.

**How to check**: Grep list/dashboard components for `const { data, isLoading } = useX()` or `const { data = [], isLoading }` without a neighbouring `isError` destructure. The shared fallback component is `packages/client/src/components/ui/query-error-state.tsx`.

**How to apply**:
```tsx
const { data, isLoading, isError, refetch } = useSomeQuery();

if (isError) return <QueryErrorState onRetry={() => refetch()} />;
if (isLoading || !data) return <Skeleton ... />;
```

Mutations are covered by the central `defaultMutationErrorHandler` in `packages/client/src/providers/query-provider.tsx` and do not need per-call `onError`. This rule is for **queries only**.

**Confirmed in**: HRM, Sign, Invoices, Work.
**Promoted to CLAUDE.md**: no (pending CRM retro-scan).

---

### Cross-app service reads must scope by tenantId

**Why**: Defense-in-depth. A service in one app (e.g. Work dashboard) that reads a table owned by another app (e.g. `crmCompanies`, `crmContacts`, `invoices`, `users`) by id alone can cross-read from another tenant's data if the caller supplies a tampered id. Happy-path works because the caller's own row references their own tenant's ids — but the scoping invariant must hold at every read. Confirmed in Invoices (`pdf.service.ts`) and Work (`dashboard.service.ts`, `task.service.ts`).

**How to check**: Grep `db\.select\(` / `\.leftJoin\(` / `\.innerJoin\(` inside `apps/{foo}/services/*.ts`. For every read of a table NOT owned by the app, require an `eq(table.tenantId, tenantId)` in the WHERE or join predicate. Special case: user lookups — if the code is about to treat a `userId` as "trusted caller input," verify the user is in `tenantMembers` for the current tenant first.

**How to apply**:
```ts
// ❌ cross-tenant leak
db.select().from(crmCompanies).where(eq(crmCompanies.id, invoice.companyId))

// ✓ scoped
db.select().from(crmCompanies)
  .where(and(eq(crmCompanies.id, invoice.companyId), eq(crmCompanies.tenantId, tenantId)))

// ❌ user assignable to a task from any tenant
db.select({ id: users.id }).from(users).where(eq(users.id, assigneeId))

// ✓ verify assignee is a tenant member
const [member] = await db.select({ userId: tenantMembers.userId }).from(tenantMembers)
  .where(and(eq(tenantMembers.userId, assigneeId), eq(tenantMembers.tenantId, tenantId)))
  .limit(1);
if (!member) throw new Error('Assignee is not a member of this tenant');
```

**Confirmed in**: Invoices, Work.
**Promoted to CLAUDE.md**: no (third confirmation will trigger promotion).

---

## Template

```
### {Rule title}

**Why**: {the observed bug this prevents — cite module findings}
**How to check**: {grep pattern / code review step}
**How to apply**: {the correct pattern, with a code snippet}
**Confirmed in**: {module list}
**Promoted to CLAUDE.md**: {date or "no"}
```
