# Work (Projects + Tasks) Audit Report

**SIGNED OFF: 2026-04-17**

**Module ID**: `work`
**Audit started**: 2026-04-16
**Audit completed**: 2026-04-17
**Sign-off**: 2026-04-17
**Pilot / Full**: _Full_ (12 dimensions)

---

## Pre-flight spot-check

- [x] Shared UI components used (no raw `<button>`, `<input>`, `<select>`, `<textarea>` in `apps/work/`)
- [x] Sizes — data views use `sm`, modals use `md`
- [x] CSS variables — hex colors present in status/chart tokens only; no styling hardcodes in markup
- [x] No `localStorage` usage inside `apps/work/`
- [x] Registered in both `client/apps/index.ts` and `server/apps/index.ts` (single `work` app covers both Projects + Tasks per manifest)
- [x] Query keys namespaced under `queryKeys.work.tasks.*` and `queryKeys.work.projects.*`
- [x] Global search UNION includes both `tasks` (`global-search.service.ts:110`) and `project_projects` (`global-search.service.ts:194`)

---

## Workflow map

### User actions
- Projects — CRUD + archive; add/remove member; set billing rate; add file; view financials + dashboard
- Tasks — CRUD; change status / when / priority / due / notes; subtasks; assignees; templates; activity log; comments; attachments; dependencies; visibility (private)
- Time — create/update/delete entry (flat or per-project); preview + populate invoice from time

### Files
- **Client**: `packages/client/src/apps/work/` — single unified app. 31 components + `hooks.ts`, `manifest.ts`, `page.tsx`, `settings-store.ts`, `lib/constants.ts`, `lib/helpers.ts`.
- **Server**: `packages/server/src/apps/work/` — `routes.ts` (28 endpoints), `controller.ts`, `controllers/{projects,tasks}.controller.ts`, `services/{project-crud,task,project,project-time,project-files,financial,dashboard,extras}.service.ts`, `reminder.ts`, `utils/{readable-tasks,reminder}.ts`.

### API endpoints
28 routes, all behind `authMiddleware` + `requireAppPermission('work')`. Concurrency wrap on PATCH `/tasks/:id` and PATCH `/projects/:id` only.

### DB tables
| Table | tenantId | `updatedAt` | `isArchived` | Concurrency wired |
|-------|----------|-------------|--------------|-------------------|
| `tasks` | yes | yes | yes | yes (PATCH `/tasks/:id`) |
| `project_projects` | yes | yes | yes | yes (PATCH `/projects/:id`) |
| `project_time_entries` | yes | yes | yes | **no** (PATCH `/time-entries/:id` and `/projects/:id/time-entries/:entryId`) |
| `project_members` | (via project) | yes | n/a | **no** (PATCH `/projects/:id/members/:memberId/rate`) |
| `subtasks` | no (child of tasks) | no | no | n/a |
| `task_comments` | yes | yes | no | n/a (no PATCH route) |
| `task_attachments` | yes | no | no | n/a |
| `task_dependencies` | join | no | no | n/a |
| `task_templates` | yes | no | no | n/a |

---

## Retro-scan against platform patterns

| Pattern | Result | Evidence |
|---------|--------|----------|
| **P-2** hard-delete of user content | **Clean** | `deleteProject` sets `isArchived=true` (`services/project-crud.service.ts:225`); `deleteTask` sets `isArchived=true` (`services/task.service.ts:279`). Subtasks, comments, attachments, dependencies, templates hard-delete — all child config / reconstructable. |
| **P-3** PATCH route missing concurrency | **3 hits** | `routes.ts:60` `/time-entries/:id`, `:80` `/projects/:id/members/:memberId/rate`, `:86` `/projects/:id/time-entries/:entryId`. All three tables have `updatedAt`. |
| **P-4** queries without `isError` fallback | **Confirmed — largest hit yet** | 9 components (`project-detail-page`, `project-members-tab`, `project-files-tab`, `project-time-tab`, `project-financials-tab`, `projects-list-view`, `projects-board-view`, `task-list-view`, `work-tasks-view`). Zero `isError`/`QueryErrorState` imports in `apps/work/`. |
| **P-5** cross-app reads missing tenantId | **1 hit + 1 variant** | `services/dashboard.service.ts:124` `leftJoin(crmCompanies, eq(invoices.companyId, crmCompanies.id))` — no tenantId filter on `crmCompanies` (same shape as I4-1). Task assignee lookup at `services/task.service.ts:219` reads `users` table by id only — a caller could assign a task to a user from a different tenant. |

---

## Findings

| ID | Dimension | Severity | File:line | Evidence | Proposed fix | Status |
|----|-----------|----------|-----------|----------|--------------|--------|
| W2-1 | 2. Empty/loading/error | fix-before-ship | 8 query-owning components (project-detail-page, projects-list-view, projects-board-view, project-files-tab, project-members-tab, project-time-tab, project-financials-tab, work-tasks-view) | Components destructured `isLoading` without `isError`. P-4 retro-fix. | Wired `isError` + `refetch` in each; rendered `<QueryErrorState onRetry={refetch}/>` early-return. `task-list-view` receives `isLoading` as a prop (not a query owner) — covered transitively via parent `work-tasks-view`. | fixed |
| W4-1 | 4. Auth & permission scoping | fix-before-ship | `services/dashboard.service.ts:124` | `leftJoin(crmCompanies, eq(invoices.companyId, crmCompanies.id))` lacked tenantId filter. | Added `and(eq(invoices.companyId, crmCompanies.id), eq(crmCompanies.tenantId, tenantId))` to leftJoin predicate. | fixed |
| W4-2 | 4. Auth & permission scoping | fix-before-ship | `services/task.service.ts:219` (now refactored) | Assignee user lookup read `users` by id only — no tenant-membership check. | Added local helper `assertAssigneeInTenant(userId, tenantId)` that checks `tenantMembers`. Called from both `createTask` (uses passed tenantId) and `updateTask` (uses `existing.tenantId` from the already-selected task row). | fixed |
| W5-1 | 5. Optimistic concurrency | fix-before-ship | `routes.ts:60` PATCH `/time-entries/:id` | `projectTimeEntries` has `updatedAt`; route unwrapped. | Wrapped with `withConcurrencyCheck(projectTimeEntries)`. Lenient-mode middleware — existing clients pass through unchanged until they start forwarding `If-Unmodified-Since`. | fixed |
| W5-2 | 5. Optimistic concurrency | fix-before-ship | `routes.ts:86` PATCH `/projects/:id/time-entries/:entryId` | Same table as W5-1. | Same fix. | fixed |
| W5-3 | 5. Optimistic concurrency | nice-to-have | `routes.ts:80` PATCH `/projects/:id/members/:memberId/rate` | `projectMembers` has `updatedAt`; route unwrapped. Billing rate is admin-edited — lower collision risk than time entries. | Add `withConcurrencyCheck(projectMembers)`; client forward `updatedAt`. | open |
| W3-1 | 3. Input & data correctness | nice-to-have | time-entry modals + `services/project-time.service.ts` | No client- or server-side guard that `durationMinutes > 0` or `workDate` is not far-future. Server will accept negative duration silently. | Add `if (durationMinutes <= 0) throw` in `createProjectTimeEntry`/`updateProjectTimeEntry`. | open |
| W6-1 | 6. i18n completeness | nice-to-have | `components/project-members-tab.tsx:95` | Hardcoded `"No members added yet"` in empty-state span. | Extract to `t('work.members.emptyState')` + add to all 5 locales. | open |
| W7-1 | 7. Cross-app linking | nice-to-have | `components/project-detail-page.tsx` | `SmartButtonBar` present on task detail (`task-detail-panel.tsx`) but missing on project detail. Projects naturally link to CRM company / invoices. | Add `<SmartButtonBar appId="work" recordId={projectId} />` to project header. | open |
| W12-1 | 12. Performance | nice-to-have (deferred) | `components/project-time-tab.tsx` | No virtualization on time-entries list. Fine today; will slow with 1000+ rows per project. | Add virtualization or server-side pagination when a tenant hits the threshold. | open |

### Rejected / verified-false findings

| Claim | Verdict | Why |
|-------|---------|-----|
| "Global search missing Work tasks/projects" (subagent W11-1) | **False positive** | `global-search.service.ts:110` includes `tasks`; `:194` includes `project_projects`. Subagent contradicted its own Phase A in Phase B. |
| "i18n only 28 keys per locale" | **Miscount** | Actual leaf counts are identical across EN/TR/DE/FR/IT: `work=80`, `tasks=229`, `projects=301`. Parity clean. |
| "Mutations missing onError" | **Covered by P-1** | `query-provider.tsx:49` `defaultMutationErrorHandler`. |

### Deferred / n/a

| Dimension | Reason |
|-----------|--------|
| 1. Golden-path workflow | Deferred to browser spot-check in later batch. |
| 8. Destructive action safety | Pass (code-read) — `ConfirmDialog` used in 5 components; no `window.confirm`. |
| 9. Keyboard & focus | Shared `<Modal>` (Radix Dialog) covers Esc + focus-trap; deferred to browser. |
| 10. Navigation & deep linking | Pass (code-read) — tab state `searchParams.get('tab')` drives detail view. |
| 11. Search & filters | Pass — global search UNION confirmed. |
| 12. Performance | Deferred per operating defaults; W12-1 flagged. |

---

## Verification (post-fix)

| Dimension | Result | Evidence / notes |
|-----------|--------|------------------|
| 1. Golden-path workflow | deferred | Browser spot-check |
| 2. Empty/loading/error states | pass (code-read) | W2-1 fixed — `QueryErrorState` wired across 8 views |
| 3. Input & data correctness | pass (with note) | W3-1 nice-to-have |
| 4. Auth & permission scoping | pass | W4-1 + W4-2 fixed (tenantId scope on CRM leftJoin; assignee tenant-membership check) |
| 5. Optimistic concurrency | pass (W5-3 deferred) | W5-1 + W5-2 wrapped with `withConcurrencyCheck(projectTimeEntries)` |
| 6. i18n completeness | pass | 80/229/301 leaf keys match across 5 locales; W6-1 single hardcoded string |
| 7. Cross-app linking | partial | W7-1 deferred |
| 8. Destructive action safety | pass | `ConfirmDialog` in 5 components; no `window.confirm` |
| 9. Keyboard & focus | deferred | Shared `<Modal>` covers; browser check deferred |
| 10. Navigation & deep linking | pass | `searchParams` drives state |
| 11. Search & filters | pass | Global search UNION confirmed |
| 12. Performance smoke test | deferred | Per operating defaults |

---

## Propagation (Phase G)

- **Local**: W3-1 (time-entry duration/date guard), W6-1 (one hardcoded empty-state string), W7-1 (SmartButtonBar on project detail), W12-1 (time-entry virtualization).
- **Pattern** (already in `platform-findings.md`):
  - **P-4** (query `isError` missing) — confirmed in HRM + Sign + Invoices + **Work**. Now 4 modules; already promoted to rule + added to `best-practices.md` in previous session.
  - **P-3** (concurrency gaps) — confirmed again in Work (3 hits; 2 fixed, 1 deferred). 5 modules total.
  - **P-5** (cross-app reads missing `tenantId`) — promoted **hypothesis → pattern** this session. Invoices (1 hit) + Work (1 hit, same shape: leftJoin of `crmCompanies` from a dashboard/PDF service). Novel sub-variant discovered in Work: **assignee/user lookup without tenant-membership check** (W4-2). Worth a dedicated grep in future audits.
- **Platform**: no new shared primitives needed. The `assertAssigneeInTenant` helper in `task.service.ts` is a candidate for promotion to shared middleware if 2+ apps need the same check — defer until second hit.
- **Deferred epic**: none added. Work already passes dim 10.

---

## Sign-off

- [x] All `fix-before-ship` findings closed (W2-1, W4-1, W4-2, W5-1, W5-2 fixed)
- [ ] Golden path walked end-to-end with fresh account (browser spot-check deferred)
- [x] Nice-to-have findings logged with status
- [x] Propagation complete (Phase G)
- [x] Module report marked SIGNED OFF at top

Signed off by: gorkem.cetin@gmail.com
Date: 2026-04-17
