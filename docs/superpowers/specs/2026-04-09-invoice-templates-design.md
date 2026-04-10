# Invoice Template System — Design Spec

**Date:** 2026-04-09
**Status:** Draft

---

## 1. Overview

Replace the current manual PDF generation (pdf-lib) and HTML preview with a unified template system using `@react-pdf/renderer`. Each template is a React component accepting standardized props. Templates live on the server. The client displays PDFs via iframe. Adding a new template = creating one React component file + registering it.

Tenants select a template and configure branding (logo, color, payment info) via Invoice Settings. Each tenant's settings are scoped by `tenantId` — full multi-tenancy.

---

## 2. Architecture

**Server renders, client displays.**

- **Server:** `@react-pdf/renderer` installed on the server package. Templates are React components in `packages/server/src/apps/invoices/templates/`. The existing `GET /api/invoices/:id/pdf` endpoint renders the tenant's selected template with their branding and returns PDF bytes.
- **Client preview:** Calls the same PDF endpoint and displays the result in an `<iframe>` or `<object type="application/pdf">`. No client-side PDF rendering.
- **Client download:** Same endpoint with `Content-Disposition: attachment`.

**Query param:** `?inline=true` for preview (browser displays inline), omit for download (triggers save dialog).

---

## 3. Schema Changes

### Modify `invoiceSettings` table

Add new columns:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `templateId` | varchar(50) | `'classic'` | Selected template ID |
| `logoPath` | text | null | Uploaded logo file path (via /api/upload) |
| `accentColor` | varchar(20) | `'#13715B'` | Brand accent color |
| `companyName` | varchar(255) | null | Company name on invoice header |
| `companyAddress` | text | null | Company street address |
| `companyCity` | varchar(100) | null | City |
| `companyCountry` | varchar(100) | null | Country |
| `companyPhone` | varchar(50) | null | Phone number |
| `companyEmail` | varchar(255) | null | Email |
| `companyWebsite` | varchar(255) | null | Website URL |
| `companyTaxId` | varchar(50) | null | Tax ID shown on invoice |
| `paymentInstructions` | text | null | e.g. "Payment due within 30 days" |
| `bankDetails` | text | null | IBAN, bank name, account info |
| `footerText` | text | null | Legal disclaimers, thank you note |

**Important:** These company branding fields are completely separate from the existing e-Fatura fields (`eFaturaCompanyName`, etc.). e-Fatura is a Turkish regulatory system with its own legal requirements — invoice template branding is a separate concept. Both sets of fields coexist independently in the same table. The settings UI shows them in separate sections.

### Migration

`ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS` for each new column.

---

## 4. Template Props Interface

```typescript
interface InvoiceTemplateProps {
  invoice: {
    invoiceNumber: string;
    status: string;
    currency: string;
    subtotal: number;
    taxPercent: number;
    taxAmount: number;
    discountPercent: number;
    discountAmount: number;
    total: number;
    notes?: string | null;
    issueDate: string;
    dueDate: string;
  };

  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate: number;
  }>;

  branding: {
    logoBase64?: string;         // logo file read as base64 data URI
    accentColor: string;
    companyName?: string;
    companyAddress?: string;
    companyCity?: string;
    companyCountry?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyWebsite?: string;
    companyTaxId?: string;
    companyTaxOffice?: string;
    paymentInstructions?: string;
    bankDetails?: string;
    footerText?: string;
  };

  client: {
    name: string;
    address?: string;
    postalCode?: string;
    city?: string;
    state?: string;
    country?: string;
    taxId?: string;
    contactName?: string;
    contactEmail?: string;
  };
}
```

**Logo handling:** The server reads the logo file from disk (`logoPath`), converts to base64 data URI, and passes as `logoBase64` to the template. `@react-pdf/renderer`'s `<Image>` component supports base64 data URIs.

---

## 5. Template Registry

```typescript
// packages/server/src/apps/invoices/templates/index.ts

import { ClassicTemplate } from './classic';
import { ModernTemplate } from './modern';
import { CompactTemplate } from './compact';

export const templateRegistry: Record<string, React.ComponentType<InvoiceTemplateProps>> = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  compact: CompactTemplate,
};

export function getTemplate(templateId: string): React.ComponentType<InvoiceTemplateProps> {
  return templateRegistry[templateId] || templateRegistry.classic;
}
```

---

## 6. Starting Templates

### Classic
Clean and minimal. Logo top-left, "INVOICE" title top-right. Company info below logo. Divider line. Two-column layout: bill-to on left, invoice meta (number, dates, status) on right. Line items table with header row and subtle row borders. Right-aligned totals block. Payment instructions below totals. Notes section. Footer with custom text.

### Modern
Accent-colored bar across the top of the page. Logo in the bar (white/light version works best). Company name in the bar. Below: bill-to and meta in a two-column card-like layout with subtle background. Line items table with accent-colored header row. Rounded visual feel. Bolder typography.

### Compact
Dense layout for invoices with many line items. Smaller font sizes (8-9pt body). Company info and bill-to in a single row across the top. Narrow line items table with tight row spacing. Minimal whitespace. Maximum data per page.

---

## 7. PDF Rendering Flow

```
GET /api/invoices/:id/pdf?inline=true

1. Fetch invoice + line items (existing getInvoice)
2. Fetch invoiceSettings for tenantId (branding + templateId)
3. Fetch crmCompany by invoice.companyId (client info)
4. If logoPath exists, read file from disk → convert to base64 data URI
5. Build InvoiceTemplateProps from all the above
6. Get template component from registry: getTemplate(settings.templateId)
7. Render: const pdfBytes = await renderToBuffer(<Template {...props} />)
8. Set Content-Type: application/pdf
9. Set Content-Disposition: inline (if ?inline=true) or attachment
10. Send pdfBytes
```

`renderToBuffer` is from `@react-pdf/renderer` — it takes a React element and returns a Buffer of PDF bytes.

---

## 8. Client Preview

### Modified preview page (`invoice-preview.tsx`)

Replace the current HTML rendering with:

```tsx
<div style={{ background: '#f5f5f5', height: '100vh', display: 'flex', flexDirection: 'column' }}>
  {/* Toolbar */}
  <div style={{ padding: 12, display: 'flex', gap: 8, background: 'white', borderBottom: '...' }}>
    <Button onClick={onClose}>Back</Button>
    <Button onClick={handleDownload}>Download PDF</Button>
    <Button onClick={() => window.print()}>Print</Button>
  </div>
  
  {/* PDF viewer */}
  <iframe
    src={`/api/invoices/${invoiceId}/pdf?inline=true`}
    style={{ flex: 1, border: 'none' }}
    title="Invoice preview"
  />
</div>
```

The iframe directly loads the PDF from the server endpoint. The browser's built-in PDF viewer handles rendering, zoom, scroll, etc.

---

## 9. Settings UI

Expand the existing Invoice Settings panel (`invoice-settings-panel.tsx`):

### Template selector
Visual cards (3 across) showing template name and a small icon/description. The active one has an accent border. Click to select.

### Branding section
- **Logo upload:** File input with image preview. Upload via `POST /api/upload`, store returned path. Show current logo with a "Remove" option.
- **Accent color:** Color input (`<input type="color">`) or text input for hex value. Show a preview swatch.
- **Company details:** Name, address, city, country, phone, email, website, tax ID. These are the NEW branding fields — completely separate from e-Fatura company details which remain in their own section.

### Payment section
- **Payment instructions:** Textarea. e.g., "Payment due within 30 days of invoice date."
- **Bank details:** Textarea. e.g., "Bank: XYZ Bank\nIBAN: TR12 3456 7890\nSWIFT: XYZBANK"

### Footer section
- **Footer text:** Textarea. e.g., "Thank you for your business!"

### Live preview
A small preview button that opens the preview in a new tab or shows an inline iframe with a sample/latest invoice rendered with current settings.

---

## 10. Shared Types

Add to `packages/shared/src/types/invoices.ts`:

```typescript
export interface InvoiceSettings {
  // ... existing fields ...
  templateId: string;
  logoPath?: string | null;
  accentColor: string;
  companyWebsite?: string | null;
  paymentInstructions?: string | null;
  bankDetails?: string | null;
  footerText?: string | null;
}

export interface UpdateInvoiceSettingsInput {
  // ... existing fields ...
  templateId?: string;
  logoPath?: string | null;
  accentColor?: string;
  companyWebsite?: string | null;
  paymentInstructions?: string | null;
  bankDetails?: string | null;
  footerText?: string | null;
}
```

---

## 11. File Structure

### Server
```
packages/server/src/apps/invoices/
├── templates/
│   ├── index.ts              — registry + getTemplate()
│   ├── types.ts              — InvoiceTemplateProps interface
│   ├── classic.tsx           — Classic template
│   ├── modern.tsx            — Modern template
│   └── compact.tsx           — Compact template
├── services/
│   ├── pdf.service.ts        — REWRITTEN: uses @react-pdf/renderer + template registry
│   └── ... (existing)
```

### Client
```
packages/client/src/apps/invoices/
├── components/
│   ├── invoice-preview.tsx   — REWRITTEN: iframe-based PDF viewer
│   ├── invoice-settings-panel.tsx — EXPANDED: template selector, branding, payment info
│   └── ... (existing)
```

---

## 12. Dependencies

### Install on server:
```bash
npm install @react-pdf/renderer --workspace=@atlasmail/server
```

`@react-pdf/renderer` requires React as a peer dependency. The server doesn't currently have React — we'll need to add `react` as a dependency too (just for PDF rendering, not for serving UI).

### No new client dependencies needed.

---

## 13. Migration Path

1. Add new columns to `invoiceSettings` (schema + migrate)
2. Install `@react-pdf/renderer` + `react` on server
3. Create template components
4. Rewrite `pdf.service.ts` to use template registry
5. Rewrite `invoice-preview.tsx` to use iframe
6. Expand settings UI
7. Remove old `pdf-lib` code from pdf.service.ts

---

## 14. What Gets Removed

- The current `pdf-lib`-based `pdf.service.ts` — replaced entirely by `@react-pdf/renderer`
- The current HTML-based `invoice-preview.tsx` — replaced by iframe PDF viewer
- `pdf-lib` dependency can be kept (still used by Sign app) or removed from Invoices imports

---

## 15. Translations

Add to all 5 locale files under `invoices.settings`:

- `template` — "Invoice template"
- `selectTemplate` — "Select a template"
- `classic` — "Classic"
- `classicDescription` — "Clean and minimal"
- `modern` — "Modern"
- `modernDescription` — "Contemporary with accent bar"
- `compact` — "Compact"
- `compactDescription` — "Dense layout for many items"
- `branding` — "Branding"
- `logo` — "Company logo"
- `uploadLogo` — "Upload logo"
- `removeLogo` — "Remove logo"
- `accentColor` — "Accent color"
- `companyDetails` — "Company details"
- `companyWebsite` — "Website"
- `paymentInfo` — "Payment information"
- `paymentInstructions` — "Payment instructions"
- `paymentInstructionsPlaceholder` — "e.g. Payment due within 30 days"
- `bankDetails` — "Bank details"
- `bankDetailsPlaceholder` — "e.g. Bank name, IBAN, SWIFT"
- `footer` — "Footer"
- `footerText` — "Footer text"
- `footerTextPlaceholder` — "e.g. Thank you for your business!"
- `previewTemplate` — "Preview template"

---

## 16. Out of Scope (Future)

- Drag-and-drop template editor
- Custom fonts upload
- Template marketplace / community templates
- Per-invoice template override (tenant-level only for v1)
- Multi-page invoice handling (auto-pagination is handled by @react-pdf/renderer)
- Client-side PDF rendering
- QR code on invoice
