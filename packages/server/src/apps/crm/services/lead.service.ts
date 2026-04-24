import { db } from '../../../config/database';
import { crmLeads, crmLeadForms, crmDeals } from '../../../db/schema';
import { eq, and, or, asc, desc, sql } from 'drizzle-orm';
import { logger } from '../../../utils/logger';
import crypto from 'crypto';
import type { CrmRecordAccess } from '@atlas-platform/shared';
import { createActivity } from './activity.service';
import { createContact, updateContact } from './contact.service';
import { createCompany } from './company.service';
import { createDeal } from './deal.service';

// ─── Input types ────────────────────────────────────────────────────

interface CreateLeadInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  source?: string;
  notes?: string | null;
}

interface UpdateLeadInput extends Partial<CreateLeadInput> {
  status?: string;
  sortOrder?: number;
  isArchived?: boolean;
  tags?: string[];
  expectedRevenue?: number;
  probability?: number;
  assignedUserId?: string | null;
  expectedCloseDate?: string | null;
}

// ─── Leads ─────────────────────────────────────────────────────────

export async function listLeads(userId: string, tenantId: string, filters?: {
  status?: string;
  source?: string;
  search?: string;
  recordAccess?: CrmRecordAccess;
}) {
  const conditions = [eq(crmLeads.tenantId, tenantId)];
  if (!filters?.recordAccess || filters.recordAccess === 'own') {
    conditions.push(or(
      eq(crmLeads.userId, userId),
      eq(crmLeads.assignedUserId, userId),
    )!);
  }
  conditions.push(eq(crmLeads.isArchived, false));

  if (filters?.status) {
    conditions.push(eq(crmLeads.status, filters.status));
  }
  if (filters?.source) {
    conditions.push(eq(crmLeads.source, filters.source));
  }
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(sql`(${crmLeads.name} ILIKE ${searchTerm} OR ${crmLeads.email} ILIKE ${searchTerm} OR ${crmLeads.companyName} ILIKE ${searchTerm})`);
  }

  return db.select().from(crmLeads)
    .where(and(...conditions))
    .orderBy(asc(crmLeads.sortOrder), desc(crmLeads.createdAt));
}

export async function getLead(userId: string, tenantId: string, id: string, recordAccess?: CrmRecordAccess) {
  const conditions = [eq(crmLeads.id, id), eq(crmLeads.tenantId, tenantId)];
  if (!recordAccess || recordAccess === 'own') {
    conditions.push(or(
      eq(crmLeads.userId, userId),
      eq(crmLeads.assignedUserId, userId),
    )!);
  }
  const [lead] = await db.select().from(crmLeads).where(and(...conditions)).limit(1);
  if (!lead) return null;

  // Attach convertedDealTitle via a lightweight lookup
  let convertedDealTitle: string | null = null;
  if (lead.convertedDealId) {
    const [deal] = await db
      .select({ title: crmDeals.title })
      .from(crmDeals)
      .where(eq(crmDeals.id, lead.convertedDealId))
      .limit(1);
    convertedDealTitle = deal?.title ?? null;
  }

  return { ...lead, convertedDealTitle };
}

export async function createLead(userId: string, tenantId: string, input: CreateLeadInput) {
  const now = new Date();
  const [maxSort] = await db
    .select({ max: sql<number>`COALESCE(MAX(${crmLeads.sortOrder}), -1)` })
    .from(crmLeads)
    .where(eq(crmLeads.userId, userId));

  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db.insert(crmLeads).values({
    tenantId,
    userId,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    companyName: input.companyName ?? null,
    source: input.source ?? 'other',
    status: 'new',
    notes: input.notes ?? null,
    tags: [],
    sortOrder,
    createdAt: now,
    updatedAt: now,
  }).returning();

  logger.info({ userId, leadId: created.id }, 'CRM lead created');
  return created;
}

export async function updateLead(userId: string, tenantId: string, id: string, input: UpdateLeadInput, recordAccess?: CrmRecordAccess) {
  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.name !== undefined) updates.name = input.name;
  if (input.email !== undefined) updates.email = input.email;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.companyName !== undefined) updates.companyName = input.companyName;
  if (input.source !== undefined) updates.source = input.source;
  if (input.status !== undefined) updates.status = input.status;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.expectedRevenue !== undefined) updates.expectedRevenue = input.expectedRevenue;
  if (input.probability !== undefined) updates.probability = input.probability;
  if (input.assignedUserId !== undefined) updates.assignedUserId = input.assignedUserId;
  if (input.expectedCloseDate !== undefined) updates.expectedCloseDate = input.expectedCloseDate ? new Date(input.expectedCloseDate) : null;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
  if (input.isArchived !== undefined) updates.isArchived = input.isArchived;

  const conditions = [eq(crmLeads.id, id), eq(crmLeads.tenantId, tenantId)];
  if (!recordAccess || recordAccess === 'own') {
    conditions.push(or(
      eq(crmLeads.userId, userId),
      eq(crmLeads.assignedUserId, userId),
    )!);
  }

  await db.update(crmLeads).set(updates).where(and(...conditions));
  const [updated] = await db.select().from(crmLeads).where(and(...conditions)).limit(1);
  return updated || null;
}

export async function deleteLead(userId: string, tenantId: string, id: string, recordAccess?: CrmRecordAccess) {
  await updateLead(userId, tenantId, id, { isArchived: true }, recordAccess);
}

export async function enrichLead(userId: string, tenantId: string, leadId: string) {
  const { getProviderKeyForAccount, enrichLeadWithAI } = await import('../../../services/ai.service');

  const lead = await getLead(userId, tenantId, leadId, 'all');
  if (!lead) throw new Error('Lead not found');

  const config = await getProviderKeyForAccount(tenantId);
  const enriched = await enrichLeadWithAI(config, {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    companyName: lead.companyName,
    source: lead.source,
  });

  const now = new Date();
  await db.update(crmLeads).set({ enrichedData: enriched, enrichedAt: now, updatedAt: now })
    .where(and(eq(crmLeads.id, leadId), eq(crmLeads.tenantId, tenantId)));

  // Log enrichment as an activity. crmActivities has no leadId FK, so we attach
  // to the converted contact when available; skip activity creation otherwise to
  // avoid creating a floating (unlinked) activity record.
  const summaryParts = [];
  if (enriched.companyIndustry) summaryParts.push(`Industry: ${enriched.companyIndustry}`);
  if (enriched.companySize) summaryParts.push(`Size: ${enriched.companySize}`);
  if (enriched.leadScore) summaryParts.push(`Score: ${enriched.leadScore}/100`);
  if (enriched.companyDescription) summaryParts.push(enriched.companyDescription);

  if (lead.convertedContactId) {
    await createActivity(userId, tenantId, {
      type: 'note',
      body: `__i18n:crm.activities.bodies.leadEnriched?summary=${encodeURIComponent(summaryParts.join('\n'))}`,
      contactId: lead.convertedContactId,
    });
  }

  logger.info({ userId, leadId }, 'CRM lead enriched via AI');
  return enriched;
}

export async function convertLead(userId: string, tenantId: string, leadId: string, options: {
  dealTitle: string;
  dealStageId: string;
  dealValue?: number;
}) {
  const lead = await getLead(userId, tenantId, leadId, 'all');
  if (!lead) throw new Error('Lead not found');
  if (lead.status === 'converted') throw new Error('Lead is already converted');

  // 1. Create a contact from the lead
  const contact = await createContact(userId, tenantId, {
    name: lead.name,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    source: lead.source,
    companyId: null,
  });

  // 2. Optionally create a company from lead's companyName
  let company = null;
  if (lead.companyName) {
    company = await createCompany(userId, tenantId, {
      name: lead.companyName,
    });
    // Link contact to company
    await updateContact(userId, tenantId, contact.id, { companyId: company.id }, 'all');
  }

  // 3. Create a deal
  const deal = await createDeal(userId, tenantId, {
    title: options.dealTitle,
    value: options.dealValue ?? 0,
    stageId: options.dealStageId,
    contactId: contact.id,
    companyId: company?.id ?? null,
  });

  // 4. Update lead status
  const now = new Date();
  await db.update(crmLeads).set({
    status: 'converted',
    convertedContactId: contact.id,
    convertedDealId: deal.id,
    updatedAt: now,
  }).where(eq(crmLeads.id, leadId));

  logger.info({ userId, leadId, contactId: contact.id, dealId: deal.id }, 'CRM lead converted');
  return { contact, company, deal };
}

// ─── Seed Sample Leads (standalone) ──────────────────────────────────

export async function seedSampleLeads(userId: string, tenantId: string) {
  // Idempotency guard
  const existing = await db.select({ id: crmLeads.id }).from(crmLeads)
    .where(and(eq(crmLeads.tenantId, tenantId), eq(crmLeads.isArchived, false))).limit(1);
  if (existing.length > 0) return { skipped: true, leads: 0 };

  await createLead(userId, tenantId, {
    name: 'TechStart Inc', email: 'info@techstart.io', phone: '+1-555-0201', source: 'website', companyName: 'TechStart Inc', notes: 'Interested in starter plan',
  });
  const metro = await createLead(userId, tenantId, {
    name: 'Metro Solutions', email: 'sales@metrosolutions.com', phone: '+1-555-0202', source: 'referral', companyName: 'Metro Solutions', notes: 'Called, scheduling demo',
  });
  const cloud = await createLead(userId, tenantId, {
    name: 'CloudNine Labs', email: 'hello@cloudninelabs.io', phone: '+1-555-0203', source: 'social_media', companyName: 'CloudNine Labs', notes: 'Budget approved, needs proposal',
  });

  await updateLead(userId, tenantId, metro.id, { status: 'contacted' });
  await updateLead(userId, tenantId, cloud.id, { status: 'qualified' });

  return { leads: 3 };
}

// ─── Lead Forms ───────────────────────────────────────────────────

interface LeadFormFieldDef {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
  mapTo?: string;
}

const DEFAULT_LEAD_FORM_FIELDS: LeadFormFieldDef[] = [
  { id: 'f1', type: 'text', label: 'Name', placeholder: 'Your name', required: true, mapTo: 'name' },
  { id: 'f2', type: 'email', label: 'Email', placeholder: 'your@email.com', required: true, mapTo: 'email' },
  { id: 'f3', type: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000', required: false, mapTo: 'phone' },
  { id: 'f4', type: 'text', label: 'Company', placeholder: 'Company name', required: false, mapTo: 'companyName' },
  { id: 'f5', type: 'textarea', label: 'Message', placeholder: 'How can we help?', required: false, mapTo: 'message' },
];

interface UpdateLeadFormInput {
  name?: string;
  fields?: LeadFormFieldDef[];
  isActive?: boolean;
  buttonLabel?: string;
  thankYouMessage?: string;
  accentColor?: string;
  borderColor?: string;
  borderRadius?: number;
  fontFamily?: string;
  customCss?: string | null;
}

export async function listLeadForms(userId: string, tenantId: string) {
  return db.select().from(crmLeadForms)
    .where(and(eq(crmLeadForms.tenantId, tenantId), eq(crmLeadForms.isArchived, false)))
    .orderBy(desc(crmLeadForms.createdAt));
}

export async function createLeadForm(userId: string, tenantId: string, name: string) {
  const now = new Date();
  const token = crypto.randomBytes(32).toString('hex');

  const [created] = await db.insert(crmLeadForms).values({
    tenantId,
    userId,
    name,
    token,
    fields: DEFAULT_LEAD_FORM_FIELDS,
    createdAt: now,
    updatedAt: now,
  }).returning();

  logger.info({ userId, formId: created.id }, 'CRM lead form created');
  return created;
}

/**
 * Lightweight CSS safety check. We don't rewrite the string; we reject it
 * if it contains patterns we won't serve under our own origin:
 *   - remote @import / @charset (exfiltration, slow load)
 *   - javascript: / data: URIs in url()
 *   - expression(…) / -moz-binding / behavior: (legacy IE/FX script vectors)
 *   - <script or any literal HTML tag close to </style>
 * Thrown string becomes a 400 on the route.
 */
const CSS_DISALLOWED = [
  /@import\b/i,
  /@charset\b/i,
  /expression\s*\(/i,
  /-moz-binding\b/i,
  /\bbehavior\s*:/i,
  /url\s*\(\s*["']?\s*javascript:/i,
  /url\s*\(\s*["']?\s*data:text\/html/i,
  /<\/?\s*script\b/i,
  /<\/?\s*style\b/i,
];

const CSS_MAX_BYTES = 32 * 1024;

function validateCustomCss(css: string): void {
  if (Buffer.byteLength(css, 'utf8') > CSS_MAX_BYTES) {
    throw new Error('Custom CSS exceeds 32 KB limit');
  }
  for (const rx of CSS_DISALLOWED) {
    if (rx.test(css)) {
      throw new Error(`Custom CSS contains a disallowed pattern (${rx.source})`);
    }
  }
}

function coerceHexColor(v: string, field: string): string {
  if (!/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v)) {
    throw new Error(`${field} must be a hex color like #RRGGBB`);
  }
  return v;
}

export async function updateLeadForm(userId: string, tenantId: string, id: string, input: UpdateLeadFormInput) {
  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.name !== undefined) updates.name = input.name;
  if (input.fields !== undefined) updates.fields = input.fields;
  if (input.isActive !== undefined) updates.isActive = input.isActive;
  if (input.buttonLabel !== undefined) updates.buttonLabel = input.buttonLabel.slice(0, 120);
  if (input.thankYouMessage !== undefined) updates.thankYouMessage = input.thankYouMessage;
  if (input.accentColor !== undefined) updates.accentColor = coerceHexColor(input.accentColor, 'accentColor');
  if (input.borderColor !== undefined) updates.borderColor = coerceHexColor(input.borderColor, 'borderColor');
  if (input.borderRadius !== undefined) {
    const r = Number(input.borderRadius);
    if (!Number.isFinite(r) || r < 0 || r > 32) throw new Error('borderRadius must be between 0 and 32');
    updates.borderRadius = Math.round(r);
  }
  if (input.fontFamily !== undefined) updates.fontFamily = input.fontFamily.slice(0, 64);
  if (input.customCss !== undefined) {
    if (input.customCss === null || input.customCss === '') {
      updates.customCss = null;
    } else {
      validateCustomCss(input.customCss);
      updates.customCss = input.customCss;
    }
  }

  await db.update(crmLeadForms).set(updates)
    .where(and(eq(crmLeadForms.id, id), eq(crmLeadForms.tenantId, tenantId)));

  const [updated] = await db.select().from(crmLeadForms)
    .where(and(eq(crmLeadForms.id, id), eq(crmLeadForms.tenantId, tenantId)))
    .limit(1);

  return updated || null;
}

export async function deleteLeadForm(userId: string, tenantId: string, id: string) {
  await db.update(crmLeadForms)
    .set({ isArchived: true, isActive: false, updatedAt: new Date() })
    .where(and(eq(crmLeadForms.id, id), eq(crmLeadForms.tenantId, tenantId)));
}

export async function getLeadFormByToken(token: string) {
  const [form] = await db.select().from(crmLeadForms)
    .where(and(eq(crmLeadForms.token, token), eq(crmLeadForms.isActive, true)))
    .limit(1);
  return form ?? null;
}

// ─── Public form HTML rendering ──────────────────────────────────────
// Shape used by renderPublicLeadForm — a subset of the DB row, so the same
// helper can serve a real saved form, a draft being previewed in the edit
// UI, or an on-the-fly default. Never trust customCss here — it has already
// been validated by validateCustomCss at write time (for DB rows) or at the
// preview endpoint (for drafts).
export interface LeadFormRenderData {
  token?: string;
  name: string;
  fields: LeadFormFieldDef[];
  buttonLabel: string;
  thankYouMessage: string;
  accentColor: string;
  borderColor: string;
  borderRadius: number;
  fontFamily: string;
  customCss: string | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderPublicLeadForm(
  form: LeadFormRenderData,
  opts: { submitted?: boolean; actionUrl?: string } = {},
): string {
  const submitted = opts.submitted === true;
  const actionUrl = opts.actionUrl ?? (form.token ? `/api/v1/crm/forms/public/${form.token}` : '');
  const font = form.fontFamily && form.fontFamily !== 'inherit'
    ? `${form.fontFamily}, system-ui, sans-serif`
    : 'inherit';

  const renderField = (f: LeadFormFieldDef): string => {
    const id = `atlas-field-${escapeHtml(f.id)}`;
    const required = f.required ? 'required' : '';
    const label = `<label class="atlas-lead-form__label" for="${id}">${escapeHtml(f.label)}${f.required ? ' *' : ''}</label>`;
    if (f.type === 'textarea') {
      return `<div class="atlas-lead-form__row">${label}<textarea id="${id}" name="${escapeHtml(f.id)}" class="atlas-lead-form__input atlas-lead-form__input--textarea" placeholder="${escapeHtml(f.placeholder)}" ${required} rows="4"></textarea></div>`;
    }
    if (f.type === 'select' && f.options?.length) {
      const opts = f.options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
      return `<div class="atlas-lead-form__row">${label}<select id="${id}" name="${escapeHtml(f.id)}" class="atlas-lead-form__input atlas-lead-form__input--select" ${required}>${opts}</select></div>`;
    }
    const inputType = f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text';
    return `<div class="atlas-lead-form__row">${label}<input id="${id}" name="${escapeHtml(f.id)}" type="${inputType}" class="atlas-lead-form__input" placeholder="${escapeHtml(f.placeholder)}" ${required} /></div>`;
  };

  const body = submitted
    ? `<div class="atlas-lead-form__success"><h2>${escapeHtml(form.name)}</h2><p>${escapeHtml(form.thankYouMessage)}</p></div>`
    : `<form class="atlas-lead-form" method="POST" action="${escapeHtml(actionUrl)}">
        <h2 class="atlas-lead-form__title">${escapeHtml(form.name)}</h2>
        ${form.fields.map(renderField).join('')}
        <button type="submit" class="atlas-lead-form__button">${escapeHtml(form.buttonLabel)}</button>
      </form>`;

  // Tokenised base styles — always applied. Every rule is scoped under
  // .atlas-lead-form so the form stays self-contained even when iframed.
  const baseCss = `
    body { margin: 0; padding: 24px; font-family: ${font}; background: transparent; }
    .atlas-lead-form, .atlas-lead-form__success {
      max-width: 480px;
      margin: 0 auto;
      padding: 24px;
      border: 1px solid ${form.borderColor};
      border-radius: ${form.borderRadius}px;
      background: #ffffff;
      color: #111318;
      box-sizing: border-box;
    }
    .atlas-lead-form__title { margin: 0 0 16px; font-size: 18px; font-weight: 600; }
    .atlas-lead-form__row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .atlas-lead-form__label { font-size: 13px; font-weight: 500; color: #374151; }
    .atlas-lead-form__input {
      padding: 9px 12px;
      border: 1px solid ${form.borderColor};
      border-radius: ${form.borderRadius}px;
      font: inherit;
      font-size: 14px;
      background: #ffffff;
      color: inherit;
      box-sizing: border-box;
    }
    .atlas-lead-form__input:focus { outline: none; border-color: ${form.accentColor}; box-shadow: 0 0 0 3px ${form.accentColor}22; }
    .atlas-lead-form__input--textarea { resize: vertical; min-height: 88px; }
    .atlas-lead-form__button {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 10px 18px;
      border: none;
      border-radius: ${form.borderRadius}px;
      background: ${form.accentColor};
      color: #ffffff;
      font: inherit;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
    }
    .atlas-lead-form__button:hover { filter: brightness(0.95); }
    .atlas-lead-form__success h2 { margin: 0 0 8px; }
    .atlas-lead-form__success p { margin: 0; color: #6b7280; }
  `;

  // Custom CSS is rendered AFTER the base so users can override any token.
  // It was already validated upstream (validateCustomCss / preview endpoint).
  const customCss = form.customCss ? `\n/* custom */\n${form.customCss}\n` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(form.name)}</title>
<style>${baseCss}${customCss}</style>
</head>
<body>${body}</body>
</html>`;
}

/** Re-exported for the preview endpoint to validate draft CSS without writing. */
export const __internal = { validateCustomCss, coerceHexColor };

export async function submitLeadForm(token: string, formData: Record<string, string>) {
  // Find form by token
  const [form] = await db.select().from(crmLeadForms)
    .where(and(eq(crmLeadForms.token, token), eq(crmLeadForms.isActive, true)))
    .limit(1);

  if (!form) return null;

  // Map form fields to lead fields using mapTo
  const mapped: Record<string, string> = {};
  const fields = form.fields as LeadFormFieldDef[];
  for (const field of fields) {
    if (field.mapTo && formData[field.id]) {
      mapped[field.mapTo] = formData[field.id];
    }
  }
  // Also support direct field name submission (backward compat)
  if (!mapped.name && formData.name) mapped.name = formData.name;
  if (!mapped.email && formData.email) mapped.email = formData.email;
  if (!mapped.phone && formData.phone) mapped.phone = formData.phone;
  if (!mapped.companyName && formData.companyName) mapped.companyName = formData.companyName;
  if (!mapped.message && formData.message) mapped.message = formData.message;

  // Create lead using existing createLead function
  const lead = await createLead(form.userId, form.tenantId, {
    name: mapped.name || 'Web form submission',
    email: mapped.email ?? null,
    phone: mapped.phone ?? null,
    companyName: mapped.companyName ?? null,
    source: 'website',
    notes: mapped.message ?? null,
  });

  // Increment submit count
  await db.update(crmLeadForms).set({
    submitCount: sql`${crmLeadForms.submitCount} + 1`,
    updatedAt: new Date(),
  }).where(eq(crmLeadForms.id, form.id));

  logger.info({ formId: form.id, leadId: lead.id }, 'CRM lead form submitted');
  return lead;
}
