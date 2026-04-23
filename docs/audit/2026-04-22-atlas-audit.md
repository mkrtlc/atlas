# Atlas codebase audit — 2026-04-22

**Scope:** Whole codebase. **Severity threshold:** tight (defects + dead code + broken connections only). **Method:** 9 parallel subagents per app/area. **Findings:** 56 total.

---

## Executive summary

| # | Severity | App / Area | Title | Needs input? |
|---|---|---|---|---|
| 1 | **Critical** | CRM | Proposal controller gates on `'contacts'` entity instead of `'proposals'` | no |
| 2 | **Critical** | CRM | Lead controller gates on `'contacts'` entity instead of `'leads'` | no |
| 3 | **Critical** | CRM | Note controller gates on `'contacts'` entity instead of `'notes'` | no |
| 4 | **Critical** | HR | `employees.notes` field declared in client, missing in DB | yes |
| 5 | **Critical** | HR | `leave_balances` missing unique constraint on `(employeeId, leaveType, year)` | no |
| 6 | **Critical** | Drive | Path traversal: `storagePath` from DB concatenated into FS paths without sandbox check (6 sites) | no |
| 7 | **Critical** | Drive | Public upload writes raw `file.originalname` (unsanitized) into storage path | no |
| 8 | **Critical** | Sign | `signByToken` doesn't verify `fieldId` belongs to the token's document | no |
| 9 | **Critical** | Sign | `signByToken` doesn't verify token's `signerEmail` matches field's `signerEmail` | no |
| 10 | **Critical** | Invoices | Public invoice portal URL missing `/v1` — every email CTA returns 404 | no |
| 11 | **Critical** | Work | Default member apps grants `'tasks'`/`'projects'` (dead app IDs) instead of `'work'` | no |
| 12 | **Critical** | Work | Org members UI grants `'tasks'`/`'projects'` permissions | no |
| 13 | **Critical** | Work | `SmartButtonBar`/`PresenceAvatars` in task panel use `appId="tasks"` not `"work"` | no |
| 14 | **Critical** | Cross-cutting | DB schema drift: 7 columns in live DB not in Drizzle schema (5 dead `tables_*`, 2 unwired `holiday_calendar_id`/`role`) | yes |
| 15 | High | CRM | Google sync status/stop endpoints query `accounts.id = tenantId` — always returns no rows | no |
| 16 | High | CRM | `useContactEmails`/`useDealEmails` hooks expect `CrmEmail[]` but server returns `{ emails }` | no |
| 17 | High | HR | Dashboard scopes by `userId` instead of `tenantId` for employees/departments/time-off | no |
| 18 | High | HR | `leave.service.ts` imports `calculateWorkingDays` from wrong module — runtime crash | no |
| 19 | High | HR | Holiday calendars never linked to leave day calculations | yes |
| 20 | High | HR | `bulkMarkAttendance` conflict target missing `tenantId` — cross-tenant collision possible | no |
| 21 | High | Drive | Soft-delete of folder only one level deep — grandchildren stay visible | no |
| 22 | High | Drive | Restore likewise only unarchives one level | no |
| 23 | High | Drive | Storage quota configured in schema but never enforced on upload | no |
| 24 | High | Drive | `driveMaxVersions` user setting never read — version count grows unbounded | no |
| 25 | High | Drive | `driveAutoVersionOnReplace` setting ignored | no |
| 26 | High | Drive | Public share download has no path traversal guard either | no |
| 27 | High | Sign | Fields can be added/updated/deleted on a `sent` or `signed` document | no |
| 28 | High | Sign | Document `status` is free-text — no enum guard, terminal states bypassable | no |
| 29 | High | Sign | `document.viewed` audit fires on every refresh of signing page | no |
| 30 | High | Sign | `reminderCadenceDays` setting stored but scheduler hardcodes 3 days | no |
| 31 | High | Invoices | Discount/tax order inconsistent between client and recurring generator | yes |
| 32 | High | Invoices | Invoices with `'overdue'` status silently skipped by reminder scheduler | no |
| 33 | High | Invoices | Refund on `'viewed'` invoice wrongly reverts status to `'sent'` | no |
| 34 | High | Docs | Autosave bypasses `If-Unmodified-Since` — concurrent edits unprotected | no |
| 35 | High | Docs | `TableEmbed` extension calls `/tables/:id` (deprecated app) — silently broken | yes |
| 36 | High | Docs | `deleteComment` (user-scoped) is unreachable; only admin-scoped `deleteCommentById` is used | no |
| 37 | High | Work | `previewTimeBilling` hard-codes `unitPrice: 0` — rate factor & extra_per_hour ignored | no |
| 38 | High | Work | `getBlockedTaskIds` has no tenant scoping — leaks cross-tenant data | no |
| 39 | High | Work | All integration tests in `tasks.test.ts` hit `/api/v1/tasks` (dead route) | no |
| 40 | High | Work | `updateTask` owner-only gate silently blocks assignees from updating their tasks | yes |
| 41 | High | Draw | `thumbnailUrl` silently dropped in `updateDrawing` controller | no |
| 42 | High | Draw | Autosave debounce timer never flushed on unmount — last edit can be lost | no |
| 43 | High | Draw | `alert()` used in `InsertImageButton` — violates CLAUDE.md rule | no |
| 44 | High | Cross-cutting | Duplicate task reminder scheduler in `apps/work/utils/reminder.ts` is dead | no |
| 45 | High | Cross-cutting | `PATCH /drive/:id` missing `withConcurrencyCheck` | no |
| 46 | High | Cross-cutting | HR PATCH routes for holiday-calendars/attendance/time-off/onboarding lack `withConcurrencyCheck` | no |
| 47 | High | Cross-cutting | Orphan AI routes `/ai/summarize` and `/ai/quick-replies` (Gmail features removed) | yes |
| 48 | High | Cross-cutting | 20 i18n keys present in `en.json` missing from TR/DE/FR/IT | no |
| 49 | Medium | CRM | Dead `CalendarEvents` component — never imported | yes |
| 50 | Medium | CRM | `crmWorkflowSteps` lacks `tenantId` — concurrency check skips tenant scope | no |
| 51 | Medium | CRM | Dead hook `useSeedStages` — never called | yes |
| 52 | Medium | CRM | `enrichLead` creates activity with no entity link | no |
| 53 | Medium | HR | Onboarding tasks never auto-assigned on employee creation | yes |
| 54 | Medium | HR | `pendingRequests` counts from legacy `timeOffRequests` not `hrLeaveApplications` | no |
| 55 | Medium | Drive | Public upload doesn't UTF-8 re-decode `file.originalname` (corrupts non-ASCII) | no |
| 56 | Medium | Sign | `signatureDocuments.expiresAt` stored but never enforced at signing time | no |
| 57 | Medium | Sign | IP/user-agent never captured in audit log (columns exist) | no |
| 58 | Medium | Sign | Deleting document only soft-archives — uploaded PDF stays on disk | yes |
| 59 | Medium | Sign | `seedSampleData` is a stub that always returns `{ skipped: true }` | yes |
| 60 | Medium | Invoices | Line item `taxRate` defaults to 20 in createLineItem, 0 in replaceLineItems | no |
| 61 | Medium | Invoices | Dead hook `useNextInvoiceNumber` — endpoint side-effects on every call | no |
| 62 | Medium | Invoices | `invoices.proposalId` column stored but never populated from CRM proposal UI | yes |
| 63 | Medium | Invoices | Server trusts client `subtotal/taxAmount/total` — recompute missing | no |
| 64 | Medium | Docs | Full-text search uses `LIKE '%query%'` over JSONB cast — O(N) scan | no |
| 65 | Medium | Docs | `searchDocuments` ignores team visibility — colleagues can't find shared docs | no |
| 66 | Medium | Docs | OpenAPI `DocComment` schema uses `body`/`resolvedAt` but real fields are `content`/`isResolved` | no |
| 67 | Medium | Docs | `listVersions` scopes to `userId` — team members can't view shared doc history | no |
| 68 | Medium | Work | `updateTaskVisibility` writes a `visibility` column that doesn't exist on tasks | no |
| 69 | Medium | Work | Bulk delete fires N sequential HTTP requests — no batch endpoint | no |
| 70 | Medium | Work | Hardcoded English strings in `project-time-tab.tsx` | no |
| 71 | Medium | Work | Calendar aggregator checks `'tasks'` permission instead of `'work'` | no |
| 72 | Medium | Draw | Dead state `showSettings`/`DrawSettingsModal` — never opened | no |
| 73 | Medium | Draw | Autosave fires on every Excalidraw onChange — no dirty check | no |
| 74 | Medium | Draw | 3 of 4 `BG_PRESETS` share the same `labelKey` | no |
| 75 | Medium | Cross-cutting | Orphan `threads`/`emails`/`attachments` tables (Gmail-mirror, no UI) | yes |
| 76 | Medium | Cross-cutting | Dead `user_settings.tables_*` columns pollute drift detector | no |
| 77 | Medium | Cross-cutting | Refresh token rotation doesn't invalidate old tokens | no |
| 78 | Medium | Cross-cutting | OpenAPI under-coverage — 12 cross-cutting routes have no spec | no |
| 79 | Low | CRM | (covered above — `max` import unused) | no |
| 80 | Low | Sign | PDF download doesn't embed audit trail page | yes |
| 81 | Low | Sign | `signingOrder=0` for multiple signers semantics ambiguous | yes |
| 82 | Low | Invoices | No exchange-rate snapshot on invoices — multi-currency dashboard mixes raw amounts | yes |
| 83 | Low | Docs | Content stored as `{ _html }` not ProseMirror JSON; autosave fires on every keystroke | no |
| 84 | Low | Docs | `.docx` import is a placeholder — mammoth not actually used | no |
| 85 | Low | Work | No notification on task reassignment-away (only new assignee notified) | yes |
| 86 | Low | Draw | `updateDrawingVisibility` error path dead | no |
| 87 | Low | Draw | `PATCH /:id/visibility` missing `withConcurrencyCheck` | no |
| 88 | Low | Cross-cutting | App-level notifications only fire from CRM workflows + mentions | no |

**Counts:** 14 Critical · 34 High · 30 Medium · 10 Low = **88 findings** across 9 audit areas.

**Needs your input (15 items):** #4, 14, 19, 35, 40, 47, 49, 51, 53, 58, 59, 62, 75, 80, 81, 82, 85.

---

## Per-app sections

### CRM

#### Critical
- **Proposal controller gates on wrong entity.** Every `canAccessEntity(perm.role, 'contacts', ...)` call in `proposal.controller.ts` (lines 15, 43, 68, 99, 128, 148, 173, 197, 218) should pass `'proposals'`. A user blocked from contacts but permitted on proposals is incorrectly denied. Fix: replace `'contacts'` → `'proposals'`.
- **Lead controller gates on wrong entity.** Same bug in `lead.controller.ts` (lines 16, 60, 101, 128, 148, 171, 245, 265, 286, 313). The convert-lead check at line 175 (`'deals', 'create'`) is correct; all others wrong. Fix: replace `'contacts'` → `'leads'`.
- **Note controller gates on wrong entity.** Same in `note.controller.ts` (lines 17, 41, 86, 109). Fix: replace `'contacts'` → `'notes'`.

#### High
- **Google sync status/stop query fails.** `dashboard.controller.ts:85,132` — `eq(accounts.id, tenantId)` will never match because `accounts.id` is the per-user account UUID, not a tenant ID. Fix: query by `accounts.userId = req.auth!.userId`.
- **Email/calendar timeline hooks return wrong shape.** Server returns `{ emails: [...] }` / `{ events: [...] }`; client hooks at `hooks.ts:1337,1349,1361,1373` cast `data.data as CrmEmail[]`. Result: `EmailTimeline` and `CalendarEvents` silently show empty. Fix: change hooks to `data.data.emails` / `data.data.events`.

#### Medium
- **Dead `CalendarEvents` component.** `calendar-events.tsx` is never imported anywhere. Either wire it into `deal-detail-page.tsx` / `contact-detail-page.tsx` if calendar events are expected to show, or delete the file. **Needs input.**
- **`crmWorkflowSteps` lacks `tenantId`.** The table has `id, workflowId, position, action, actionConfig, condition, createdAt, updatedAt` only. `withConcurrencyCheck(crmWorkflowSteps)` on the step PATCH route silently skips tenant filtering. Tenant scoping is enforced via the parent workflow lookup in the service, but this should be made explicit with `{ skipTenantCheck: true }` or by adding `tenantId` to the steps table.
- **Dead `useSeedStages` hook.** Defined at `hooks.ts:371`, never imported. Either wire it to settings or remove. **Needs input.**
- **`max` imported but unused** in `proposal.service.ts`.
- **`enrichLead` creates floating activity.** `lead.service.ts:183-186` calls `createActivity` with no `leadId`/`contactId`/`companyId`, so the AI-enrichment activity is unlinked from any record's timeline.

#### Clean / verified
- All 40+ routes have matching controller exports.
- Concurrency middleware applied to every PATCH on core entities.
- Soft-delete consistent — no hard `db.delete()` in user-facing paths.
- `acceptProposal` correctly creates draft invoice + line items in one transaction.
- `regeneratePortalToken` actually invalidates old tokens (overwrites with new UUID).

---

### HR

#### Critical
- **`employees.notes` declared in client, missing in DB.** `HrEmployee` interface in `hooks.ts:19` has `notes: string | null`; `schema.ts:998-1028` doesn't have the column. Save/fetch silently no-ops. Fix: add `notes: text('notes')` to schema and `db:push`, or remove from client. **Needs input.**
- **`leave_balances` no unique constraint.** Missing `uniqueIndex('idx_leave_balances_unique').on(employeeId, leaveType, year)`. Concurrent policy assignments can double-allocate balances. Fix: add the index + use `onConflictDoUpdate`.

#### High
- **Dashboard scopes by `userId` instead of `tenantId`.** `dashboard.service.ts:21-31` — three queries filter by `userId`. In a multi-user tenant the dashboard only shows records the current user created. Fix: replace with `tenantId` only, rely on `requireAppPermission`.
- **`leave.service.ts` imports from wrong module.** `import { calculateWorkingDays } from './service'` — the barrel doesn't export that name. Runtime crash on every leave application creation. Fix: import from `./services/leave-config.service`.
- **Holiday calendars not wired to leave calc.** `leave.service.ts:97` passes `undefined` as `calendarId` with a "not yet supported" comment. The whole holidays UI is decorative — they don't reduce leave-day consumption. **Needs input.**
- **`bulkMarkAttendance` cross-tenant collision risk.** `attendance.service.ts:79-85` — `onConflictDoUpdate` target `(employeeId, date)` matches the unique index but neither includes tenant. Fix: add `tenantId` to both.

#### Medium
- **Onboarding tasks never auto-assigned.** `createEmployee` doesn't call `seedDefaultTemplate`. Templates exist; new employees arrive empty-handed. **Needs input.**
- **`attendance.service.ts` is at top level, breaks `services/` convention.** Other HR services live under `services/`. Move it.
- **Dashboard `pendingRequests` reads stale table.** `dashboard.service.ts:76` filters from `timeOffRequests`; the active flow uses `hrLeaveApplications`. Pending count is always 0 for tenants on the new flow.
- **PATCH routes for `holiday-calendars` and `holidays` lack `withConcurrencyCheck`.** Inconsistent with every other HR PATCH.

#### Clean / verified
- Leave application lifecycle (draft → submit → approve/reject → cancel) wired end-to-end with balance debit/credit.
- Expense lifecycle (draft → submit → approve/refuse → paid) state transitions correct, with policy enforcement.
- Department soft-delete + employee FK `set null` — safe orphan-on-delete semantics.
- Employee documents end-to-end (upload + signed download).
- Leave balance daily scheduler started + idempotent.

---

### Drive

#### Critical
- **Path traversal: 6 call sites concat `storagePath` into FS paths without sandbox check.** `items.service.ts:278`, `file-ops.controller.ts:61/93/144`, `share.routes.ts:97`, `sharing.controller.ts:120`. A compromised `storagePath` value (e.g., `../../etc/passwd`) escapes the uploads sandbox. Fix: shared `safeFilePath(storagePath)` helper that normalizes + asserts `startsWith(UPLOADS_DIR)`, used in all 6 sites.
- **Public upload writes raw `originalname`.** `public-upload.controller.ts:53` — `${tenantId}/${uuid}_${ts}_${file.originalname}`. Authenticated upload sanitizes via `replace(/[^a-zA-Z0-9._-]/g, '_')` (`routes.ts:32`). Public route doesn't. Fix: same sanitization.

#### High
- **Soft-delete only one level deep.** `items.service.ts:238-244` archives the folder + direct children. Grandchildren stay visible. Fix: recursive CTE or `permanentDelete`-style descendant walk.
- **Restore one level deep too.** Same bug at `items.service.ts:256-259`.
- **Storage quota never enforced.** `tenants.storageQuotaBytes` schema exists; no upload handler reads or checks it. `GET /drive/storage` reports usage but writes aren't blocked. Fix: in `uploadFiles` controller fetch usage + quota, return 507 if exceeded.
- **`driveMaxVersions` setting never read.** `versioning.service.ts:listVersions` hardcodes `.limit(20)`; `createVersion` inserts unboundedly. Old versions accumulate; orphan disk files never pruned.
- **`driveAutoVersionOnReplace` ignored.** `sharing.controller.ts:48` always calls `createVersion` regardless of setting.
- **Public share download has no traversal guard either** (same Critical bug, public surface).

#### Medium
- **`readFileSync` imported but unused** in `file-ops.controller.ts:6`. Preview uses inline `require('node:fs')` instead.
- **Stale parallel barrel.** Server `service.ts` exports functions `controller.ts` doesn't re-export. Either consolidate or delete `controller.ts`.
- **Public upload doesn't UTF-8 re-decode `file.originalname`.** Authenticated path applies `Buffer.from(file.originalname, 'latin1').toString('utf8')`; public path doesn't. Non-ASCII filenames corrupt.
- **Drive ↔ CRM linking is one-way (read-only from Drive).** No UI in Drive lets you create a `record_links` row pointing to a CRM record. Either add the action or document the design intent. **Needs input.**

#### Low
- **`batchDelete` and `batchTrash` are duplicates per inline comment.** Pick one.
- **Old version disk file not deleted when version row is deleted.**

#### Clean / verified
- Upload flow end-to-end (multer → DB row → tenant directory created).
- Share link revoke is real (hard-delete; old tokens stop resolving immediately).
- Permanent delete recursively unlinks disk files.
- File streaming uses `createReadStream(...).pipe(res)`, not `readFileSync`.
- `uploadSource` JSONB written correctly by public upload.

---

### Sign

#### Critical
- **`signByToken` doesn't verify `fieldId` belongs to the document.** `fields-public.controller.ts:268` writes signature data to attacker-supplied `fieldId` without joining `signatureFields` to confirm `documentId === result.document.id`. Fix: lookup field, assert ownership, 403 otherwise.
- **`signByToken` doesn't verify token's signer matches field's signer.** Any signer with a valid token can sign fields assigned to other recipients. Fix: assert `field.signerEmail === result.token.signerEmail`.

#### High
- **Fields editable on `sent`/`signed` documents.** `createField`/`updateField`/`deleteField` only check RBAC, not document state. Fix: reject unless `document.status === 'draft'`.
- **`status` is free-text.** `documents.service.ts:208` writes any string. Caller can bypass terminal states (`signed`/`completed`/`voided`). Fix: enum validation + transition guard.
- **`document.viewed` audit floods on refresh.** `getSigningToken` writes the audit row whenever token is `pending`, no dedup. Fix: add `viewedAt` column + first-view-only logic.
- **`reminderCadenceDays` setting ignored — scheduler hardcodes 3 days.** `reminder.ts:44-48` uses `INTERVAL '3 days'`. Fix: read from settings per-tenant.

#### Medium
- **`signatureDocuments.expiresAt` stored but never enforced.** Only the per-recipient token expiry is checked. Fix: also reject if doc-level `expiresAt` past.
- **IP/user-agent never captured in audit log.** Schema has columns; service signature has fields; controllers never pass them. Fix: thread `req.ip` + `req.headers['user-agent']` through.
- **Deleting document only soft-archives — PDF stays on disk.** `documents.service.ts:230-243`. Files accumulate forever. **Needs input** (legal hold? oversight?).
- **`seedSampleData` is a stub.** Returns `{ skipped: true }` always. Route + controller fully wired. **Needs input.**

#### Low
- **PDF download doesn't embed audit trail page.** Only signatures + text. **Needs input.**
- **`signingOrder=0` ambiguity** when multiple signers share order 0. **Needs input.**

#### Clean / verified
- Token validation cryptographically sound (`crypto.randomUUID()`, unique index, equality lookup, expiry check).
- Sequential signing enforced via `isSignerTurn` query.
- Void flow atomic (mark + expire all pending tokens in transaction).
- Reminder scheduler started from `index.ts:55`, hourly `setInterval`.
- PDF signature embedding round-trips correctly with proper Y-axis flip.

---

### Invoices

#### Critical
- **Public invoice portal URL missing `/v1`.** `invoice-email.service.ts:131` and `invoice-detail-page.tsx:156` build `${baseUrl}/api/invoices/portal/...` — server is mounted at `/api/v1/invoices`. Every email CTA + share link returns 404. Fix: change both to `/api/v1/invoices/portal/`.

#### High
- **Discount/tax order inconsistent.** `invoice-builder-modal.tsx:156-158` — tax on gross, discount post-tax. `recurring-invoice.service.ts:444-447` — discount first, then tax on discounted base. Both produce same total for the example case but diverge for non-symmetric values. **Needs input.**
- **Overdue invoices skip reminders.** `reminder-scheduler.ts:127` queries only `'sent'`/`'viewed'`. Status set to `'overdue'` by `payment.service.ts:125` after refund-below-total. Fix: add `'overdue'` to the `inArray`.
- **Refund reverts `'viewed'` → `'sent'`.** `payment.service.ts:125` — `revertTo` is `sent`/`overdue` based only on due date. `viewed` history (proves portal opened) lost. Fix: preserve `viewed` if was viewed.

#### Medium
- **`taxRate` defaults inconsistent.** `createLineItem` defaults to 20; `replaceLineItems` defaults to 0. Fix: align to 0 or read tenant default.
- **Dead `useNextInvoiceNumber` hook + counter side effect.** Endpoint increments counter every call; no caller. Future use as preview would burn sequence numbers.
- **`invoices.proposalId` stored but never populated.** No CRM proposal UI passes it. Either build "Convert to invoice" flow or drop the column. **Needs input.**
- **Server trusts client-submitted totals.** `invoice.service.ts:351-393` writes whatever client sends. `replaceLineItems` doesn't recompute parent totals. Tampered request can set `total=0` with real line items. Fix: recompute on save.

#### Low
- **No exchange-rate snapshot on multi-currency invoices.** Dashboard sums mixed currencies as if same unit. **Needs input** on multi-currency scope.

#### Clean / verified
- Payment recording with row-level lock + net-of-refunds + auto-paid status.
- Recurring invoice idempotency (FOR UPDATE lock + nextRunAt advance + maxRuns deactivate).
- `excludeFromAutoReminders` correctly filtered in scheduler.
- PDF generation uses live invoice data.
- Payment service mutators all transactional.

---

### Docs

#### High
- **Autosave bypasses `If-Unmodified-Since`.** `useAutoSaveDocument` doesn't pass `updatedAt`. Content edits — the most frequent mutation — are completely unprotected. Icon/cover edits do pass it. Fix: thread `doc.updatedAt` through `save()` and the autosave mutation.
- **`TableEmbed` extension calls deprecated `/tables/:id`.** Tables app removed in v1.10.0. Existing `tableEmbed` nodes silently show "Could not load table." Slash command still inserts new (immediately broken) embeds. Fix: remove the extension. **Needs input** on whether to migrate existing nodes.
- **Dead `deleteComment` (user-scoped) function.** `comment.service.ts:51-53` exports user-scoped delete; only admin-scoped `deleteCommentById` is called. Fix: remove the unreachable export.

#### Medium
- **Full-text search is `LIKE '%query%'` over JSONB cast.** O(N) scan, no GIN index. Fine at small scale, degrades fast.
- **`searchDocuments` ignores team visibility.** Filters by `userId` only; team-shared docs invisible to colleagues in search. Fix: same `ownerCondition` pattern as `listDocuments`.
- **Autosave `flush` is dead** — destructured nowhere; navigation away mid-debounce fires PATCH against stale `selectedId`.
- **`countTimerRef` never cleaned on unmount** in `DocEditor`. Pending setState on unmounted component possible.
- **OpenAPI `DocComment` schema uses `body`/`resolvedAt`; real fields are `content`/`isResolved`.** Generated client would use wrong field names.
- **`listVersions` scopes to `userId`.** Team members can't view history of shared docs.

#### Low
- **Content stored as `{ _html }`, not ProseMirror JSON; autosave fires on every keystroke** because `getHTML()` always returns a new string object — no equality check before save.
- **`.docx` import is a placeholder** — mammoth.js not actually installed/used.

#### Clean / verified
- Concurrency check wired on the main `PATCH /docs/:id`.
- Version history functional (snapshots + 50-cap pruning + restore-with-pre-save).
- Backlinks consistently maintained via `syncDocumentLinks`.
- Circular parent detection via `checkIsDescendant`.
- SmartButtonBar rendered per document.

---

### Work (tasks + projects)

#### Critical
- **Default member apps grants `'tasks'`/`'projects'` (dead app IDs).** `tenant-user.service.ts:15` — `DEFAULT_MEMBER_APPS = ['tasks', 'drive', 'docs', 'draw', 'tables', 'sign', 'projects']`. Work registers as `'work'`. New members get **no access** to the Work app at all. Fix: replace `'tasks'`/`'projects'` with `'work'`. Same fix in `org-member-edit.tsx:166`.
- **Org members UI grants dead app IDs.** `org-members.tsx:41,47` shows `appId: 'tasks'` and `appId: 'projects'` in the default list. Same fix.
- **`SmartButtonBar`/`PresenceAvatars` use `appId="tasks"` not `"work"`.** `task-detail-panel.tsx:81,100`. Permission checks along the link path use the wrong key. Same in `calendar/aggregator.service.ts:40`. Fix: change to `'work'` everywhere.

#### High
- **`previewTimeBilling` hard-codes `unitPrice: 0`.** `projects.controller.ts:590,660`. Schema has `project_rates.factor` + `extra_per_hour`; time entries carry `rateId`. Formula never applied. Fix: join rates + members, compute properly.
- **`getBlockedTaskIds` no tenant scoping.** `extras.service.ts:306-318` selects across all tenants. A task in tenant A can be marked blocked by a blocker in tenant B. Fix: add `tenantId` filter.
- **All `tasks.test.ts` integration tests hit dead `/api/v1/tasks` path.** Should be `/api/v1/work/tasks`.
- **`updateTask` owner-only gate blocks assignees.** `task.service.ts:195` — `if (existing.userId !== userId) return null`. Assignees can't update their own assigned tasks. **Needs input** on intended permission model.

#### Medium
- **`updateTaskVisibility` writes a non-existent `visibility` column.** `tasks.controller.ts:146` calls `updateTask(... { visibility } as any)`. `tasks` table has `isPrivate`, no `visibility`. Drizzle silently drops unknown fields → no-op. Fix: map to `isPrivate` or remove the endpoint.
- **Bulk delete fires N requests.** `work-tasks-view.tsx:223` Promise.all on N mutateAsync. Add a server bulk endpoint.
- **Hardcoded English strings** in `project-time-tab.tsx:81,91,239`.
- **Calendar aggregator checks `'tasks'` permission** (always fails — dead app ID). Same `'work'` fix.

#### Low
- **No notification on task reassignment-away** — only new assignee notified. **Needs input.**
- **Duplicate reminder scheduler** at `apps/work/utils/reminder.ts` (also flagged in cross-cutting).

#### Clean / verified
- `tasks.projectId` FK with `onDelete: 'set null'` (no cascade-delete tasks on project delete).
- `isPrivate` enforcement via `readableTasksFilter()` consistently applied.
- Concurrency check wired on `PATCH /tasks/:id`, `PATCH /projects/:id`, `PATCH /time-entries/:id`.
- Circular dependency detection via BFS.
- Assignment notification fires on first assign, non-blocking.

---

### Draw

#### High
- **`thumbnailUrl` silently dropped in `updateDrawing` controller.** `controller.ts:98` doesn't destructure `thumbnailUrl`; client sends it after every thumbnail generation; service accepts it. Fix: add to destructure.
- **Autosave `flush` doesn't actually flush** — only cancels the pending timer. `page.tsx` doesn't call it. Final edit lost on unmount during debounce window.
- **`alert()` in `InsertImageButton:18`** — violates CLAUDE.md "no `window.alert()`" rule. Use Toast.

#### Medium
- **Dead `showSettings` state + `DrawSettingsModal`** — never opened (settings live in global panel now).
- **Autosave fires on every Excalidraw `onChange`** including viewport pan/zoom (not in whitelist). Add dirty check before scheduling save.
- **3 of 4 `BG_PRESETS` share the same `labelKey`** (`draw.bgWhite`).

#### Low
- **`updateDrawingVisibility` controller catches an error message that's never thrown.**
- **`PATCH /:id/visibility` missing `withConcurrencyCheck`.**

#### Clean / verified
- Concurrency check on main PATCH.
- Scene serialization round-trips (jsonb `content` with elements/appState/files).
- Undo/redo entirely client-side via Excalidraw.
- Export entirely frontend (PNG/SVG/PDF/clipboard via `exportToBlob`).
- `purgeOldArchivedDrawings` on daily cron + startup.

---

### Cross-cutting

#### Critical
- **DB schema drift (7 columns).** Live DB has 7 columns Drizzle doesn't declare. 5 are dead `tables_*` (deprecated app); 2 (`employees.holiday_calendar_id`, `project_members.role`) are unwired. **Needs input** on the 2 unwired columns.

#### High
- **Duplicate task reminder scheduler.** `apps/work/utils/reminder.ts` is dead; `index.ts:11` imports the working copy from `apps/work/reminder`. Fix: delete `utils/reminder.ts`.
- **`PATCH /drive/:id` missing `withConcurrencyCheck`.** Every other primary entity has it.
- **HR PATCH routes missing concurrency:** `holiday-calendars`, `attendance`, `time-off`, `onboarding`. Tables all have `updatedAt`.
- **Orphan AI routes `/ai/summarize` + `/ai/quick-replies`.** Gmail-thread features; no client caller. Email feature was removed. **Needs input.**
- **20 i18n keys present in `en.json` missing from TR/DE/FR/IT.** All in `crm.workflows.*` namespace, including notification titles + seed names. Fix: add to all 4 non-English locales.

#### Medium
- **Orphan `threads`/`emails`/`attachments` tables.** Gmail-mirror, no UI. Sync worker started unconditionally. **Needs input.**
- **`user_settings.tables_*` dead columns** pollute drift detector — exits 1 on every CI run. Fix: drop in migration.
- **Refresh token rotation doesn't invalidate old tokens.** Stolen 30-day token valid until natural expiry. Need a `refresh_tokens` table with `revoked` flag.
- **OpenAPI under-coverage.** 12 cross-cutting routes have no spec (notifications, search, record-links, custom-fields, etc.). Scalar UI is misleadingly incomplete.

#### Low
- **App-level notifications only fire from CRM workflows + mentions.** HR/Invoices/Sign/Drive events don't write to the `notifications` table for in-app display.

#### Clean / verified
- JWT auth: signature verified, `exp` claim set, password reset tokens single-use + expiry-checked.
- Token encryption (AES-256-GCM via `TOKEN_ENCRYPTION_KEY`) used correctly for OAuth/API keys.
- Concurrency check coverage: CRM (8 entities), Docs, Work (3), Invoices (2), Draw, HR (most). Only Drive item + 4 HR sub-resources missing.
- All 7 schedulers (sign reminders, task reminders, CRM activity + digest, leave balance, recurring invoices, invoice reminders) started in `index.ts` with try/catch boundaries.
- Global search covers all active apps with permission scoping.
- Settings registry panels all resolve to real files.

---

## Triage instructions

For each finding, decide:
- **Fix** (defaults to yes for Critical/High; Medium/Low if you agree)
- **Defer** (out of scope this round; re-audit later)
- **Reject** (false positive or working as intended; please say why)

For the **15 "needs input" items**, provide the missing decision. The fix phase blocks on those.

When you've triaged, I'll begin batched fixes per app per the plan (one commit per app for related fixes; cross-cutting changes get their own commits).
