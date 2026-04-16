# Lead → customer conversion UX — design spec

**Date:** 2026-04-15
**Scope:** Small UX improvement to ConvertLeadModal and lead/deal detail pages. No schema changes, no new tables.

---

## Problem

After converting a lead the modal closes silently. The user has no idea a Deal, Contact, and Company were just created — let alone that they can immediately create a Proposal for the new customer from the deal detail page.

---

## 1. Post-conversion success state (ConvertLeadModal)

**Current:** `onSuccess` calls `onClose()` — modal disappears, no feedback.

**Proposed:** On success, instead of closing, switch the modal body to a success state:

```
✓  Lead converted
   Deal: "Acme Corp Q2 Renewal"
   Contact and company created.

   [View deal]   [Create proposal]   [Close]
```

- **View deal** — navigates to `/crm/deals/:dealId` (use react-router `navigate`). Close the modal first.
- **Create proposal** — navigates to the deal detail page AND immediately opens the ProposalEditor pre-filled with `dealId`, `companyId`, `contactId`. Simplest implementation: navigate to the deal page and pass a `?openProposal=1` search param; the deal detail page reads that param on mount and calls `setShowProposalEditor(true)`.
- **Close** — dismisses the modal as today.

The `convertLead` mutation already returns `{ contact, company, deal }` from the server. Store those in local state after `onSuccess` to populate the success screen.

`ConvertLeadModal` holds all state internally, so no prop changes to callers.

---

## 2. Converted lead → deal link (lead detail page)

When `lead.status === 'converted'` and `lead.convertedDealId` is set, show a callout inside the lead detail panel:

```
This lead was converted.
→ View deal  [deal title]
```

- Both `convertedDealId` and `convertedContactId` columns already exist on `crmLeads`.
- The API response for a single lead must include `convertedDealTitle` (join with `crmDeals.title`). Add a one-line join in `getLead` in `lead.service.ts`.
- Render as a `Badge variant="success"` next to the status label, plus a ghost `Button` linking to the deal.

---

## 3. Deal detail → proposals tab (confirmation)

Already works. The deal detail page (`deal-detail-page.tsx:298`) has:

```tsx
<Button variant="ghost" size="sm" onClick={() => setShowProposalEditor(true)}>
  {t('crm.proposals.create')}
</Button>
```

And `ProposalEditor` is opened pre-filled (`deal-detail-page.tsx:448`):

```tsx
prefill={{ dealId: deal.id, companyId: deal.companyId, contactId: deal.contactId }}
```

No changes needed here. The "Create proposal" button from the success state (item 1) simply navigates to this page — the existing UX takes over.

---

## Files to change

| File | Change |
|------|--------|
| `packages/client/src/apps/crm/components/leads-view.tsx` | Add success state to `ConvertLeadModal` |
| `packages/client/src/apps/crm/components/lead-detail-page.tsx` | Show converted callout + deal link |
| `packages/server/src/apps/crm/services/lead.service.ts` | Join `convertedDealTitle` in `getLead` |
| `packages/client/src/apps/crm/components/deal-detail-page.tsx` | Read `?openProposal=1` param on mount |
| All 5 locale files | New keys: `crm.leads.converted`, `crm.leads.viewDeal`, `crm.leads.createProposal`, `crm.leads.convertedCallout` |

---

## Out of scope

- Proposals list view — no change needed; it already shows all proposals, filterable by deal.
- Schema changes — `convertedDealId` and `convertedContactId` already exist.
- No new routes or API endpoints beyond the `convertedDealTitle` join.
