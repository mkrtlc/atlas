# Invoice Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-page invoice detail view with a resizable PDF-preview / editable-details split, behind `?view=invoice-detail&invoiceId=<uuid>`, matching the CRM deal-detail pattern — and retire the existing slide-over panel.

**Architecture:** Five new components composed into a single page that slots into the existing Invoices `<ContentArea>`. URL-state drives navigation. The server needs no changes: the existing `PATCH /invoices/:id` already accepts `lineItems: Array<...>` and handles optimistic concurrency; the existing `GET /invoices/:id/pdf?inline=true` serves the blob. Inline edits call `useUpdateInvoice` with a 1.5s debounce before the PDF iframe re-fetches.

**Tech Stack:** React + TypeScript, TanStack Query, react-router-dom `useSearchParams`, native `<iframe>` for PDF. No new dependencies.

---

## Spec reference

`docs/superpowers/specs/2026-04-14-invoice-detail-page-design.md`

Key decisions locked from brainstorming:
- **Layout:** PDF 60% | Details 40%, draggable within `[50%, 70%]` PDF width, split persisted in `localStorage['atlas_invoice_detail_split']`.
- **Header:** adaptive action buttons by status; `⋯ More` menu always holds the full action set.
- **Editing:** full inline edit, blur saves, 1.5s debounce before PDF refresh.
- **Concurrency:** every mutation carries `updatedAt` via `If-Unmodified-Since`; global `ConflictDialog` handles 409s.
- **Retire:** `invoice-detail-panel.tsx`, `invoice-preview.tsx` — their jobs move into the new components.

---

## File structure

### New files

- `packages/client/src/apps/invoices/components/invoice-detail-page.tsx` — page shell: fetch the invoice, compose PDF viewer + details pane, own the draggable split.
- `packages/client/src/apps/invoices/components/invoice-pdf-viewer.tsx` — iframe + blob lifecycle + 1.5s debounce refresh keyed on `invoice.updatedAt`.
- `packages/client/src/apps/invoices/components/invoice-meta-block.tsx` — 2-column inline-editable metadata grid (invoice #, dates, company/contact, currency, deal).
- `packages/client/src/apps/invoices/components/invoice-line-items-table.tsx` — always-editable table: description/qty/unit-price/tax-rate/row-total + add/delete/drag-reorder.
- `packages/client/src/apps/invoices/components/invoice-detail-header.tsx` — breadcrumb + status chip + adaptive action buttons + More menu.
- `packages/client/src/apps/invoices/hooks/use-invoice-detail-split.ts` — small hook that reads/writes the split-ratio to `localStorage`.
- `packages/client/src/apps/invoices/hooks/use-debounced-invoice-updated-at.ts` — 1.5s debounce of `updatedAt` for PDF refresh keying.

### Modified files

- `packages/client/src/apps/invoices/page.tsx` — when `?view=invoice-detail&invoiceId=...`, render the new page instead of list/dashboard.
- `packages/client/src/apps/invoices/components/invoices-list-view.tsx` — row click navigates to `?view=invoice-detail&invoiceId=<id>` instead of setting `selectedInvoiceId`.
- `packages/client/src/apps/invoices/components/invoices-sidebar.tsx` — add `isActive` handling for the new `invoice-detail` view (keeps "Invoices" item highlighted when viewing a single invoice).
- `packages/client/src/i18n/locales/{en,tr,de,fr,it}.json` — add `invoices.detail.*` keys (12 new leaves).

### Deleted files

- `packages/client/src/apps/invoices/components/invoice-detail-panel.tsx` — responsibilities absorbed by `invoice-detail-header.tsx` + `invoice-meta-block.tsx` + the existing `<InvoicePaymentsList>` + `<StatusTimeline>`.
- `packages/client/src/apps/invoices/components/invoice-preview.tsx` — superseded by `invoice-pdf-viewer.tsx`.

### Touched but not restructured

- `packages/client/src/apps/invoices/hooks.ts` — reuse existing `useInvoice(id)`, `useUpdateInvoice()`, `useSendInvoice()`, `useEmailInvoice()`, `useMarkInvoicePaid()`, `useWaiveInvoice()`, `useDuplicateInvoice()`, `useDeleteInvoice()`, `useInvoicePayments(id)`. No new hooks needed in this file.

---

## Reference code patterns (skim these before starting)

- **URL-state navigation + detail page composition** — `packages/client/src/apps/crm/components/deal-detail-page.tsx` + `packages/client/src/apps/crm/components/crm-content.tsx` lines 115-125.
- **ContentArea headerSlot** — `packages/client/src/components/ui/content-area.tsx` (the `headerSlot` prop replaces the default 44px header contents).
- **Optimistic concurrency (`updatedAt` + `ifUnmodifiedSince`)** — `CLAUDE.md` section "Optimistic concurrency (mandatory for every new entity)" + `packages/server/src/middleware/concurrency-check.ts`.
- **Existing PDF blob fetch** — `packages/client/src/apps/invoices/components/invoice-preview.tsx` (the file to delete — copy its blob-lifecycle code).
- **Existing line-items shape on the wire** — `useUpdateInvoice` in `packages/client/src/apps/invoices/hooks.ts:115`: `lineItems: Array<{ description: string; quantity: number; unitPrice: number; taxRate?: number }>`.

---

## Task 1: Split-ratio localStorage hook

**Files:**
- Create: `packages/client/src/apps/invoices/hooks/use-invoice-detail-split.ts`

- [ ] **Step 1: Create the hook file**

Write `packages/client/src/apps/invoices/hooks/use-invoice-detail-split.ts`:

```ts
import { useCallback, useState } from 'react';

const STORAGE_KEY = 'atlas_invoice_detail_split';
const DEFAULT_PDF_PERCENT = 60;
const MIN_PDF_PERCENT = 50;
const MAX_PDF_PERCENT = 70;

function clamp(value: number): number {
  return Math.min(MAX_PDF_PERCENT, Math.max(MIN_PDF_PERCENT, value));
}

function read(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULT_PDF_PERCENT;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_PDF_PERCENT;
    return clamp(n);
  } catch {
    return DEFAULT_PDF_PERCENT;
  }
}

/**
 * Returns the PDF pane's percentage of the horizontal split (50-70).
 * The details pane's width is (100 - pdfPercent).
 */
export function useInvoiceDetailSplit() {
  const [pdfPercent, setPdfPercentState] = useState<number>(() => read());

  const setPdfPercent = useCallback((next: number) => {
    const clamped = clamp(next);
    setPdfPercentState(clamped);
    try { localStorage.setItem(STORAGE_KEY, String(clamped)); } catch { /* ignore */ }
  }, []);

  return { pdfPercent, setPdfPercent, MIN_PDF_PERCENT, MAX_PDF_PERCENT };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/gorkemcetin/atlasmail/packages/client && npx tsc --noEmit 2>&1 | tail -5`
Expected: PASS (hook is pure, only React imported).

- [ ] **Step 3: Commit**

```bash
cd /Users/gorkemcetin/atlasmail
git add packages/client/src/apps/invoices/hooks/use-invoice-detail-split.ts
git commit -m "feat(invoices): split-ratio hook for detail-page PDF/details panes"
git push origin main
```

---

## Task 2: Debounced updatedAt hook

**Files:**
- Create: `packages/client/src/apps/invoices/hooks/use-debounced-invoice-updated-at.ts`

The PDF viewer re-fetches when the blob key changes. We key it on a debounced version of `invoice.updatedAt` so rapid edits don't flood the server.

- [ ] **Step 1: Create the hook**

Write `packages/client/src/apps/invoices/hooks/use-debounced-invoice-updated-at.ts`:

```ts
import { useEffect, useState } from 'react';

const DEFAULT_DEBOUNCE_MS = 1500;

/**
 * Debounce an invoice's `updatedAt` timestamp by `ms` milliseconds. Consumers
 * key the PDF iframe blob fetch on the debounced value so that bursty edits
 * (e.g. typing in a notes field) trigger at most one PDF regeneration.
 */
export function useDebouncedInvoiceUpdatedAt(
  updatedAt: string | undefined,
  ms: number = DEFAULT_DEBOUNCE_MS,
): string | undefined {
  const [debounced, setDebounced] = useState<string | undefined>(updatedAt);

  useEffect(() => {
    if (updatedAt === debounced) return;
    const handle = window.setTimeout(() => setDebounced(updatedAt), ms);
    return () => window.clearTimeout(handle);
  }, [updatedAt, ms, debounced]);

  return debounced;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/gorkemcetin/atlasmail/packages/client && npx tsc --noEmit 2>&1 | tail -5`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/gorkemcetin/atlasmail
git add packages/client/src/apps/invoices/hooks/use-debounced-invoice-updated-at.ts
git commit -m "feat(invoices): debounce updatedAt for PDF refresh keying"
git push origin main
```

---

## Task 3: InvoicePdfViewer component

**Files:**
- Create: `packages/client/src/apps/invoices/components/invoice-pdf-viewer.tsx`

- [ ] **Step 1: Create the component**

Write `packages/client/src/apps/invoices/components/invoice-pdf-viewer.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api-client';
import { useDebouncedInvoiceUpdatedAt } from '../hooks/use-debounced-invoice-updated-at';

interface Props {
  invoiceId: string;
  /** Current `updatedAt` from the TanStack Query cache. Drives re-fetch. */
  updatedAt?: string;
}

export function InvoicePdfViewer({ invoiceId, updatedAt }: Props) {
  const { t } = useTranslation();
  const debouncedUpdatedAt = useDebouncedInvoiceUpdatedAt(updatedAt);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    async function load() {
      try {
        const response = await api.get(`/invoices/${invoiceId}/pdf?inline=true`, {
          responseType: 'blob',
        });
        if (cancelled) return;
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = url;
        setPdfUrl(url);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // debouncedUpdatedAt changes whenever the user's edits settle, invalidating
    // the blob. invoiceId changes on navigation to a different invoice.
  }, [invoiceId, debouncedUpdatedAt]);

  useEffect(() => () => {
    if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
  }, []);

  if (loading && !pdfUrl) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
        <Skeleton style={{ width: '80%', height: '80%' }} />
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--spacing-xl)', color: 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-sm)',
      }}>
        {t('invoices.detail.pdfLoadFailed')}
      </div>
    );
  }

  return (
    <iframe
      src={pdfUrl}
      title={t('invoices.detail.pdfIframeTitle')}
      style={{ flex: 1, width: '100%', height: '100%', border: 'none', background: 'var(--color-bg-tertiary)' }}
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/gorkemcetin/atlasmail/packages/client && npx tsc --noEmit 2>&1 | tail -5`
Expected: PASS. (i18n keys are used before being added; i18next just returns the raw key at runtime if missing — non-fatal for typecheck.)

- [ ] **Step 3: Commit**

```bash
cd /Users/gorkemcetin/atlasmail
git add packages/client/src/apps/invoices/components/invoice-pdf-viewer.tsx
git commit -m "feat(invoices): InvoicePdfViewer with debounced refresh"
git push origin main
```

---

## Task 4: i18n keys

**Files:**
- Modify: `packages/client/src/i18n/locales/{en,tr,de,fr,it}.json`

All 12 `invoices.detail.*` keys this plan needs.

- [ ] **Step 1: Add keys to all 5 locales via Python script**

Run:

```bash
cd /Users/gorkemcetin/atlasmail
python3 <<'PY'
import json
translations = {
  'en': {
    'pdfIframeTitle': 'Invoice preview',
    'pdfLoadFailed': 'Couldn\u2019t load preview',
    'breadcrumbInvoices': 'Invoices',
    'notFound': 'This invoice doesn\u2019t exist.',
    'backToList': 'Back to invoices',
    'addLine': '+ Add line',
    'deleteLine': 'Delete line',
    'reorderLine': 'Reorder line',
    'moreActions': 'More actions',
    'actionSend': 'Send',
    'actionResend': 'Resend',
    'actionSendReminder': 'Send reminder',
    'actionRecordPayment': 'Record payment',
    'actionDownloadPdf': 'Download PDF',
    'actionDuplicate': 'Duplicate',
    'actionMarkPaid': 'Mark paid',
    'actionWaive': 'Waive',
    'actionDelete': 'Delete',
    'actionShareLink': 'Share link',
    'actionImportTime': 'Import time entries',
    'metaInvoiceNumber': 'Invoice number',
    'metaStatus': 'Status',
    'metaIssueDate': 'Issue date',
    'metaDueDate': 'Due date',
    'metaCompany': 'Company',
    'metaContact': 'Contact',
    'metaCurrency': 'Currency',
    'metaDeal': 'Deal',
    'colDescription': 'Description',
    'colQuantity': 'Qty',
    'colUnitPrice': 'Unit price',
    'colTaxRate': 'Tax %',
    'colRowTotal': 'Total',
    'sectionLineItems': 'Line items',
    'sectionTotals': 'Totals',
    'sectionNotes': 'Notes',
    'sectionPayments': 'Payments',
    'sectionActivity': 'Activity',
  },
  'tr': {
    'pdfIframeTitle': 'Fatura \u00f6nizlemesi',
    'pdfLoadFailed': '\u00d6nizleme y\u00fcklenemedi',
    'breadcrumbInvoices': 'Faturalar',
    'notFound': 'Bu fatura mevcut de\u011fil.',
    'backToList': 'Faturalara d\u00f6n',
    'addLine': '+ Sat\u0131r ekle',
    'deleteLine': 'Sat\u0131r\u0131 sil',
    'reorderLine': 'Sat\u0131r\u0131 yeniden s\u0131rala',
    'moreActions': 'Daha fazla i\u015flem',
    'actionSend': 'G\u00f6nder',
    'actionResend': 'Yeniden g\u00f6nder',
    'actionSendReminder': 'Hat\u0131rlatma g\u00f6nder',
    'actionRecordPayment': '\u00d6deme kaydet',
    'actionDownloadPdf': 'PDF indir',
    'actionDuplicate': 'Kopyala',
    'actionMarkPaid': '\u00d6denmi\u015f i\u015faretle',
    'actionWaive': 'Fer\u00e2gat et',
    'actionDelete': 'Sil',
    'actionShareLink': 'Ba\u011flant\u0131 payla\u015f',
    'actionImportTime': 'Zaman kay\u0131tlar\u0131n\u0131 i\u00e7e aktar',
    'metaInvoiceNumber': 'Fatura numaras\u0131',
    'metaStatus': 'Durum',
    'metaIssueDate': 'D\u00fczenleme tarihi',
    'metaDueDate': 'Son \u00f6deme tarihi',
    'metaCompany': '\u015eirket',
    'metaContact': 'Ki\u015fi',
    'metaCurrency': 'Para birimi',
    'metaDeal': 'F\u0131rsat',
    'colDescription': 'A\u00e7\u0131klama',
    'colQuantity': 'Adet',
    'colUnitPrice': 'Birim fiyat',
    'colTaxRate': 'KDV %',
    'colRowTotal': 'Toplam',
    'sectionLineItems': 'Sat\u0131rlar',
    'sectionTotals': 'Toplamlar',
    'sectionNotes': 'Notlar',
    'sectionPayments': '\u00d6demeler',
    'sectionActivity': 'Etkinlik',
  },
  'de': {
    'pdfIframeTitle': 'Rechnungsvorschau',
    'pdfLoadFailed': 'Vorschau konnte nicht geladen werden',
    'breadcrumbInvoices': 'Rechnungen',
    'notFound': 'Diese Rechnung existiert nicht.',
    'backToList': 'Zur\u00fcck zu Rechnungen',
    'addLine': '+ Zeile hinzuf\u00fcgen',
    'deleteLine': 'Zeile l\u00f6schen',
    'reorderLine': 'Zeile umsortieren',
    'moreActions': 'Weitere Aktionen',
    'actionSend': 'Senden',
    'actionResend': 'Erneut senden',
    'actionSendReminder': 'Erinnerung senden',
    'actionRecordPayment': 'Zahlung erfassen',
    'actionDownloadPdf': 'PDF herunterladen',
    'actionDuplicate': 'Duplizieren',
    'actionMarkPaid': 'Als bezahlt markieren',
    'actionWaive': 'Erlassen',
    'actionDelete': 'L\u00f6schen',
    'actionShareLink': 'Link teilen',
    'actionImportTime': 'Zeiteintr\u00e4ge importieren',
    'metaInvoiceNumber': 'Rechnungsnummer',
    'metaStatus': 'Status',
    'metaIssueDate': 'Ausstellungsdatum',
    'metaDueDate': 'F\u00e4lligkeitsdatum',
    'metaCompany': 'Unternehmen',
    'metaContact': 'Kontakt',
    'metaCurrency': 'W\u00e4hrung',
    'metaDeal': 'Gesch\u00e4ft',
    'colDescription': 'Beschreibung',
    'colQuantity': 'Menge',
    'colUnitPrice': 'Einzelpreis',
    'colTaxRate': 'MwSt. %',
    'colRowTotal': 'Summe',
    'sectionLineItems': 'Positionen',
    'sectionTotals': 'Summen',
    'sectionNotes': 'Notizen',
    'sectionPayments': 'Zahlungen',
    'sectionActivity': 'Aktivit\u00e4t',
  },
  'fr': {
    'pdfIframeTitle': 'Aper\u00e7u de la facture',
    'pdfLoadFailed': 'Impossible de charger l\u2019aper\u00e7u',
    'breadcrumbInvoices': 'Factures',
    'notFound': 'Cette facture n\u2019existe pas.',
    'backToList': 'Retour aux factures',
    'addLine': '+ Ajouter une ligne',
    'deleteLine': 'Supprimer la ligne',
    'reorderLine': 'R\u00e9ordonner la ligne',
    'moreActions': 'Plus d\u2019actions',
    'actionSend': 'Envoyer',
    'actionResend': 'Renvoyer',
    'actionSendReminder': 'Envoyer un rappel',
    'actionRecordPayment': 'Enregistrer un paiement',
    'actionDownloadPdf': 'T\u00e9l\u00e9charger PDF',
    'actionDuplicate': 'Dupliquer',
    'actionMarkPaid': 'Marquer comme pay\u00e9e',
    'actionWaive': 'Annuler',
    'actionDelete': 'Supprimer',
    'actionShareLink': 'Partager le lien',
    'actionImportTime': 'Importer les entr\u00e9es de temps',
    'metaInvoiceNumber': 'Num\u00e9ro de facture',
    'metaStatus': 'Statut',
    'metaIssueDate': 'Date d\u2019\u00e9mission',
    'metaDueDate': 'Date d\u2019\u00e9ch\u00e9ance',
    'metaCompany': 'Entreprise',
    'metaContact': 'Contact',
    'metaCurrency': 'Devise',
    'metaDeal': 'Affaire',
    'colDescription': 'Description',
    'colQuantity': 'Qt\u00e9',
    'colUnitPrice': 'Prix unitaire',
    'colTaxRate': 'TVA %',
    'colRowTotal': 'Total',
    'sectionLineItems': 'Lignes',
    'sectionTotals': 'Totaux',
    'sectionNotes': 'Notes',
    'sectionPayments': 'Paiements',
    'sectionActivity': 'Activit\u00e9',
  },
  'it': {
    'pdfIframeTitle': 'Anteprima fattura',
    'pdfLoadFailed': 'Impossibile caricare l\u2019anteprima',
    'breadcrumbInvoices': 'Fatture',
    'notFound': 'Questa fattura non esiste.',
    'backToList': 'Torna alle fatture',
    'addLine': '+ Aggiungi riga',
    'deleteLine': 'Elimina riga',
    'reorderLine': 'Riordina riga',
    'moreActions': 'Altre azioni',
    'actionSend': 'Invia',
    'actionResend': 'Invia di nuovo',
    'actionSendReminder': 'Invia promemoria',
    'actionRecordPayment': 'Registra pagamento',
    'actionDownloadPdf': 'Scarica PDF',
    'actionDuplicate': 'Duplica',
    'actionMarkPaid': 'Segna come pagata',
    'actionWaive': 'Annulla',
    'actionDelete': 'Elimina',
    'actionShareLink': 'Condividi link',
    'actionImportTime': 'Importa voci di tempo',
    'metaInvoiceNumber': 'Numero fattura',
    'metaStatus': 'Stato',
    'metaIssueDate': 'Data di emissione',
    'metaDueDate': 'Data di scadenza',
    'metaCompany': 'Azienda',
    'metaContact': 'Contatto',
    'metaCurrency': 'Valuta',
    'metaDeal': 'Affare',
    'colDescription': 'Descrizione',
    'colQuantity': 'Qt\u00e0',
    'colUnitPrice': 'Prezzo unitario',
    'colTaxRate': 'IVA %',
    'colRowTotal': 'Totale',
    'sectionLineItems': 'Righe',
    'sectionTotals': 'Totali',
    'sectionNotes': 'Note',
    'sectionPayments': 'Pagamenti',
    'sectionActivity': 'Attivit\u00e0',
  },
}
for lang, keys in translations.items():
    path = f'packages/client/src/i18n/locales/{lang}.json'
    with open(path) as f:
        d = json.load(f)
    d.setdefault('invoices', {}).setdefault('detail', {}).update(keys)
    with open(path, 'w') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'{lang}: invoices.detail.* added')
PY
```

Expected output: 5 lines, one per locale.

- [ ] **Step 2: Verify key parity across locales**

Run:
```bash
python3 -c "
import json
from pathlib import Path
langs = ['en','tr','de','fr','it']
keys = {}
for lang in langs:
    d = json.load(open(f'packages/client/src/i18n/locales/{lang}.json'))
    keys[lang] = set((d.get('invoices', {}).get('detail', {})).keys())
baseline = keys['en']
for lang in langs[1:]:
    missing = baseline - keys[lang]
    extra = keys[lang] - baseline
    if missing or extra:
        print(f'{lang}: missing={missing}, extra={extra}')
    else:
        print(f'{lang}: OK')
"
```

Expected: each locale prints `OK`.

- [ ] **Step 3: Commit**

```bash
cd /Users/gorkemcetin/atlasmail
git add packages/client/src/i18n/locales/
git commit -m "i18n(invoices): add invoices.detail.* keys for the new page"
git push origin main
```

---

## Task 5: InvoiceDetailHeader with adaptive action buttons

**Files:**
- Create: `packages/client/src/apps/invoices/components/invoice-detail-header.tsx`

- [ ] **Step 1: Create the header component**

Write `packages/client/src/apps/invoices/components/invoice-detail-header.tsx`:

```tsx
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send, Download, DollarSign, Copy as CopyIcon, Trash2, MoreHorizontal,
  Mail, Check, XCircle, Link as LinkIcon, Clock, FileCode,
} from 'lucide-react';
import type { Invoice } from '@atlas-platform/shared';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { IconButton } from '../../../components/ui/icon-button';
import { Popover, PopoverTrigger, PopoverContent } from '../../../components/ui/popover';
import { getInvoiceStatusVariant } from '@atlas-platform/shared';

type ActionId =
  | 'send' | 'resend' | 'sendReminder' | 'recordPayment' | 'downloadPdf'
  | 'duplicate' | 'markPaid' | 'waive' | 'delete' | 'shareLink' | 'importTime';

interface ActionHandlers {
  onSend: () => void;
  onRecordPayment: () => void;
  onDownloadPdf: () => void;
  onDuplicate: () => void;
  onMarkPaid: () => void;
  onWaive: () => void;
  onDelete: () => void;
  onShareLink: () => void;
  onImportTime: () => void;
}

interface Props extends ActionHandlers {
  invoice: Invoice;
  onBack: () => void;
}

function primaryActionsFor(status: string): ActionId[] {
  switch (status) {
    case 'draft':   return ['send', 'downloadPdf'];
    case 'sent':
    case 'viewed':  return ['recordPayment', 'resend', 'downloadPdf'];
    case 'partial':
    case 'overdue': return ['recordPayment', 'sendReminder', 'downloadPdf'];
    case 'paid':
    case 'waived':  return ['downloadPdf'];
    default:        return ['downloadPdf'];
  }
}

export function InvoiceDetailHeader({ invoice, onBack, ...handlers }: Props) {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = primaryActionsFor(invoice.status);
  const actionMap: Record<ActionId, { label: string; icon: ReactNode; onClick: () => void }> = {
    send:           { label: t('invoices.detail.actionSend'),          icon: <Send size={13} />,       onClick: handlers.onSend },
    resend:         { label: t('invoices.detail.actionResend'),        icon: <Mail size={13} />,       onClick: handlers.onSend },
    sendReminder:   { label: t('invoices.detail.actionSendReminder'),  icon: <Clock size={13} />,      onClick: handlers.onSend },
    recordPayment:  { label: t('invoices.detail.actionRecordPayment'), icon: <DollarSign size={13} />, onClick: handlers.onRecordPayment },
    downloadPdf:    { label: t('invoices.detail.actionDownloadPdf'),   icon: <Download size={13} />,   onClick: handlers.onDownloadPdf },
    duplicate:      { label: t('invoices.detail.actionDuplicate'),     icon: <CopyIcon size={13} />,   onClick: handlers.onDuplicate },
    markPaid:       { label: t('invoices.detail.actionMarkPaid'),      icon: <Check size={13} />,      onClick: handlers.onMarkPaid },
    waive:          { label: t('invoices.detail.actionWaive'),         icon: <XCircle size={13} />,    onClick: handlers.onWaive },
    delete:         { label: t('invoices.detail.actionDelete'),        icon: <Trash2 size={13} />,     onClick: handlers.onDelete },
    shareLink:      { label: t('invoices.detail.actionShareLink'),     icon: <LinkIcon size={13} />,   onClick: handlers.onShareLink },
    importTime:     { label: t('invoices.detail.actionImportTime'),    icon: <FileCode size={13} />,   onClick: handlers.onImportTime },
  };

  const moreActions: ActionId[] = (Object.keys(actionMap) as ActionId[]).filter(id => !primary.includes(id));

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-sm) var(--spacing-lg)',
        width: '100%',
      }}
    >
      <button
        onClick={onBack}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-family)',
        }}
      >
        {t('invoices.detail.breadcrumbInvoices')}
      </button>
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>/</span>
      <span style={{
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-family)',
      }}>
        {invoice.invoiceNumber}
      </span>
      <Badge variant={getInvoiceStatusVariant(invoice.status)}>
        {invoice.status}
      </Badge>

      <div style={{ flex: 1 }} />

      {primary.map((id, i) => {
        const a = actionMap[id];
        return (
          <Button
            key={id}
            variant={i === 0 ? 'primary' : 'secondary'}
            size="sm"
            icon={a.icon}
            onClick={a.onClick}
          >
            {a.label}
          </Button>
        );
      })}

      <Popover open={moreOpen} onOpenChange={setMoreOpen}>
        <PopoverTrigger asChild>
          <IconButton
            icon={<MoreHorizontal size={15} />}
            label={t('invoices.detail.moreActions')}
            size={28}
          />
        </PopoverTrigger>
        <PopoverContent align="end" style={{ minWidth: 200, padding: 'var(--spacing-xs)' }}>
          {moreActions.map((id) => {
            const a = actionMap[id];
            return (
              <button
                key={id}
                onClick={() => { a.onClick(); setMoreOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)',
                  width: '100%', padding: '6px 10px',
                  background: 'transparent', border: 'none',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-family)', textAlign: 'left',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {a.icon}
                {a.label}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

Note: `resend` and `sendReminder` both call `onSend` — the existing `useSendInvoice` endpoint behaves as resend/reminder when the invoice is already sent. The button labels differ by status; the action is the same.

- [ ] **Step 2: Typecheck**

Run: `cd /Users/gorkemcetin/atlasmail/packages/client && npx tsc --noEmit 2>&1 | tail -10`
Expected: PASS. If `Popover`/`PopoverTrigger`/`PopoverContent` imports fail, grep for how CRM's deal-detail uses the Popover — match that import path exactly. Atlas has a shared wrapper at `packages/client/src/components/ui/popover.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /Users/gorkemcetin/atlasmail
git add packages/client/src/apps/invoices/components/invoice-detail-header.tsx
git commit -m "feat(invoices): adaptive header with status-driven actions + More menu"
git push origin main
```

---

## Task 6: InvoiceMetaBlock (2-column inline-editable grid)

**Files:**
- Create: `packages/client/src/apps/invoices/components/invoice-meta-block.tsx`

- [ ] **Step 1: Create the component**

Write `packages/client/src/apps/invoices/components/invoice-meta-block.tsx`:

```tsx
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Invoice } from '@atlas-platform/shared';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { useCompanies } from '../../crm/hooks';

interface Props {
  invoice: Invoice;
  onPatch: (patch: Partial<{
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    companyId: string;
    contactId: string | null;
    currency: string;
    dealId: string | null;
  }>) => void;
}

export function InvoiceMetaBlock({ invoice, onPatch }: Props) {
  const { t } = useTranslation();
  const { data: companiesData } = useCompanies();
  const companies = companiesData ?? [];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr',
        columnGap: 'var(--spacing-md)',
        rowGap: 'var(--spacing-sm)',
        padding: 'var(--spacing-md)',
        borderBottom: '1px solid var(--color-border-secondary)',
      }}
    >
      <Label>{t('invoices.detail.metaInvoiceNumber')}</Label>
      <Input
        size="sm"
        defaultValue={invoice.invoiceNumber}
        onBlur={(e) => {
          const next = e.currentTarget.value.trim();
          if (next && next !== invoice.invoiceNumber) onPatch({ invoiceNumber: next });
        }}
      />

      <Label>{t('invoices.detail.metaIssueDate')}</Label>
      <Input
        size="sm"
        type="date"
        defaultValue={invoice.issueDate.slice(0, 10)}
        onBlur={(e) => {
          const next = e.currentTarget.value;
          if (next && next !== invoice.issueDate.slice(0, 10)) onPatch({ issueDate: next });
        }}
      />

      <Label>{t('invoices.detail.metaDueDate')}</Label>
      <Input
        size="sm"
        type="date"
        defaultValue={invoice.dueDate.slice(0, 10)}
        onBlur={(e) => {
          const next = e.currentTarget.value;
          if (next && next !== invoice.dueDate.slice(0, 10)) onPatch({ dueDate: next });
        }}
      />

      <Label>{t('invoices.detail.metaCompany')}</Label>
      <Select
        size="sm"
        value={invoice.companyId}
        onChange={(v) => { if (v && v !== invoice.companyId) onPatch({ companyId: v }); }}
        options={companies.map((c) => ({ value: c.id, label: c.name }))}
      />

      <Label>{t('invoices.detail.metaCurrency')}</Label>
      <Select
        size="sm"
        value={invoice.currency}
        onChange={(v) => { if (v && v !== invoice.currency) onPatch({ currency: v }); }}
        options={[
          { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' },
          { value: 'GBP', label: 'GBP' }, { value: 'TRY', label: 'TRY' },
        ]}
      />
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span style={{
      fontSize: 'var(--font-size-sm)',
      color: 'var(--color-text-secondary)',
      alignSelf: 'center',
      fontFamily: 'var(--font-family)',
    }}>
      {children}
    </span>
  );
}
```

Note on scope: contact and deal selection are deferred to a later polish task — they require dependent selects (contact filtered by company, deal by company) and the MVP works without them. `contactId` / `dealId` stay on the existing values until the user edits them elsewhere. The design doc lists contact and deal as meta fields; this is a known v1 gap captured in the "Follow-up polish" section at the bottom of the plan.

- [ ] **Step 2: Typecheck**

Run: `cd /Users/gorkemcetin/atlasmail/packages/client && npx tsc --noEmit 2>&1 | tail -10`

Expected: PASS. Common breakage: `Input`'s `onBlur` type, or `Select`'s `onChange` signature. Read the components in `packages/client/src/components/ui/input.tsx` and `select.tsx` first if tsc complains.

- [ ] **Step 3: Commit**

```bash
cd /Users/gorkemcetin/atlasmail
git add packages/client/src/apps/invoices/components/invoice-meta-block.tsx
git commit -m "feat(invoices): InvoiceMetaBlock with inline-editable metadata grid"
git push origin main
```

---

## Task 7: InvoiceLineItemsTable

**Files:**
- Create: `packages/client/src/apps/invoices/components/invoice-line-items-table.tsx`

Each row has description / qty / unit-price / tax-rate / row-total. Drag to reorder, `✕` to delete. Changes fire `onReplaceLineItems(nextArray)` — the parent's `onPatch` will send the whole `lineItems` array to the server (the existing `useUpdateInvoice` contract).

- [ ] **Step 1: Create the component**

Write `packages/client/src/apps/invoices/components/invoice-line-items-table.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, GripVertical } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { IconButton } from '../../../components/ui/icon-button';
import { Button } from '../../../components/ui/button';

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

interface Props {
  lineItems: LineItem[];
  /** Full replacement — parent sends this whole array to the server. */
  onReplaceLineItems: (next: LineItem[]) => void;
}

function rowTotal(li: LineItem): number {
  const tax = li.taxRate ?? 0;
  return (li.quantity || 0) * (li.unitPrice || 0) * (1 + tax / 100);
}

export function InvoiceLineItemsTable({ lineItems, onReplaceLineItems }: Props) {
  const { t } = useTranslation();
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);

  const patchRow = (index: number, patch: Partial<LineItem>) => {
    const next = lineItems.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onReplaceLineItems(next);
  };

  const addRow = () => {
    onReplaceLineItems([
      ...lineItems,
      { description: '', quantity: 1, unitPrice: 0, taxRate: 0 },
    ]);
  };

  const deleteRow = (index: number) => {
    onReplaceLineItems(lineItems.filter((_, i) => i !== index));
  };

  const moveRow = (from: number, to: number) => {
    if (from === to || to < 0 || to >= lineItems.length) return;
    const next = [...lineItems];
    const [picked] = next.splice(from, 1);
    next.splice(to, 0, picked);
    onReplaceLineItems(next);
  };

  return (
    <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border-secondary)' }}>
      <div style={{
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)',
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 'var(--spacing-sm)',
      }}>
        {t('invoices.detail.sectionLineItems')}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '24px minmax(140px, 1fr) 70px 90px 60px 90px 28px',
        columnGap: 'var(--spacing-xs)',
        rowGap: 'var(--spacing-xs)',
        alignItems: 'center',
      }}>
        {/* Header row */}
        <span />
        <HeaderCell>{t('invoices.detail.colDescription')}</HeaderCell>
        <HeaderCell align="right">{t('invoices.detail.colQuantity')}</HeaderCell>
        <HeaderCell align="right">{t('invoices.detail.colUnitPrice')}</HeaderCell>
        <HeaderCell align="right">{t('invoices.detail.colTaxRate')}</HeaderCell>
        <HeaderCell align="right">{t('invoices.detail.colRowTotal')}</HeaderCell>
        <span />

        {lineItems.map((row, i) => (
          <Row
            key={i}
            row={row}
            index={i}
            isDragSource={dragFromIndex === i}
            onDragStart={() => setDragFromIndex(i)}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={() => { if (dragFromIndex != null) moveRow(dragFromIndex, i); setDragFromIndex(null); }}
            onDragEnd={() => setDragFromIndex(null)}
            onDescriptionBlur={(v) => { if (v !== row.description) patchRow(i, { description: v }); }}
            onQuantityBlur={(v) => { if (v !== row.quantity) patchRow(i, { quantity: v }); }}
            onUnitPriceBlur={(v) => { if (v !== row.unitPrice) patchRow(i, { unitPrice: v }); }}
            onTaxRateBlur={(v) => { if (v !== (row.taxRate ?? 0)) patchRow(i, { taxRate: v }); }}
            onDelete={() => deleteRow(i)}
            reorderLabel={t('invoices.detail.reorderLine')}
            deleteLabel={t('invoices.detail.deleteLine')}
          />
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={addRow} style={{ marginTop: 'var(--spacing-sm)' }}>
        {t('invoices.detail.addLine')}
      </Button>
    </div>
  );
}

function HeaderCell({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <span style={{
      fontSize: 'var(--font-size-xs)',
      color: 'var(--color-text-tertiary)',
      fontWeight: 'var(--font-weight-medium)',
      textAlign: align,
    }}>
      {children}
    </span>
  );
}

interface RowProps {
  row: LineItem;
  index: number;
  isDragSource: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onDescriptionBlur: (v: string) => void;
  onQuantityBlur: (v: number) => void;
  onUnitPriceBlur: (v: number) => void;
  onTaxRateBlur: (v: number) => void;
  onDelete: () => void;
  reorderLabel: string;
  deleteLabel: string;
}

function Row(p: RowProps) {
  return (
    <>
      <span
        draggable
        onDragStart={p.onDragStart}
        onDragOver={p.onDragOver}
        onDrop={p.onDrop}
        onDragEnd={p.onDragEnd}
        aria-label={p.reorderLabel}
        style={{
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-tertiary)',
          opacity: p.isDragSource ? 0.4 : 1,
        }}
      >
        <GripVertical size={13} />
      </span>
      <Input
        size="sm"
        defaultValue={p.row.description}
        onBlur={(e) => p.onDescriptionBlur(e.currentTarget.value)}
      />
      <Input
        size="sm"
        type="number"
        defaultValue={String(p.row.quantity ?? 0)}
        style={{ textAlign: 'right' }}
        onBlur={(e) => p.onQuantityBlur(Number(e.currentTarget.value) || 0)}
      />
      <Input
        size="sm"
        type="number"
        defaultValue={String(p.row.unitPrice ?? 0)}
        style={{ textAlign: 'right' }}
        onBlur={(e) => p.onUnitPriceBlur(Number(e.currentTarget.value) || 0)}
      />
      <Input
        size="sm"
        type="number"
        defaultValue={String(p.row.taxRate ?? 0)}
        style={{ textAlign: 'right' }}
        onBlur={(e) => p.onTaxRateBlur(Number(e.currentTarget.value) || 0)}
      />
      <span style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-family)',
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
        paddingInline: 'var(--spacing-xs)',
      }}>
        {rowTotal(p.row).toFixed(2)}
      </span>
      <IconButton
        icon={<Trash2 size={13} />}
        label={p.deleteLabel}
        size={22}
        onClick={p.onDelete}
      />
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/gorkemcetin/atlasmail/packages/client && npx tsc --noEmit 2>&1 | tail -10`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/gorkemcetin/atlasmail
git add packages/client/src/apps/invoices/components/invoice-line-items-table.tsx
git commit -m "feat(invoices): InvoiceLineItemsTable with inline edit + drag reorder"
git push origin main
```

---

## Task 8: InvoiceDetailPage shell with draggable split

**Files:**
- Create: `packages/client/src/apps/invoices/components/invoice-detail-page.tsx`

This is the glue. Reads the invoice via `useInvoice(id)`, renders the header + the two panes + the draggable divider, owns the transparent capture overlay during drag (critical because dragging over the PDF iframe otherwise swallows pointer events).

- [ ] **Step 1: Create the page shell**

Write `packages/client/src/apps/invoices/components/invoice-detail-page.tsx`:

```tsx
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/button';
import { ContentArea } from '../../../components/ui/content-area';
import { useToastStore } from '../../../stores/toast-store';
import {
  useInvoice, useUpdateInvoice, useDeleteInvoice, useSendInvoice,
  useMarkInvoicePaid, useWaiveInvoice, useDuplicateInvoice,
} from '../hooks';
import { useInvoiceDetailSplit } from '../hooks/use-invoice-detail-split';
import { InvoiceDetailHeader } from './invoice-detail-header';
import { InvoicePdfViewer } from './invoice-pdf-viewer';
import { InvoiceMetaBlock } from './invoice-meta-block';
import { InvoiceLineItemsTable, type LineItem } from './invoice-line-items-table';
import { InvoicePaymentsList } from './invoice-payments-list';
import { StatusTimeline } from '../../../components/shared/status-timeline';
import { TotalsBlock } from '../../../components/shared/totals-block';
import { SendInvoiceModal } from './send-invoice-modal';
import { RecordPaymentModal } from './record-payment-modal';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';

interface Props {
  invoiceId: string;
  onBack: () => void;
}

export function InvoiceDetailPage({ invoiceId, onBack }: Props) {
  const { t } = useTranslation();
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const sendInvoice = useSendInvoice();
  const markPaid = useMarkInvoicePaid();
  const waive = useWaiveInvoice();
  const duplicate = useDuplicateInvoice();
  const addToast = useToastStore((s) => s.addToast);

  const { pdfPercent, setPdfPercent, MIN_PDF_PERCENT, MAX_PDF_PERCENT } = useInvoiceDetailSplit();
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const patch = useCallback((
    body: Partial<Parameters<typeof updateInvoice.mutate>[0]>,
  ) => {
    if (!invoice) return;
    updateInvoice.mutate(
      { id: invoice.id, updatedAt: invoice.updatedAt, ...body } as any,
      {
        onError: () => addToast({ type: 'error', message: 'Failed to save invoice' }),
      },
    );
  }, [invoice, updateInvoice, addToast]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const container = splitContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setPdfPercent(pct);
  }, [dragging, setPdfPercent]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Attach global listeners while dragging
  useMemo(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const downloadPdf = () => {
    const token = localStorage.getItem('atlasmail_token');
    window.open(
      `/api/v1/invoices/${invoiceId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`,
      '_blank',
    );
  };

  if (isLoading) {
    return <ContentArea title="Invoice"><div style={{ padding: 32 }}>Loading…</div></ContentArea>;
  }
  if (!invoice) {
    return (
      <ContentArea title="Invoice">
        <div style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ marginBottom: 16 }}>{t('invoices.detail.notFound')}</p>
          <Button variant="secondary" onClick={onBack}>{t('invoices.detail.backToList')}</Button>
        </div>
      </ContentArea>
    );
  }

  const lineItems = (invoice as any).lineItems as LineItem[] | undefined;

  return (
    <>
      <ContentArea
        headerSlot={
          <InvoiceDetailHeader
            invoice={invoice}
            onBack={onBack}
            onSend={() => setShowSendModal(true)}
            onRecordPayment={() => setShowPaymentModal(true)}
            onDownloadPdf={downloadPdf}
            onDuplicate={() => duplicate.mutate(invoice.id)}
            onMarkPaid={() => markPaid.mutate(invoice.id)}
            onWaive={() => waive.mutate(invoice.id)}
            onDelete={() => setConfirmDelete(true)}
            onShareLink={() => { /* existing share flow — left as-is */ }}
            onImportTime={() => { /* existing flow — left as-is */ }}
          />
        }
      >
        <div
          ref={splitContainerRef}
          style={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
            position: 'relative',
          }}
        >
          {/* LEFT: PDF pane */}
          <div style={{ width: `${pdfPercent}%`, display: 'flex', flexDirection: 'column' }}>
            <InvoicePdfViewer invoiceId={invoice.id} updatedAt={invoice.updatedAt} />
          </div>

          {/* Drag handle */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-valuemin={MIN_PDF_PERCENT}
            aria-valuemax={MAX_PDF_PERCENT}
            aria-valuenow={Math.round(pdfPercent)}
            onMouseDown={handleMouseDown}
            style={{
              width: 4,
              cursor: 'col-resize',
              background: 'var(--color-border-secondary)',
              flexShrink: 0,
            }}
          />

          {/* Transparent overlay while dragging — prevents iframe from stealing pointer events. */}
          {dragging && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                cursor: 'col-resize',
                zIndex: 10,
              }}
            />
          )}

          {/* RIGHT: details pane */}
          <div style={{ width: `${100 - pdfPercent}%`, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            <InvoiceMetaBlock
              invoice={invoice}
              onPatch={patch}
            />
            <InvoiceLineItemsTable
              lineItems={lineItems ?? []}
              onReplaceLineItems={(next) => patch({ lineItems: next } as any)}
            />
            <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border-secondary)' }}>
              <TotalsBlock
                subtotal={invoice.subtotal}
                taxAmount={invoice.taxAmount}
                discountAmount={invoice.discountAmount}
                total={invoice.total}
                balanceDue={(invoice as any).balanceDue ?? invoice.total}
                currency={invoice.currency}
              />
            </div>
            <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border-secondary)' }}>
              <div style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                fontWeight: 'var(--font-weight-semibold)',
                letterSpacing: '0.05em',
                marginBottom: 'var(--spacing-sm)',
              }}>{t('invoices.detail.sectionNotes')}</div>
              <textarea
                defaultValue={invoice.notes ?? ''}
                onBlur={(e) => {
                  const next = e.currentTarget.value;
                  if (next !== (invoice.notes ?? '')) patch({ notes: next });
                }}
                style={{
                  width: '100%', minHeight: 80, padding: 'var(--spacing-sm)',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--font-size-sm)',
                  resize: 'vertical',
                }}
              />
            </div>
            <InvoicePaymentsList invoiceId={invoice.id} />
            <div style={{ padding: 'var(--spacing-md)' }}>
              <StatusTimeline
                events={[
                  { label: 'Created', at: invoice.createdAt },
                  invoice.sentAt ? { label: 'Sent', at: invoice.sentAt } : null,
                  invoice.viewedAt ? { label: 'Viewed', at: invoice.viewedAt } : null,
                  invoice.paidAt ? { label: 'Paid', at: invoice.paidAt } : null,
                ].filter(Boolean) as any}
              />
            </div>
          </div>
        </div>
      </ContentArea>

      {showSendModal && (
        <SendInvoiceModal
          invoice={invoice}
          onClose={() => setShowSendModal(false)}
        />
      )}
      {showPaymentModal && (
        <RecordPaymentModal
          invoiceId={invoice.id}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('invoices.detail.actionDelete')}
        destructive
        onConfirm={() => {
          deleteInvoice.mutate(invoice.id, { onSuccess: onBack });
        }}
      />
    </>
  );
}
```

Important caveats the engineer should verify while implementing:

- The `SendInvoiceModal` and `RecordPaymentModal` prop shapes may differ from what's called here. Read them first: `packages/client/src/apps/invoices/components/send-invoice-modal.tsx` and `record-payment-modal.tsx`. If their props expect `open` / `onOpenChange` instead of `onClose`, adapt.
- `StatusTimeline`'s `events` prop shape is defined in `packages/client/src/components/shared/status-timeline.tsx` — match its exact type; if it uses `eventType` instead of `label`, switch.
- `TotalsBlock`'s props likewise — read `packages/client/src/components/shared/totals-block.tsx` and match field names. The example above uses plausible names; adjust to reality.
- The `lineItems` cast (`(invoice as any).lineItems`) exists because the shared `Invoice` type may not declare it — the server returns it but TS doesn't know. If the type already has it, drop the cast.

- [ ] **Step 2: Typecheck**

Run: `cd /Users/gorkemcetin/atlasmail/packages/client && npx tsc --noEmit 2>&1 | tail -15`

If you see type errors on `SendInvoiceModal` / `RecordPaymentModal` / `StatusTimeline` / `TotalsBlock` prop shapes, that's expected — fix them to match the real prop signatures. Those components already exist and are used elsewhere in the app; you can grep for their existing call sites and copy the pattern.

Also expected: `useMemo` with a cleanup return is unconventional — replace with `useEffect`:

```tsx
useEffect(() => {
  if (!dragging) return;
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
}, [dragging, handleMouseMove, handleMouseUp]);
```

Import `useEffect` from `react`. This is a correctness fix — `useMemo` doesn't run cleanup the same way.

- [ ] **Step 3: Commit**

```bash
cd /Users/gorkemcetin/atlasmail
git add packages/client/src/apps/invoices/components/invoice-detail-page.tsx
git commit -m "feat(invoices): InvoiceDetailPage shell with draggable PDF/details split"
git push origin main
```

---

## Task 9: Wire the route + list row click

**Files:**
- Modify: `packages/client/src/apps/invoices/page.tsx`
- Modify: `packages/client/src/apps/invoices/components/invoices-list-view.tsx`

- [ ] **Step 1: Add `invoice-detail` branch to page.tsx**

Read `packages/client/src/apps/invoices/page.tsx` first to see how the existing `activeView` branches render. Add an import and a conditional branch.

At the top:
```tsx
import { InvoiceDetailPage } from './components/invoice-detail-page';
```

Find the block that dispatches on `activeView` (likely a series of `{activeView === '...' && ...}` conditionals). Add, before the default branches:

```tsx
{activeView === 'invoice-detail' && searchParams.get('invoiceId') && (
  <InvoiceDetailPage
    invoiceId={searchParams.get('invoiceId')!}
    onBack={() => setSearchParams({ view: 'invoices' }, { replace: true })}
  />
)}
```

**Important**: the existing page already has an `InvoiceDetailPanel` render that's triggered by `selectedInvoiceId`. Remove that render. Also remove the `selectedInvoiceId` / `setSelectedInvoiceId` state and its effect-based cleanup. This is the retirement of the slide-over panel.

- [ ] **Step 2: Update list row click**

In `packages/client/src/apps/invoices/components/invoices-list-view.tsx`, find where a row's `onClick` sets the selected invoice (currently probably calls an `onSelect(id)` prop that updates `selectedInvoiceId` upstream). Change the prop contract:

```tsx
// old
onSelect: (id: string) => void;
// new
onOpenDetail: (id: string) => void;
```

Call site in `invoices-list-view.tsx`:
```tsx
<DataTable
  // ...
  onRowClick={(invoice) => onOpenDetail(invoice.id)}
/>
```

Then in `page.tsx`, pass `onOpenDetail={(id) => setSearchParams({ view: 'invoice-detail', invoiceId: id }, { replace: true })}`.

- [ ] **Step 3: Typecheck**

Run: `cd /Users/gorkemcetin/atlasmail/packages/client && npx tsc --noEmit 2>&1 | tail -10`
Expected: PASS.

- [ ] **Step 4: Smoke test**

Start dev server (if not already), open http://localhost:5180/invoices?view=invoices, click any invoice row — browser URL should become `?view=invoice-detail&invoiceId=<uuid>`, and the new full-page view should render with the PDF iframe on the left and details on the right.

- [ ] **Step 5: Commit**

```bash
cd /Users/gorkemcetin/atlasmail
git add packages/client/src/apps/invoices/page.tsx packages/client/src/apps/invoices/components/invoices-list-view.tsx
git commit -m "feat(invoices): route ?view=invoice-detail to the new page

List row click now navigates instead of opening the slide-over panel."
git push origin main
```

---

## Task 10: Retire the old detail panel + preview

**Files:**
- Delete: `packages/client/src/apps/invoices/components/invoice-detail-panel.tsx`
- Delete: `packages/client/src/apps/invoices/components/invoice-preview.tsx`

- [ ] **Step 1: Remove stale imports**

Run:
```bash
grep -rn "InvoiceDetailPanel\|invoice-detail-panel\|InvoicePreview\|invoice-preview" /Users/gorkemcetin/atlasmail/packages/client/src 2>/dev/null
```

Every result should be from the two files we're about to delete, or from the new page's own code. If any other file imports these names, remove or migrate those imports. Specifically, `invoices/page.tsx` will still import them from Task 9 — those imports need to go.

- [ ] **Step 2: Delete the files**

```bash
cd /Users/gorkemcetin/atlasmail
rm packages/client/src/apps/invoices/components/invoice-detail-panel.tsx
rm packages/client/src/apps/invoices/components/invoice-preview.tsx
```

- [ ] **Step 3: Remove their imports from page.tsx**

Re-grep:
```bash
grep -rn "InvoiceDetailPanel\|InvoicePreview" /Users/gorkemcetin/atlasmail/packages/client/src
```
Expected: no results.

Edit `packages/client/src/apps/invoices/page.tsx`: remove the two lines importing `InvoiceDetailPanel` and `InvoicePreview`, and any state related to them (`previewInvoiceId`, `setPreviewInvoiceId`) if not already removed in Task 9.

- [ ] **Step 4: Typecheck + build**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npx tsc --noEmit 2>&1 | tail -5
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/gorkemcetin/atlasmail
git add -A
git commit -m "refactor(invoices): retire slide-over detail panel + preview

Responsibilities absorbed by InvoiceDetailPage + InvoicePdfViewer +
InvoiceDetailHeader + InvoiceMetaBlock + InvoiceLineItemsTable."
git push origin main
```

---

## Task 11: End-to-end smoke test

**Files:** none; verification only.

- [ ] **Step 1: Full workspace typecheck**

Run:
```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npx tsc --noEmit 2>&1 | tail -5
cd /Users/gorkemcetin/atlasmail/packages/server && npx tsc --noEmit 2>&1 | tail -5
```

Client should PASS clean. Server may still show the known pre-existing `hrEmployees` error in `hr/routes.ts`; anything else is a regression to fix.

- [ ] **Step 2: Production build**

```bash
cd /Users/gorkemcetin/atlasmail/packages/client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...` with no new errors.

- [ ] **Step 3: Manual smoke**

With dev server running:

1. Navigate to `/invoices?view=invoices`. Click any invoice row. URL should become `?view=invoice-detail&invoiceId=<uuid>`. The page should render with PDF on left (60%) and details on right (40%). Dock still visible at the bottom.

2. Drag the vertical divider between the panes — split ratio should change smoothly and clamp to 50–70% PDF. Reload the page; the chosen ratio persists.

3. Edit the invoice number field — blur. Within ~1.5s the PDF reloads to reflect the change. TanStack Query invalidates. No toast errors.

4. Edit a line item's quantity — blur. PDF reloads (debounced). Row total updates immediately from the client-side `rowTotal` computation.

5. Add a line item via "+ Add line". PDF reloads. Row shows up with empty description and defaults.

6. Drag a line item's `⠿` handle to reorder. PDF reloads.

7. Delete a line item via `✕`. PDF reloads.

8. Open the same invoice in two browser tabs. Edit a field in tab 1. In tab 2, try to edit anything. The global `ConflictDialog` should appear ("This record was updated by someone else…").

9. Click the adaptive primary button per status: a draft shows **Send**; a sent invoice shows **Record payment**. Click **Download PDF** — the server PDF opens in a new tab.

10. Open the **⋯ More** menu — confirm all the secondary actions (Duplicate, Mark paid, Waive, Delete, Share link, Import time entries) are listed.

11. Click **Delete** → ConfirmDialog → Confirm → you should return to the list, and the invoice should be gone.

- [ ] **Step 4: No commit — verification only**

This task is purely verification. Any failures send you back to the relevant earlier task.

---

## Follow-up polish (out of scope for this plan, list explicitly)

These are known gaps versus the full spec. Leave them for a later plan rather than expanding scope here:

- **Contact picker** in `InvoiceMetaBlock` — needs dependent select filtered by the selected company.
- **Deal picker** in `InvoiceMetaBlock` — needs dependent select by company.
- **Share-link action** currently wired to a no-op in the header — retain the existing share modal integration once verified.
- **Import time entries** currently wired to a no-op in the header — same.
- **PDF focus-expand button** — the spec suggested a toggle to temporarily expand PDF to full width; the draggable handle covers the use case for v1, so this is deferred.
- **Accessibility audit** — we set `aria-label`s and `aria-orientation` on the splitter, but a proper keyboard-only run-through (Tab order, Esc to exit edit-mode on fields) is a separate pass.

---

## Risks

1. **Existing helper components shapes may differ from the stubs in Task 8.** Explicitly called out — the engineer reads the real sources (`send-invoice-modal.tsx`, `record-payment-modal.tsx`, `status-timeline.tsx`, `totals-block.tsx`) and adapts call sites.

2. **Dragging the split over the PDF iframe.** Mitigated by the transparent overlay during drag; if still flaky, swap the drag capture pattern to a pointer-event lock on the splitter instead.

3. **Server PDF regeneration cost under rapid edits.** 1.5s debounce is the first line of defense. If benchmarks show load, raise to 3s (constant in `use-debounced-invoice-updated-at.ts`).

4. **Line items replacement is full-array on every change.** Acceptable because invoice line-item counts are small (single digits typical, ~20 maximum). If this becomes a bottleneck, add a diff-based endpoint later.

5. **Line-item drag-reorder uses native HTML5 DnD.** Works in all major browsers but is quirky on touch. Touch support is explicitly out of scope.
