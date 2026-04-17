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

**Confirmed in**: HRM, Sign, Invoices.
**Promoted to CLAUDE.md**: no (pending CRM retro-scan).

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
