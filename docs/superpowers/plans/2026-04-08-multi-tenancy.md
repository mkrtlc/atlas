# Multi-Tenancy Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `accountId`-based data scoping with `tenantId`-based scoping across all collaborative tables to enable SaaS multi-tenancy.

**Architecture:** Replace `accountId` with `tenantId` in all collaborative table definitions (schema + migrations), update the JWT payload to make `tenantId` required and remove `accountId`, update all service/controller functions to query by `tenantId`, add a public registration endpoint, and update shared types + client auth store. Personal tables (email, calendar) keep `accountId`. No data migration needed (greenfield).

**Tech Stack:** Express, Drizzle ORM, PostgreSQL, React, TypeScript, react-i18next

**Spec:** `docs/superpowers/specs/2026-04-08-multi-tenancy-design.md`

---

## Phase 1: Foundation (Auth + Schema + Registration)

These tasks MUST be done first and in order. They establish the new tenantId-based auth flow that all subsequent app migrations depend on.

### Task 1: Update AuthPayload and JWT generation

**Files:**
- Modify: `packages/server/src/middleware/auth.ts`
- Modify: `packages/server/src/services/auth.service.ts`

- [ ] **Step 1: Update AuthPayload interface**

In `packages/server/src/middleware/auth.ts`, change the interface:

```typescript
export interface AuthPayload {
  userId: string;
  tenantId: string;       // REQUIRED, was optional
  email: string;
  isSuperAdmin?: boolean;
  tenantRole?: string;    // owner | admin | member
}
```

Remove `accountId` from the interface entirely.

- [ ] **Step 2: Update JWT token generation**

In `packages/server/src/services/auth.service.ts`, find the `generateTokens` function. Update the JWT payload to include `tenantId` (required) and remove `accountId`:

```typescript
export function generateTokens(account: any, tenantId: string, isSuperAdmin?: boolean, tenantRole?: string) {
  const payload = {
    userId: account.userId,
    tenantId,
    email: account.email,
    isSuperAdmin: isSuperAdmin ?? false,
    tenantRole: tenantRole ?? 'member',
  };
  // ... rest of token signing
}
```

- [ ] **Step 3: Update auth middleware JWT verification**

In `packages/server/src/middleware/auth.ts`, update the token verification to extract `tenantId` instead of `accountId`. Remove any backwards-compatibility code that references `accountId`.

- [ ] **Step 4: Update login controller**

In `packages/server/src/controllers/auth/login.controller.ts`, update the login handler:
- After validating credentials, look up the user's tenant via `tenantMembers`
- Pass `tenantId` to `generateTokens`
- Remove any `accountId` references from the response

```typescript
// After validating credentials and getting the account:
const [membership] = await db.select().from(tenantMembers)
  .where(eq(tenantMembers.userId, account.userId))
  .limit(1);

if (!membership) {
  return res.status(403).json({ success: false, error: 'No organization found for this account' });
}

const tokens = generateTokens(account, membership.tenantId, user.isSuperAdmin, membership.role);
```

- [ ] **Step 5: Update setup controller**

In `packages/server/src/controllers/auth/setup.controller.ts`, the setup flow already creates a tenant. Ensure `generateTokens` is called with the new signature (tenantId required, no accountId).

- [ ] **Step 6: Update password reset and Google auth controllers**

In `packages/server/src/controllers/auth/password.controller.ts` and `packages/server/src/controllers/auth/google.controller.ts`:
- Remove `accountId` from JWT payloads
- Look up `tenantId` via `tenantMembers` when issuing tokens

- [ ] **Step 7: Verify the server compiles**

Run: `cd packages/server && npx tsc --noEmit`

This will show all downstream files that still reference `req.auth!.accountId` — that's expected. The compiler errors are the migration TODO list for Phase 2. For now, confirm auth-layer files compile.

- [ ] **Step 8: Commit**

```bash
git add packages/server/src/middleware/auth.ts packages/server/src/services/auth.service.ts packages/server/src/controllers/auth/
git commit -m "feat(auth): make tenantId required in JWT, remove accountId from auth payload"
```

---

### Task 2: Update database schema — collaborative tables

**Files:**
- Modify: `packages/server/src/db/schema.ts`

This is the largest single file change. Replace `accountId` with `tenantId` in all collaborative table definitions.

- [ ] **Step 1: Add tenantId import and helper**

At the top of `schema.ts`, ensure the `tenants` table is defined before collaborative tables (it already is). All collaborative tables will reference it:

```typescript
tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
```

- [ ] **Step 2: Replace accountId with tenantId in Tasks tables**

In `schema.ts`, for each of these tables replace `accountId: uuid('account_id').notNull()` with `tenantId: uuid('tenant_id').notNull().references(() => tenants.id)`:

- `taskProjects`
- `tasks`
- `subtasks`
- `taskActivities`
- `taskTemplates`
- `taskComments`
- `taskAttachments`
- `taskDependencies`

Keep `userId` columns as-is.

- [ ] **Step 3: Replace accountId with tenantId in CRM tables**

Same replacement for:
- `crmCompanies`, `crmContacts`, `crmDealStages`, `crmDeals`
- `crmActivityTypes`, `crmActivities`, `crmWorkflows`
- `crmTeams`, `crmTeamMembers`, `crmPermissions`
- `crmLeads`, `crmNotes`, `crmSavedViews`, `crmLeadForms`

- [ ] **Step 4: Replace accountId with tenantId in HR tables**

Same replacement for:
- `departments`, `employees`, `leaveBalances`
- `onboardingTasks`, `onboardingTemplates`, `employeeDocuments`
- `timeOffRequests`, `hrLeaveTypes`, `hrLeavePolicies`
- `hrLeavePolicyAssignments`, `hrHolidayCalendars`, `hrHolidays`
- `hrLeaveApplications`, `hrAttendance`, `hrLifecycleEvents`

- [ ] **Step 5: Replace accountId with tenantId in Projects tables**

Same replacement for:
- `projectClients`, `projectProjects`, `projectMembers`
- `projectTimeEntries`, `projectInvoices`, `projectInvoiceLineItems`
- `projectSettings`

- [ ] **Step 6: Replace accountId with tenantId in Drive tables**

Same replacement for:
- `driveItems`, `driveItemVersions`, `driveShareLinks`
- `driveItemShares`, `driveActivityLog`, `driveComments`

- [ ] **Step 7: Replace accountId with tenantId in Documents tables**

Same replacement for:
- `documents`, `documentVersions`, `documentComments`, `documentLinks`

- [ ] **Step 8: Replace accountId with tenantId in remaining collaborative tables**

Same replacement for:
- `spreadsheets`, `tableRowComments` (Tables app)
- `signatureDocuments`, `signatureFields`, `signingTokens`, `signAuditLog`, `signTemplates` (Sign app)
- `drawings` (Draw app)
- `customFieldDefinitions`, `customFieldValues`, `recordLinks` (Shared)
- `activityFeed`, `notifications` (Shared)
- `auditLog`, `presenceHeartbeats` (System)

- [ ] **Step 9: Do NOT touch personal tables**

Verify these still have `accountId` and are untouched:
- `threads`, `emails`, `attachments`, `contacts`
- `categoryRules`, `emailTracking`, `trackingEvents`
- `calendars`, `calendarEvents`
- `userSettings`, `passwordResetTokens`
- `pushSubscriptions`
- `crmEmailSync`, `crmGoogleTokens`

- [ ] **Step 10: Commit**

```bash
git add packages/server/src/db/schema.ts
git commit -m "feat(schema): replace accountId with tenantId in all collaborative tables"
```

---

### Task 3: Update database migrations

**Files:**
- Modify: `packages/server/src/db/migrate.ts`

- [ ] **Step 1: Update all CREATE TABLE statements**

For every collaborative table in `migrate.ts`, replace:
- `account_id UUID NOT NULL` → `tenant_id UUID NOT NULL REFERENCES tenants(id)`
- Index names: `idx_*_account` → `idx_*_tenant`
- Remove `account_id` from any composite indexes, replace with `tenant_id`

Follow the same table groupings as Task 2 (Tasks, CRM, HR, Projects, Drive, Documents, Tables, Sign, Draw, Shared).

- [ ] **Step 2: Do NOT touch personal table migrations**

Same list as Task 2 Step 9 — leave these alone.

- [ ] **Step 3: Verify server compiles**

Run: `cd packages/server && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/db/migrate.ts
git commit -m "feat(migrate): replace account_id with tenant_id in all collaborative table migrations"
```

---

### Task 4: Update shared types

**Files:**
- Modify: `packages/shared/src/types/task.ts`
- Modify: `packages/shared/src/types/crm.ts`
- Modify: `packages/shared/src/types/hr.ts`
- Modify: `packages/shared/src/types/projects.ts`
- Modify: `packages/shared/src/types/drive.ts`
- Modify: `packages/shared/src/types/document.ts`
- Modify: `packages/shared/src/types/table.ts`
- Modify: `packages/shared/src/types/signature.ts`
- Modify: `packages/shared/src/types/drawing.ts`
- Modify: `packages/shared/src/types/custom-field.ts`
- Modify: `packages/shared/src/types/settings.ts`
- Modify: `packages/shared/src/types/calendar.ts`

- [ ] **Step 1: Replace accountId with tenantId in collaborative type interfaces**

In each shared types file, find interfaces with `accountId: string` and replace with `tenantId: string` for collaborative types. Do NOT change personal types (email, calendar event types that are per-user).

Example in `task.ts`:
```typescript
// Before
export interface Task {
  id: string;
  accountId: string;
  userId: string;
  // ...
}

// After
export interface Task {
  id: string;
  tenantId: string;
  userId: string;
  // ...
}
```

Apply the same pattern to all collaborative interfaces across all type files.

- [ ] **Step 2: Rebuild shared package**

Run: `cd packages/shared && npx tsc --skipLibCheck`

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/
git commit -m "feat(types): replace accountId with tenantId in all collaborative type interfaces"
```

---

### Task 5: Add public registration endpoint

**Files:**
- Create: `packages/server/src/controllers/auth/register.controller.ts`
- Modify: `packages/server/src/routes/auth.routes.ts` (or wherever auth routes are defined)

- [ ] **Step 1: Find the auth routes file**

Search for where `POST /auth/setup` is registered to find the routes file.

- [ ] **Step 2: Create register controller**

Create `packages/server/src/controllers/auth/register.controller.ts`:

```typescript
import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import * as authService from '../../services/auth.service';
import { db } from '../../config/database';
import { accounts } from '../../db/schema';
import { logger } from '../../utils/logger';
import { hashPassword, validatePasswordStrength } from '../../utils/password';
import * as tenantService from '../../services/platform/tenant.service';

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, companyName } = req.body;

    if (!name || !email || !password || !companyName) {
      res.status(400).json({ success: false, error: 'name, email, password, and companyName are required' });
      return;
    }

    // Check if email already exists
    const existing = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ success: false, error: 'An account with this email already exists' });
      return;
    }

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      res.status(400).json({ success: false, error: strength.error });
      return;
    }

    // Generate slug from company name
    const slug = companyName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 63);

    if (!slug) {
      res.status(400).json({ success: false, error: 'Company name must contain at least one alphanumeric character' });
      return;
    }

    // Create user + account
    const passwordHash = await hashPassword(password);
    const { user, account } = await authService.createPasswordAccount({
      email,
      name,
      passwordHash,
    });

    // Create tenant + add user as owner
    const tenant = await tenantService.createTenant({ slug, name: companyName }, user.id);

    // Generate tokens with tenantId
    const tokens = authService.generateTokens(account, tenant.id, false, 'owner');

    logger.info({ userId: user.id, tenantId: tenant.id, email }, 'New registration completed');

    res.status(201).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        account: {
          id: account.id,
          userId: account.userId,
          email: account.email,
          name: account.name,
          pictureUrl: account.pictureUrl,
          provider: account.provider,
          providerId: account.providerId,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        },
        tenant,
      },
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      res.status(409).json({ success: false, error: 'An account with this email already exists' });
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error, message }, 'Registration failed');
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
}
```

- [ ] **Step 3: Register the route**

In the auth routes file, add:
```typescript
import { register } from '../controllers/auth/register.controller';
router.post('/register', register);
```

- [ ] **Step 4: Export from auth controller barrel**

In `packages/server/src/controllers/auth.controller.ts`, add:
```typescript
export * from './auth/register.controller';
```

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/controllers/auth/register.controller.ts packages/server/src/controllers/auth.controller.ts packages/server/src/routes/
git commit -m "feat(auth): add public registration endpoint POST /auth/register"
```

---

### Task 6: Add /register client page

**Files:**
- Create: `packages/client/src/pages/register.tsx`
- Modify: `packages/client/src/pages/login.tsx`
- Modify: `packages/client/src/App.tsx`
- Modify: `packages/client/src/config/routes.ts`
- Modify: `packages/client/src/i18n/locales/en.json`
- Modify: `packages/client/src/i18n/locales/tr.json`
- Modify: `packages/client/src/i18n/locales/de.json`
- Modify: `packages/client/src/i18n/locales/fr.json`
- Modify: `packages/client/src/i18n/locales/it.json`

- [ ] **Step 1: Add REGISTER route constant**

In `packages/client/src/config/routes.ts`, add:
```typescript
REGISTER: '/register',
```

- [ ] **Step 2: Create register page**

Create `packages/client/src/pages/register.tsx` — same glass-card style as login page. Fields: full name, email, password, company name. On submit calls `POST /auth/register`. On success, stores auth and redirects to home. Includes "Already have an account? Sign in" link to `/login`.

Model it closely after the login page (`packages/client/src/pages/login.tsx`) for visual consistency — same background, same glass card styling, same input/button components.

- [ ] **Step 3: Add "Don't have an account?" link to login page**

In `packages/client/src/pages/login.tsx`, add a link below the sign-in button:
```tsx
<Link to={ROUTES.REGISTER} style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
  {t('login.noAccount')}
</Link>
```

- [ ] **Step 4: Add route to App.tsx**

In `packages/client/src/App.tsx`:
```tsx
import { RegisterPage } from './pages/register';
// In Routes:
<Route path={ROUTES.REGISTER} element={<RegisterPage />} />
```

- [ ] **Step 5: Add translations to all 5 locale files**

Add `register` section to all 5 locale files with keys:
- `register.title` — "Create your workspace" / "Arbeitsbereich erstellen" / etc.
- `register.subtitle` — "Set up your organization on Atlas"
- `register.name` — "Full name"
- `register.email` — "Email"
- `register.password` — "Password"
- `register.companyName` — "Company name"
- `register.companyPlaceholder` — "Your company or team name"
- `register.submit` — "Create workspace"
- `register.submitting` — "Creating workspace..."
- `register.hasAccount` — "Already have an account? Sign in"
- `login.noAccount` — "Don't have an account? Register"

All 5 languages: EN, TR, DE, FR, IT.

- [ ] **Step 6: Verify client compiles**

Run: `cd packages/client && npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add packages/client/src/pages/register.tsx packages/client/src/pages/login.tsx packages/client/src/App.tsx packages/client/src/config/routes.ts packages/client/src/i18n/locales/
git commit -m "feat(client): add /register page with translations in 5 languages"
```

---

### Task 7: Update client auth store

**Files:**
- Modify: `packages/client/src/stores/auth-store.ts`

- [ ] **Step 1: Read the current auth store**

Read `packages/client/src/stores/auth-store.ts` to understand the current structure. It uses `accountId` as a key for token maps and has `switchAccount`/`removeAccount` methods.

- [ ] **Step 2: Replace accountId with tenantId in the store**

- Replace token map keys from `accountId` to be keyed by the account id (this is still the unique identifier for the stored session, separate from the tenant concept)
- Remove `accountId` from any auth state that gets decoded from JWT
- Ensure `tenantId` is available if any client code needs it (decoded from JWT)
- The store's account management (multi-account support for different email accounts) can stay — it's about UI session management, not tenant scoping

- [ ] **Step 3: Verify client compiles**

Run: `cd packages/client && npx tsc --noEmit`

Fix any downstream type errors in components that reference `accountId` from the auth store.

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/stores/auth-store.ts
git commit -m "feat(client): update auth store to use tenantId from JWT"
```

---

## Phase 2: App Migrations

Each task migrates one app's service layer + controllers. The pattern is the same for every app:
1. In each service function: replace `accountId` parameter with `tenantId`, update query filters
2. In each controller: replace `req.auth!.accountId` with `req.auth!.tenantId`
3. Verify compilation, commit

### Task 8: Migrate Tasks & Projects app services

**Files:**
- Modify: all files in `packages/server/src/apps/tasks/services/`
- Modify: all files in `packages/server/src/apps/tasks/controllers/`
- Modify: all files in `packages/server/src/apps/projects/services/`
- Modify: all files in `packages/server/src/apps/projects/controllers/`

- [ ] **Step 1: List all service files for Tasks app**

Run: `find packages/server/src/apps/tasks -name "*.ts" | sort`

- [ ] **Step 2: Update Tasks service functions**

In each service file, find every function that takes `accountId: string` and replace with `tenantId: string`. Update all Drizzle queries from `eq(table.accountId, accountId)` to `eq(table.tenantId, tenantId)`. Update all inserts from `accountId` to `tenantId`.

- [ ] **Step 3: Update Tasks controllers**

In each controller file, replace `req.auth!.accountId` with `req.auth!.tenantId` in every handler.

- [ ] **Step 4: List all service files for Projects app**

Run: `find packages/server/src/apps/projects -name "*.ts" | sort`

- [ ] **Step 5: Update Projects service functions**

Same pattern: replace `accountId` → `tenantId` in parameters, queries, and inserts.

- [ ] **Step 6: Update Projects controllers**

Replace `req.auth!.accountId` → `req.auth!.tenantId`.

- [ ] **Step 7: Verify compilation**

Run: `cd packages/server && npx tsc --noEmit 2>&1 | head -30`

Fix any remaining type errors in Tasks/Projects files.

- [ ] **Step 8: Commit**

```bash
git add packages/server/src/apps/tasks/ packages/server/src/apps/projects/
git commit -m "feat(tasks,projects): migrate to tenantId-based scoping"
```

---

### Task 9: Migrate CRM app services

**Files:**
- Modify: all files in `packages/server/src/apps/crm/`

- [ ] **Step 1: List all CRM files**

Run: `find packages/server/src/apps/crm -name "*.ts" | sort`

- [ ] **Step 2: Update all CRM service functions**

Replace `accountId` → `tenantId` in all service function parameters, Drizzle queries, and inserts. CRM has ~15 tables and many service files — be thorough.

- [ ] **Step 3: Update all CRM controllers**

Replace `req.auth!.accountId` → `req.auth!.tenantId` in every controller handler.

- [ ] **Step 4: Update CRM digest and reminder services**

Check `packages/server/src/apps/crm/digest.ts` and any reminder files — these may reference `accountId` for scheduled jobs.

- [ ] **Step 5: Verify compilation**

Run: `cd packages/server && npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/apps/crm/
git commit -m "feat(crm): migrate to tenantId-based scoping"
```

---

### Task 10: Migrate HR app services

**Files:**
- Modify: all files in `packages/server/src/apps/hr/`

- [ ] **Step 1: List all HR files**

Run: `find packages/server/src/apps/hr -name "*.ts" | sort`

- [ ] **Step 2: Update all HR service functions**

Replace `accountId` → `tenantId` in all service files. HR has ~15 tables.

- [ ] **Step 3: Update all HR controllers**

Replace `req.auth!.accountId` → `req.auth!.tenantId`.

- [ ] **Step 4: Verify compilation**

Run: `cd packages/server && npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/apps/hr/
git commit -m "feat(hr): migrate to tenantId-based scoping"
```

---

### Task 11: Migrate Drive, Documents, Tables, Sign, Draw apps

**Files:**
- Modify: all files in `packages/server/src/apps/drive/`
- Modify: all files in `packages/server/src/apps/docs/`
- Modify: all files in `packages/server/src/apps/tables/`
- Modify: all files in `packages/server/src/apps/sign/`
- Modify: all files in `packages/server/src/apps/draw/` (if exists, or drawing-related files)

- [ ] **Step 1: Migrate Drive service + controller**

Replace `accountId` → `tenantId` in all Drive service functions, queries, inserts, and controller handlers.

- [ ] **Step 2: Migrate Documents (Write) service + controller**

Same pattern for docs app.

- [ ] **Step 3: Migrate Tables service + controller**

Same pattern for tables app.

- [ ] **Step 4: Migrate Sign service + controller**

Same pattern. Sign has email-sending services that construct URLs — those stay unchanged (they use CLIENT_PUBLIC_URL, not accountId).

- [ ] **Step 5: Migrate Draw**

Check if there's a dedicated draw app directory or if drawings are handled elsewhere. Replace `accountId` → `tenantId`.

- [ ] **Step 6: Verify compilation**

Run: `cd packages/server && npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/apps/drive/ packages/server/src/apps/docs/ packages/server/src/apps/tables/ packages/server/src/apps/sign/
git commit -m "feat(drive,docs,tables,sign,draw): migrate to tenantId-based scoping"
```

---

### Task 12: Migrate shared services

**Files:**
- Modify: `packages/server/src/services/global-search.service.ts`
- Modify: `packages/server/src/services/custom-field-value.service.ts`
- Modify: `packages/server/src/services/ai.service.ts`
- Modify: any other service files in `packages/server/src/services/` that reference `accountId` for collaborative data

- [ ] **Step 1: Migrate global search**

In `global-search.service.ts`, the UNION ALL query filters each table by `accountId`. Replace all with `tenantId`. The function signature changes from `(query, accountId)` to `(query, tenantId)`.

- [ ] **Step 2: Migrate custom field value service**

Replace `accountId` → `tenantId` in query filters and inserts.

- [ ] **Step 3: Migrate AI service**

If `ai.service.ts` fetches context by `accountId` for collaborative data, replace with `tenantId`.

- [ ] **Step 4: Migrate activity feed and notification queries**

Find where activity feed and notifications are created/queried. Replace `accountId` → `tenantId`.

- [ ] **Step 5: Migrate audit log**

Replace `accountId` → `tenantId` in audit log inserts/queries.

- [ ] **Step 6: Check for any remaining accountId references in collaborative code**

Run: `grep -r "accountId" packages/server/src/ --include="*.ts" -l | grep -v node_modules`

Review each result. If it's a collaborative data context, it needs migration. If it's personal data (email, calendar), leave it.

- [ ] **Step 7: Verify full server compilation**

Run: `cd packages/server && npx tsc --noEmit`

This should now pass with zero errors (except possibly personal-data services which are unchanged).

- [ ] **Step 8: Commit**

```bash
git add packages/server/src/services/
git commit -m "feat(services): migrate shared services to tenantId-based scoping"
```

---

### Task 13: Migrate System app and marketplace

**Files:**
- Modify: `packages/server/src/apps/system/` (if it has accountId references)
- Modify: `packages/server/src/apps/marketplace/` (if it has accountId references)

- [ ] **Step 1: Check System app for accountId**

Run: `grep -r "accountId" packages/server/src/apps/system/ --include="*.ts"`

Replace any collaborative-data references.

- [ ] **Step 2: Check Marketplace app for accountId**

Run: `grep -r "accountId" packages/server/src/apps/marketplace/ --include="*.ts"`

Replace any collaborative-data references.

- [ ] **Step 3: Verify compilation**

Run: `cd packages/server && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/apps/system/ packages/server/src/apps/marketplace/
git commit -m "feat(system,marketplace): migrate to tenantId-based scoping"
```

---

## Phase 3: Client + Final Verification

### Task 14: Update client hooks and API calls

**Files:**
- Modify: `packages/client/src/apps/*/hooks.ts` (any that pass accountId)
- Modify: any client components that reference accountId for collaborative data

- [ ] **Step 1: Search client for accountId references**

Run: `grep -r "accountId" packages/client/src/ --include="*.ts" --include="*.tsx" -l | grep -v node_modules`

- [ ] **Step 2: Update hooks that pass accountId**

For each hooks file that passes `accountId` in API calls for collaborative data, remove it. The server now extracts `tenantId` from the JWT — the client doesn't need to send it.

- [ ] **Step 3: Update any components referencing accountId**

Check for components that display or use `accountId` from auth state for collaborative features. Replace with `tenantId` if needed, or remove if not needed.

- [ ] **Step 4: Verify full client compilation**

Run: `cd packages/client && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/
git commit -m "feat(client): remove accountId from collaborative API calls and hooks"
```

---

### Task 15: Full build verification and final cleanup

**Files:**
- Modify: any remaining files with accountId references

- [ ] **Step 1: Full server build**

Run: `cd packages/server && npm run build`

Must succeed with zero errors.

- [ ] **Step 2: Full client build**

Run: `cd packages/client && npm run build`

Must succeed with zero errors.

- [ ] **Step 3: Search for remaining accountId in collaborative contexts**

Run: `grep -rn "accountId" packages/server/src/ --include="*.ts" | grep -v node_modules | grep -v "// personal"`

Review every remaining reference. It should only appear in:
- Personal data services (email, calendar, contacts, push subscriptions)
- The `accounts` table definition itself
- Auth service (for creating accounts)

If any collaborative reference remains, fix it.

- [ ] **Step 4: Search client for remaining accountId**

Run: `grep -rn "accountId" packages/client/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules`

Same review — only personal-data contexts should remain.

- [ ] **Step 5: Commit any final cleanup**

```bash
git add -A
git commit -m "chore: final accountId cleanup after multi-tenancy migration"
```

- [ ] **Step 6: Push**

```bash
git push origin main
```
