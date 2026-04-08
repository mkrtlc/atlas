# Multi-Tenancy Migration Design

## Context

Atlas is an all-in-one business platform with modular apps (CRM, HR, Tasks, Projects, Drive, Docs, Sign, Tables, Draw, System). It currently scopes collaborative data by `accountId`, which is tied to a user's email account. This design migrates to `tenantId`-based scoping to support SaaS multi-tenancy.

No production deployment exists. No data migration or backward compatibility required.

## Constraints

- One user belongs to exactly one tenant (no multi-tenant-per-user)
- Incremental delivery: one app at a time, system stays working throughout
- Billing/limits and subdomain routing are out of scope (future phases)

## Data Model

### Two categories of tables

**Collaborative tables** (shared within an organization) get `tenantId` replacing `accountId`:

- CRM: `crmLeads`, `crmDeals`, `crmContacts`, `crmCompanies`, `crmActivities`, `crmActivityTypes`, `crmDealStages`, `crmWorkflows`, `crmTeams`, `crmTeamMembers`, `crmPermissions`, `crmNotes`, `crmSavedViews`, `crmLeadForms`
- HR: `employees`, `departments`, `leaveBalances`, `onboardingTasks`, `onboardingTemplates`, `employeeDocuments`, `timeOffRequests`, `hrLeaveTypes`, `hrLeavePolicies`, `hrLeavePolicyAssignments`, `hrHolidayCalendars`, `hrHolidays`, `hrLeaveApplications`, `hrAttendance`, `hrLifecycleEvents`
- Tasks: `tasks`, `taskProjects`, `subtasks`, `taskActivities`, `taskTemplates`, `taskComments`, `taskAttachments`, `taskDependencies`
- Projects: `projectClients`, `projectProjects`, `projectMembers`, `projectTimeEntries`, `projectInvoices`, `projectInvoiceLineItems`, `projectSettings`
- Drive: `driveItems`, `driveItemVersions`, `driveShareLinks`, `driveItemShares`, `driveActivityLog`, `driveComments`
- Documents: `documents`, `documentVersions`, `documentComments`, `documentLinks`
- Tables: `spreadsheets`, `tableRowComments`
- Sign: `signatureDocuments`, `signatureFields`, `signingTokens`, `signAuditLog`, `signTemplates`
- Draw: `drawings`
- Shared: `customFieldDefinitions`, `customFieldValues`, `recordLinks`, `activityFeed`, `notifications`, `auditLog`, `presenceHeartbeats`

Each collaborative table:
- Drops `accountId` column
- Adds `tenantId UUID NOT NULL REFERENCES tenants(id)`
- Keeps `userId` for record ownership/created-by within the tenant
- Gets an index on `tenantId`

**Personal tables** (per-user, not shared) keep `accountId` as-is:

- `threads`, `emails`, `attachments`, `contacts` (Gmail contacts)
- `categoryRules`, `emailTracking`, `trackingEvents`
- `calendars`, `calendarEvents`
- `userSettings`
- `passwordResetTokens`
- `pushSubscriptions`
- `crmEmailSync`, `crmGoogleTokens` (tied to user's Google account)

**System-wide tables** (no tenant or account scoping):

- `users`, `accounts` (auth infrastructure)
- `tenants`, `tenantMembers`, `tenantInvitations`, `tenantApps` (platform layer)
- `appPermissions` (already uses tenantId)
- `marketplaceApps` (global catalog)
- `systemSettings` (global config)

### Standard collaborative table columns

```
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
tenantId        UUID NOT NULL REFERENCES tenants(id)
userId          UUID NOT NULL          -- who created/owns this record
isArchived      BOOLEAN NOT NULL DEFAULT false
sortOrder       INTEGER NOT NULL DEFAULT 0
createdAt       TIMESTAMPTZ NOT NULL DEFAULT now()
updatedAt       TIMESTAMPTZ NOT NULL DEFAULT now()
```

## Authentication & Registration

### JWT payload

```typescript
interface AuthPayload {
  userId: string;
  tenantId: string;    // REQUIRED, never optional
  email: string;
  isSuperAdmin?: boolean;
  tenantRole?: string; // owner | admin | member
}
```

`accountId` is removed from the JWT. Personal data routes that need it look up the user's account separately.

### Login flow

1. User submits email + password to `POST /auth/login`
2. Server validates credentials
3. Server looks up `tenantMembers` to find the user's tenantId (exactly one match)
4. JWT issued with `tenantId`
5. Client stores JWT and redirects to home

### New registration flow

`POST /auth/register` endpoint:
1. Accepts: `name`, `email`, `password`, `companyName`
2. Validates password strength, checks email uniqueness
3. Creates user + account
4. Creates tenant from `companyName`
5. Adds user as tenant owner in `tenantMembers`
6. Returns JWT with `tenantId`

`/register` client page:
- Glass-card style matching login page
- Fields: full name, email, password, company name
- Login page links to register ("Don't have an account?")
- Register page links to login ("Already have an account?")
- Translations in all 5 languages (EN, TR, DE, FR, IT)

### Setup page

`/setup` stays for first-run self-hosted use. It works only when zero users exist. Not part of the SaaS registration flow.

## Service Layer

### Pattern change

Every collaborative service function replaces `accountId` with `tenantId`:

Before:
```typescript
export async function listLeads(userId: string, accountId: string) {
  return db.select().from(crmLeads)
    .where(and(eq(crmLeads.accountId, accountId), eq(crmLeads.isArchived, false)));
}
```

After:
```typescript
export async function listLeads(tenantId: string) {
  return db.select().from(crmLeads)
    .where(and(eq(crmLeads.tenantId, tenantId), eq(crmLeads.isArchived, false)));
}
```

Rules:
- `tenantId` is the scoping column for all collaborative queries (SELECT, INSERT, UPDATE)
- `userId` is kept for ownership (created-by, assigned-to) but never for data scoping
- Controllers extract `req.auth!.tenantId` instead of `req.auth!.accountId`
- Personal data services (email, calendar) keep using `accountId` unchanged

### Controller pattern

```typescript
export async function listLeads(req: Request, res: Response) {
  try {
    const data = await leadService.listLeads(req.auth!.tenantId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to list leads');
    res.status(500).json({ success: false, error: 'Failed to list leads' });
  }
}
```

### Migration order (by app)

1. **Tasks & Projects** — already have partial tenantId support, easiest starting point
2. **CRM** — leads, deals, contacts, companies, pipelines, activities
3. **HR** — employees, departments, leave, attendance
4. **Drive** — drive items
5. **Documents (Write)** — documents
6. **Tables** — spreadsheets
7. **Sign** — sign documents, signers, audit log, templates
8. **Draw** — drawings
9. **System** — admin-only, light touch
10. **Shared services** — global search, activity feed, notifications, custom fields, record links

## Client-Side Changes

### Auth store

- Remove `accountId` from stored auth state
- `tenantId` decoded from JWT on login
- No tenant switching UI (one user = one tenant)

### API hooks

- Remove any explicit `accountId` parameters in API calls
- Server extracts `tenantId` from JWT — client never sends it
- Existing hooks continue to work; they just stop passing `accountId`

### New register page

- `/register` route added to App.tsx
- Same visual style as login (glass card, mountain background)
- Linked from login page and vice versa

### No other UI changes

Since tenantId is server-side via JWT, all existing app pages, sidebars, widgets, and settings work as-is. The data they see is scoped differently on the backend.

## Database Schema

No migration scripts for existing data. Both `schema.ts` and `migrate.ts` are rewritten:
- `schema.ts`: Replace `accountId` with `tenantId` in all collaborative table definitions
- `migrate.ts`: Update all `CREATE TABLE IF NOT EXISTS` statements to use `tenant_id` instead of `account_id`, add FK references and indexes

## Out of Scope

- Per-tenant billing, feature limits, storage quotas (future phase)
- Subdomain routing / `tenant.atlas.com` (future phase)
- Multi-tenant-per-user / tenant switching (not planned)
- Changes to personal data tables (email, calendar)
