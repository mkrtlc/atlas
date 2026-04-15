# Work app — Tasks + Projects merge + Financials tab

**Status:** Spec for implementation
**Date:** 2026-04-15
**Scope:** Retire the `tasks` and `projects` apps. Replace them with a single `work` app. Add a Financials tab on the project detail page.

---

## Goal

Collapse two dock apps (Tasks, Projects) into one (Work) without losing either audience. Surface project financials inside project detail for project managers, while keeping Invoices top-level for bookkeepers. Make personal todos private to the assignee.

---

## Principles (locked from brainstorming)

- One workspace, two lenses: personal tasks and project work live in the same app, accessed through different sidebar items.
- Personal tasks are **private** to the assignee.
- Projects is the richer data model (keeps members, time entries, company link); the lighter `task_projects` table is retired.
- Financials tab on a project is a **read-only slice** of invoices filtered by `projectId`, with a link into the full Invoices app for editing.
- Hard cutover — Atlas is pre-launch, no redirects or dock shortcuts for the old apps.

---

## App structure

**New top-level app:**
- id: `work`
- route: `/work`
- sidebar order: `25` (replaces Projects's slot, between Calendar and Invoices)
- color: `#6366f1` (reuse Tasks indigo — the IC daily view dominates)
- icon: new `WorkIcon` brand SVG in `packages/client/src/components/icons/app-icons.tsx`

**Removed:** `tasks` and `projects` apps (client + server). Their directories are deleted, their manifests are dropped from the registry, their routes disappear, their dock icons go away.

**Sidebar (inside Work — flat, always visible):**

- My tasks *(default)*
- Assigned to me
- Created by me
- All tasks
- — separator —
- Projects
  - *(dynamic list of active projects; clicking one opens project detail)*

**Main area:**

- Task views render the existing Tasks UI (kanban / list / table) over the filtered task set.
- Project detail renders the six-tab project page.

---

## URL state

URL search params are the source of truth for navigation.

| URL | Surface |
|---|---|
| `/work` | My tasks (default) |
| `/work?view=assigned` | Assigned to me |
| `/work?view=created` | Created by me |
| `/work?view=all` | All tasks |
| `/work?projectId=<uuid>` | Project detail, Overview tab |
| `/work?projectId=<uuid>&tab=<tab>` | Project detail, named tab |
| `/work?...&taskId=<uuid>` | Task slide-over open (existing pattern) |

`tab` values: `overview`, `tasks`, `financials`, `members`, `time`, `files`.

---

## Data model

### Tasks table

- `tasks.projectId` — FK changed from `task_projects(id)` to `project_projects(id)`. Still nullable. `ON DELETE SET NULL`.
- `tasks.isPrivate: boolean NOT NULL DEFAULT false` — **new column**. Set automatically by the server based on `projectId`:
  - `projectId IS NULL` → `isPrivate = true`
  - `projectId IS NOT NULL` → `isPrivate = false`

No UI toggle exposes `isPrivate`. It exists as a column (not a derived predicate) so the privacy query path is cheap and auditable.

### task_projects table

Dropped after migration.

### Invoices table

- `invoices.projectId: uuid NULL REFERENCES project_projects(id) ON DELETE SET NULL` — **new column**
- `idx_invoices_project ON (projectId)` — **new index**

### hr_expenses / other cross-links

No changes. `hr_expenses.projectId` already references `project_projects(id)`.

### record_links

No changes. Existing cross-app linking used by the Files tab.

### Migration (one-shot, runs during `db:push`)

Because Atlas is pre-launch, the migration is free to drop-and-recreate if needed. The intended path:

1. For every row in `task_projects`: insert into `project_projects` preserving the same `id` where possible (copy `name`, `description`, `accountId`, `tenantId`, `createdAt`, default `status='active'`, no members, no company link).
2. `tasks.projectId` FK is swapped to point at `project_projects(id)`. Since IDs were preserved in step 1, no row updates are needed.
3. `task_projects` is dropped.

If ID collisions block step 1, fall back to a rewrite: generate new IDs, build an old→new map, update `tasks.projectId` via the map, then proceed.

---

## Privacy enforcement

Personal tasks (`projectId IS NULL`, `isPrivate = true`) must be invisible to every user except the creator.

**Query layer (authoritative):**

Every task-reading query appends:

```
WHERE (is_private = false OR user_id = :currentUserId)
```

Task read / update / delete by ID: if the row's `isPrivate = true`, reject with 403 unless `userId = currentUserId`.

**Global search:**

The `work` branch of `global-search.service.ts` applies the same predicate so private tasks never leak via cross-app search.

**Notifications / activity:**

If Atlas has activity feeds touching tasks, private tasks don't produce team-visible activity. Verify during implementation.

**Server-enforced defaulting rules:**

| Action | Server behavior |
|---|---|
| Create task, no `projectId` | Set `isPrivate = true` |
| Create task, with `projectId` | Set `isPrivate = false` |
| Update: `projectId` null → value | Set `isPrivate = false` |
| Update: `projectId` value → null | Set `isPrivate = true` |

The client cannot override these. `isPrivate` is never accepted from a request body.

---

## Project detail page — six tabs

**Overview** (landing tab)
- Project name, description, status, due date
- Members list (avatars)
- Key metrics: task counts by status, time tracked, outstanding invoice total

**Tasks**
- Reuses the shared task-list component, filtered to `projectId = currentProject`
- Create-task action pre-fills `projectId`

**Financials**
- Summary strip (three numbers at the top):
  - Total billed = sum of `invoices.total` for this project
  - Total paid = sum of `invoice_payments.amount` across those invoices
  - Outstanding = sum of `invoices.balanceDue` (or `total - paid` per invoice)
- Invoice table: number, issue date, due date, total, balance due, status. Each row links to the invoice detail page at `/invoices?view=invoice-detail&invoiceId=<id>`.
- "+ New invoice" button — opens the create-invoice flow with `projectId` and the project's `companyId` pre-filled.
- Read-only: no inline editing on this tab. Editing happens in Invoices.

**Members** — migrated unchanged from today's Projects app.

**Time** — migrated unchanged (project time entries).

**Files** — queries `record_links` for drive items linked to this project. Read-only list with a link out to Drive.

---

## Backend

### New directory

`packages/server/src/apps/work/` containing:
- `manifest.ts` — ServerAppManifest with id `work`, permission entry, router mounted at `/work`
- `routes.ts` — Express routes (list below)
- `controllers/` — task.controller, project.controller, project-member.controller, project-time.controller, project-file.controller, project-financial.controller
- `services/` — task.service, project.service, project-member.service, project-time.service, project-file.service, project-financial.service
- `utils/` — shared helpers

### Removed

- `packages/server/src/apps/tasks/` (entire directory)
- `packages/server/src/apps/projects/` (entire directory)

### Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/work/tasks` | List tasks with filters (`projectId`, `assigneeId`, `createdById`, `view`) |
| POST | `/work/tasks` | Create (server sets `isPrivate` per rule) |
| GET | `/work/tasks/:id` | Read (403 if private and not creator) |
| PATCH | `/work/tasks/:id` | Update (may flip `isPrivate` via projectId change) |
| DELETE | `/work/tasks/:id` | Archive or delete per existing Tasks behavior |
| GET | `/work/projects` | List projects |
| POST | `/work/projects` | Create |
| GET | `/work/projects/:id` | Detail (includes members) |
| PATCH | `/work/projects/:id` | Update |
| DELETE | `/work/projects/:id` | Delete |
| GET | `/work/projects/:id/members` | List members |
| POST | `/work/projects/:id/members` | Add member |
| DELETE | `/work/projects/:id/members/:userId` | Remove member |
| GET | `/work/projects/:id/time-entries` | List |
| POST | `/work/projects/:id/time-entries` | Create |
| PATCH | `/work/projects/:id/time-entries/:entryId` | Update |
| DELETE | `/work/projects/:id/time-entries/:entryId` | Delete |
| GET | `/work/projects/:id/files` | List linked drive items (via record_links) |
| GET | `/work/projects/:id/financials` | Financials tab data |

### Financials endpoint response shape

```ts
{
  success: true,
  data: {
    summary: {
      totalBilled: number,
      totalPaid: number,
      outstanding: number,
      currency: string,  // assumes single currency per project; if mixed, return 'MIXED'
    },
    invoices: Array<{
      id: string,
      invoiceNumber: string,
      issueDate: string,
      dueDate: string,
      total: number,
      balanceDue: number,
      status: InvoiceStatus,
      currency: string,
    }>,
  }
}
```

### Permissions

Replace `tasks` and `projects` entries in `app-permissions.service.ts` with a single `work` entry. Same role/action shape. `tenantApps` rows are migrated: rows with `appId = 'tasks'` or `appId = 'projects'` become `appId = 'work'` (deduped per tenant).

### Invoices app touch-ups

- `POST /invoices` and `PATCH /invoices/:id` accept `projectId` in the body. Controllers pick it; service passes it through.
- `GET /invoices` supports `?projectId=<uuid>` filter.
- Invoice service's `listInvoices` and `createInvoice`/`updateInvoice` accept optional `projectId`.

### Global search

`global-search.service.ts` UNION ALL query:
- Remove `tasks` branch and `project_projects` branch separately
- Add a single `work` branch that pulls from both tasks (with the privacy predicate) and projects, labeled by a `resultType` discriminator

---

## Client

### New directory

```
packages/client/src/apps/work/
  manifest.ts                          — ClientAppManifest, id='work', route '/work', WorkIcon, color '#6366f1', sidebar order 25
  page.tsx                             — top-level page, owns URL-state routing
  hooks.ts                             — React Query hooks
  settings-store.ts                    — view prefs, last selected project
  components/
    work-sidebar.tsx
    task-views/
      my-tasks-view.tsx
      assigned-view.tsx
      created-view.tsx
      all-tasks-view.tsx
    task-list.tsx                      — migrated from tasks app
    task-detail-panel.tsx              — migrated from tasks app
    project-detail-page.tsx            — tabs shell
    project-overview-tab.tsx
    project-tasks-tab.tsx              — reuses task-list
    project-financials-tab.tsx
    project-members-tab.tsx
    project-time-tab.tsx
    project-files-tab.tsx
```

### Hooks (`hooks.ts`)

- `useTaskList(filters)` — covers all four sidebar views via filter params
- `useTask(id)`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`
- `useProjectList()`, `useProject(id)`, `useCreateProject`, `useUpdateProject`, `useDeleteProject`
- `useProjectMembers(id)`, `useAddProjectMember`, `useRemoveProjectMember`
- `useProjectTimeEntries(id)` + CRUD
- `useProjectFiles(id)`
- `useProjectFinancials(id)`

### Registration

- `packages/client/src/apps/index.ts` — register `workManifest`, delete `tasksManifest` and `projectsManifest` registrations
- Delete `packages/client/src/apps/tasks/` and `packages/client/src/apps/projects/` entirely
- `packages/client/src/config/routes.ts` — add `WORK`, remove `TASKS` and `PROJECTS`
- `packages/client/src/config/query-keys.ts` — add `work` namespace, remove `tasks` and `projects`

### i18n

- New `work.*` namespace in all 5 locales (`en`, `tr`, `de`, `fr`, `it`)
- Remove `tasks.*` and `projects.*` after porting user-visible copy
- Required new keys (non-exhaustive): sidebar labels, tab labels, Financials summary labels (Total billed / Total paid / Outstanding), "New invoice", empty states for each tab, confirmation dialogs for delete

### Invoices app touch-ups

- `invoice-meta-block.tsx` — gains an optional Project select populated from `useProjectList()`. Changes fire `onPatch({ projectId })`.
- Create-invoice flow — accepts `defaultProjectId` prop. The Financials tab's "+ New invoice" button invokes create with this pre-filled.

### Icons

- `packages/client/src/components/icons/app-icons.tsx` — add `WorkIcon` (new brand SVG), remove `TasksIcon` and `ProjectsIcon`
- `sidebar.tsx`, `home.tsx` — drop references to removed icons

---

## Testing

**Unit:**
- `task.service` list/read/update filter correctness: private vs team, `projectId` nullability transitions flipping `isPrivate`
- Migration script idempotency — running twice is a no-op
- `project-financial.service.summary` math: billed, paid, outstanding

**Integration (API-level):**
- User A creates a private task. User B cannot see it via `GET /work/tasks`, `GET /work/tasks/:id`, or global search. User B gets 403 on PATCH/DELETE.
- Creating a task with `projectId` — the response has `isPrivate = false`.
- Updating a task's `projectId` from value → null — response has `isPrivate = true`, and user B loses visibility.
- Create invoice with `projectId`; the project's `/financials` endpoint returns it in the invoices array and includes it in the summary.
- Mixed-currency project — summary returns `currency: 'MIXED'`.

**Client (smoke, in the final plan task):**
- Each sidebar item renders without errors
- Project detail renders each of the six tabs
- Creating a personal task from My tasks, then switching accounts, confirms invisibility
- Financials tab: "+ New invoice" opens the create flow with `projectId` and `companyId` pre-filled; created invoice appears in the list and summary

---

## Out of scope

- Task ↔ invoice-line-item data relationship ("this task produced this billable line")
- Project profitability chart / P&L (expenses vs billings over time)
- Project templates, task templates
- Gantt view
- Recurring tasks
- Bulk operations across tasks or projects

These belong to future specs, not this merge.

---

## Risks

1. **Migration ID preservation may collide** if `task_projects.id` accidentally shares a UUID with a `project_projects.id` row. Pre-launch the risk is negligible; the fallback rewrite path covers it.
2. **Privacy predicate must be applied everywhere tasks are read.** A missed join (e.g. a new dashboard query) leaks private tasks. Add a lint rule or a service-layer helper (`readableTasksQuery(userId)`) that every consumer must go through.
3. **Global search parity** during the rewrite — if the `work` branch ships while old `tasks`/`projects` branches still exist, duplicates appear. The cutover in global-search must happen atomically with the server app swap.
4. **Invoice `projectId` null safety** — `projectId` is optional on invoices. Financials queries must handle projects with zero invoices (return zeros, not errors).
5. **Permission migration of `tenantApps`** — the one-shot update from `tasks`/`projects` → `work` must de-dup if a tenant had both enabled. Migration script handles this.

---

## Follow-up ideas (not in scope)

- Board view across projects ("all in-progress tasks across every project")
- Private-task search shortcut in the global command palette
- Team-visible personal tasks (drop `isPrivate` from derivation, expose a toggle)
