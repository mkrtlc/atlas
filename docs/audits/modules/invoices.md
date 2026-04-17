# Invoices Audit Report

**SIGNED OFF: 2026-04-16**

**Module ID**: `invoices`
**Audit started**: 2026-04-16
**Audit completed**: 2026-04-16
**Sign-off**: 2026-04-16
**Pilot / Full**: _Full_ (12 dimensions)

---

## Pre-flight spot-check

- [x] Shared UI components used (no raw `<button>`, `<input>`, `<select>`, `<textarea>` in `apps/invoices/`)
- [x] Sizes — list view uses `sm` controls, modals use `md`
- [x] CSS variables — hex colors present but all are chart/template accent tokens (dashboard, template preview, manifest color), not styling hardcodes
- [x] localStorage usage — only `atlasmail_token` (auth) + `STORAGE_KEY` for PDF split pane width (permitted ephemera per memory policy)
- [x] Registered in both `client/apps/index.ts` and `server/apps/index.ts`
- [x] Query keys namespaced under `queryKeys.invoices.*`
- [x] Global search UNION includes `invoices`

---

## Workflow map

### User actions
- Create / edit / delete / duplicate invoice (`invoice-builder-modal`, `invoice-detail-page`)
- Add/remove/reorder line items inline (`invoice-line-items-table`)
- Import PDF → prefill builder (`pdf-import-modal`)
- Import time entries → line items (`import-time-entries-modal`)
- Send invoice email / resend reminder (`send-invoice-modal`)
- Record payment / edit / delete payment (`record-payment-modal`, `invoice-payments-list`)
- Waive amount, mark paid, generate PDF
- Recurring: create / edit / pause / resume / run-now / delete (`recurring-invoice-modal`, `recurring-invoices-list`)
- Settings — prefix, currency, tax, e-Fatura config (`invoice-settings-panel`)
- Template — choose classic/modern/compact, accent color, logo (`invoice-templates-panel`)
- e-Fatura — generate, view XML, preview, PDF
- Portal (public, token-scoped) — list + view single invoice

### Files
- **Client**: `packages/client/src/apps/invoices/`
  - `page.tsx`, `manifest.ts`, `hooks.ts`, `hooks/use-invoice-detail-split.ts`
  - `components/` — invoices-dashboard, invoices-list-view, invoices-sidebar, invoice-detail-page, invoice-detail-header, invoice-meta-block, invoice-line-items-table, invoice-payments-list, invoice-pdf-viewer, invoice-settings-panel, invoice-templates-panel, send-invoice-modal, record-payment-modal, recurring-invoice-modal, recurring-invoices-list, import-time-entries-modal
- **Server**: `packages/server/src/apps/invoices/`
  - `routes.ts`, `controller.ts`, `manifest.ts`
  - `controllers/` — invoice, line-item, payment, recurring-invoice, dashboard, pdf, efatura, portal, settings, seed
  - `services/` — invoice, line-item, payment, recurring-invoice, dashboard, pdf, efatura, invoice-email, settings, seed
  - `recurring-scheduler.ts`, `reminder-scheduler.ts`, `email-templates.ts`
  - `templates/` — classic.tsx, modern.tsx, compact.tsx, index.ts, types.ts, utils.ts

### API endpoints
38 routes. Public (2): `/portal/:token/list`, `/portal/:token/:invoiceId`. Authenticated (36): settings, dashboard, recurring CRUD + pause/resume/run, invoice CRUD + send/email/paid/waive/duplicate/pdf, line items CRUD, payments CRUD, e-Fatura generate/xml/preview/pdf, seed.

### DB tables
| Table | `updatedAt` | `isArchived` | Concurrency wired |
|-------|-------------|--------------|-------------------|
| `invoices` | yes | yes | yes (PATCH `/:id`) |
| `invoice_line_items` | no (createdAt only) | no | n/a (no `updatedAt`) |
| `invoice_payments` | yes | no | **no** (PATCH `/payments/:paymentId`) |
| `recurring_invoices` | yes | no | yes (PATCH `/recurring/:id`) |
| `recurring_invoice_line_items` | no | no | n/a |
| `invoice_settings` | no | no | n/a |

---

## Retro-scan against platform patterns

| Pattern | Result | Evidence |
|---------|--------|----------|
| **P-2** hard-delete of user data | **Conditional clean** | `invoices` + `recurring_invoices` both soft-delete. `replaceLineItems` at `services/line-item.service.ts:94` hard-deletes child line items on bulk replace — acceptable per P-2 exception: "line items inside an invoice are configuration of a parent record that may itself soft-delete." Payments hard-delete is standard (audit log expected separately). |
| **P-3** missing `withConcurrencyCheck` | **1 hit** | `routes.ts:66` PATCH `/payments/:paymentId` unwrapped; `invoice_payments` has `updatedAt`. Other PATCH routes correctly wrapped. |
| **P-4** queries without `isError` fallback | **Confirmed** | 7 components consume `isLoading` (15 occurrences); **zero** `isError` or `QueryErrorState` imports in `apps/invoices/`. Same gap as HRM and Sign before retro-fix. |

---

## Findings

| ID | Dimension | Severity | File:line | Evidence | Proposed fix | Status |
|----|-----------|----------|-----------|----------|--------------|--------|
| I2-1 | 2. Empty/loading/error | fix-before-ship | `page.tsx`, `invoices-dashboard.tsx`, `invoice-detail-page.tsx`, `invoice-payments-list.tsx`, `invoice-settings-panel.tsx`, `invoice-templates-panel.tsx`, `recurring-invoices-list.tsx` | 6 view-level components consumed `isLoading` without `isError`. | Wired `isError` + `refetch` from the primary queries and rendered `<QueryErrorState onRetry={refetch}/>` in each. `import-time-entries-modal` excluded — its `isLoading` is a mutation `isPending`, covered by P-1. | fixed |
| I4-1 | 4. Auth & permission scoping | fix-before-ship | `services/pdf.service.ts:24,26` | `db.select().from(crmCompanies/crmContacts)` lacked `tenantId` filter. | Added `and(eq(crmCompanies.tenantId, tenantId))` / `and(eq(crmContacts.tenantId, tenantId))` to both reads. | fixed |
| I3-1 | 3. Input & data correctness | nice-to-have | `services/line-item.service.ts:94` | Hard-delete of child line items on bulk replace. Invoice parent still soft-deletes. | Document as intentional (configuration of parent). Alternatively move to an audit table if line-item history matters. Keep current behaviour until a concrete need. | open |
| I5-1 | 5. Optimistic concurrency | nice-to-have | `routes.ts:66` PATCH `/payments/:paymentId` | `invoice_payments` has `updatedAt`; PATCH route unwrapped. Payments are edited by finance admin role — low collision risk. Same class as Sign S5-1. | Wrap route with `withConcurrencyCheck(invoicePayments)`; forward `updatedAt` from `useUpdatePayment`. | open |
| I7-1 | 7. Cross-app linking | nice-to-have | `invoice-detail-page.tsx` | No `SmartButtonBar` on detail page. Invoices naturally link to CRM company/contact (already stored) and could expose cross-app badges. | Add `<SmartButtonBar appId="invoices" recordId={invoice.id}/>` to detail header. Consider registering `recordLinks` to CRM company on create. | open |

### Rejected / verified-false findings (subagent sweep)

| Claim | Verdict | Why |
|-------|---------|-----|
| I8-1 "negative payment amounts not validated client-side" | **False positive** | `record-payment-modal.tsx:119` has `amountIsValid = !Number.isNaN(parsedAmount) && parsedAmount > 0` gating submit. Missing `min="0"` attribute is cosmetic only. |
| i18n "42 keys per locale" | **Miscount** | Subagent counted top-level only. Actual leaf-key count per locale: **340 each** (en/tr/de/fr/it). Parity clean. |
| Dim 10 assumed passed silently — spot-checked | **Confirmed pass** | `page.tsx:2,22` uses `useSearchParams`; filters + detail view driven from URL. |

### Deferred / n/a

| Dimension | Reason |
|-----------|--------|
| 1. Golden-path workflow | Deferred to browser spot-check in later batch pass. Code-read: create → line items → send → record payment → mark paid is fully wired. |
| 9. Keyboard & focus | All modals use shared `<Modal>` (Radix Dialog) — Esc + focus-trap inherited. Deferred to browser spot-check. |
| 12. Performance | Per operating defaults. No obvious N+1 in `listInvoices`; recurring-scheduler runs every minute but only processes due rows. |

---

## Verification (post-fix)

| Dimension | Result | Evidence / notes |
|-----------|--------|------------------|
| 1. Golden-path workflow | deferred | Browser spot-check |
| 2. Empty/loading/error states | pass (code-read) | I2-1 fixed — `QueryErrorState` wired on 6 views |
| 3. Input & data correctness | pass (with note) | I3-1 documented exception; validations on money fields in place |
| 4. Auth & permission scoping | pass | I4-1 fixed — tenantId filter added to CRM reads in PDF service |
| 5. Optimistic concurrency | partial | I5-1 deferred as nice-to-have; main invoice + recurring paths wired |
| 6. i18n completeness | pass | All 5 locales have 340 leaf keys under `invoices.*` — parity clean |
| 7. Cross-app linking | fail (minor) | I7-1 deferred |
| 8. Destructive action safety | pass | `ConfirmDialog` used in 3 components; no `window.confirm` |
| 9. Keyboard & focus | deferred | Shared `<Modal>` covers; browser check deferred |
| 10. Navigation & deep linking | pass | `useSearchParams` drives list + detail |
| 11. Search & filters | pass | Global search UNION confirmed |
| 12. Performance smoke test | deferred | Per operating defaults |

---

## Propagation (Phase G)

- **Local**: I3-1 (line-item replace hard-deletes child rows — intentional for child-config of soft-deletable parent), I7-1 (SmartButtonBar nice-to-have).
- **Pattern** (already in `platform-findings.md`):
  - **P-4** confirmed again (HRM + Sign + Invoices — now 3 modules). Promote to `best-practices.md` next.
  - **P-3** confirmed again (CRM + HRM + Sign + Invoices — 4 modules). Already a pattern.
- **Platform**: no new shared work. `QueryErrorState` was the right primitive; reused as-is.
- **New pattern hypothesis** — **P-5** cross-app reads without tenant scope. Evidence: `invoices/services/pdf.service.ts:24,26` read `crmCompanies`/`crmContacts` without tenant filter. Worth grepping other apps that cross-read CRM (Sign, Calendar, Work) — fix-before-ship when hit.
- **Deferred epic**: URL-driven list state — shared with HRM H10-1, Sign S10-1. Invoices already passes dim 10 (uses `useSearchParams`), so scope is narrower than originally thought.

---

## Sign-off

- [x] All `fix-before-ship` findings closed (I2-1, I4-1 fixed)
- [ ] Golden path walked end-to-end with fresh account (browser spot-check deferred)
- [x] Nice-to-have findings logged with status
- [x] Propagation complete (Phase G)
- [x] Module report marked SIGNED OFF at top

Signed off by: gorkem.cetin@gmail.com
Date: 2026-04-16
