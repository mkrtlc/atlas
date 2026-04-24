import type { Request, Response } from 'express';
import * as crmService from '../services/lead.service';
import { logger } from '../../../utils/logger';
import { canAccessEntity } from '../../../services/app-permissions.service';
import { emitAppEvent, getTenantMemberUserIds } from '../../../services/event.service';

// ─── Leads ──────────────────────────────────────────────────────────

export async function listLeads(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const { status, source, search } = req.query;

    const perm = req.crmPerm!;
    if (!canAccessEntity(perm.role, 'leads', 'view', perm.entityPermissions)) {
      res.status(403).json({ success: false, error: 'No access to leads' });
      return;
    }

    const leads = await crmService.listLeads(userId, tenantId, {
      status: status as string | undefined,
      source: source as string | undefined,
      search: search as string | undefined,
      recordAccess: perm.recordAccess,
    });
    res.json({ success: true, data: { leads } });
  } catch (error) {
    logger.error({ error }, 'Failed to list CRM leads');
    res.status(500).json({ success: false, error: 'Failed to list leads' });
  }
}

export async function getLead(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;

    const perm = req.crmPerm!;
    const lead = await crmService.getLead(userId, tenantId, id, perm.recordAccess);
    if (!lead) {
      res.status(404).json({ success: false, error: 'Lead not found' });
      return;
    }
    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error({ error }, 'Failed to get CRM lead');
    res.status(500).json({ success: false, error: 'Failed to get lead' });
  }
}

export async function createLead(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const { name, email, phone, companyName, source, notes } = req.body;

    const perm = req.crmPerm!;
    if (!canAccessEntity(perm.role, 'leads', 'create', perm.entityPermissions)) {
      res.status(403).json({ success: false, error: 'No permission to create leads' });
      return;
    }

    if (!name?.trim()) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }

    const lead = await crmService.createLead(userId, tenantId, {
      name: name.trim(), email, phone, companyName, source, notes,
    });

    if (req.auth!.tenantId) {
      emitAppEvent({
        tenantId: req.auth!.tenantId,
        userId,
        appId: 'crm',
        eventType: 'lead.created',
        title: `new lead: ${lead.name}`,
        metadata: { leadId: lead.id, source: lead.source },
        notifyUserIds: await getTenantMemberUserIds(req.auth!.tenantId),
      }).catch(() => {});
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error({ error }, 'Failed to create CRM lead');
    res.status(500).json({ success: false, error: 'Failed to create lead' });
  }
}

export async function updateLead(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;
    const { name, email, phone, companyName, source, status, notes, tags, sortOrder, isArchived } = req.body;

    const perm = req.crmPerm!;
    if (!canAccessEntity(perm.role, 'leads', 'update', perm.entityPermissions)) {
      res.status(403).json({ success: false, error: 'No permission to update leads' });
      return;
    }

    const lead = await crmService.updateLead(userId, tenantId, id, {
      name, email, phone, companyName, source, status, notes, tags, sortOrder, isArchived,
    }, perm.recordAccess);

    if (!lead) {
      res.status(404).json({ success: false, error: 'Lead not found' });
      return;
    }
    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error({ error }, 'Failed to update CRM lead');
    res.status(500).json({ success: false, error: 'Failed to update lead' });
  }
}

export async function deleteLead(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;

    const perm = req.crmPerm!;
    if (!canAccessEntity(perm.role, 'leads', 'delete', perm.entityPermissions)) {
      res.status(403).json({ success: false, error: 'No permission to delete leads' });
      return;
    }

    await crmService.deleteLead(userId, tenantId, id, perm.recordAccess);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to delete CRM lead');
    res.status(500).json({ success: false, error: 'Failed to delete lead' });
  }
}

export async function enrichLead(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;

    const perm = req.crmPerm!;
    if (!canAccessEntity(perm.role, 'leads', 'update', perm.entityPermissions)) {
      res.status(403).json({ success: false, error: 'No permission' });
      return;
    }

    const data = await crmService.enrichLead(userId, tenantId, id);
    res.json({ success: true, data });
  } catch (error: any) {
    const message = error?.message || 'Failed to enrich lead';
    logger.error({ error }, 'Failed to enrich CRM lead');
    res.status(error?.message?.includes('not enabled') || error?.message?.includes('No API key') ? 400 : 500)
      .json({ success: false, error: message });
  }
}

export async function convertLead(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;
    const { dealTitle, dealStageId, dealValue } = req.body;

    const perm = req.crmPerm!;
    if (!canAccessEntity(perm.role, 'leads', 'update', perm.entityPermissions)) {
      res.status(403).json({ success: false, error: 'No permission' });
      return;
    }
    if (!canAccessEntity(perm.role, 'deals', 'create', perm.entityPermissions)) {
      res.status(403).json({ success: false, error: 'No permission to create deals' });
      return;
    }

    if (!dealTitle?.trim()) {
      res.status(400).json({ success: false, error: 'Deal title is required' });
      return;
    }
    if (!dealStageId) {
      res.status(400).json({ success: false, error: 'Deal stage is required' });
      return;
    }

    // Fetch lead name before conversion for the notification title
    const leadBeforeConvert = await crmService.getLead(userId, tenantId, id, 'all');

    const result = await crmService.convertLead(userId, tenantId, id, {
      dealTitle: dealTitle.trim(), dealStageId, dealValue,
    });

    if (req.auth!.tenantId && leadBeforeConvert) {
      emitAppEvent({
        tenantId: req.auth!.tenantId,
        userId,
        appId: 'crm',
        eventType: 'lead.converted',
        title: `converted lead "${leadBeforeConvert.name}" to deal`,
        metadata: { leadId: id, dealId: result.deal.id },
      }).catch(() => {});
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error?.message?.includes('not found') || error?.message?.includes('already converted')) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    logger.error({ error }, 'Failed to convert CRM lead');
    res.status(500).json({ success: false, error: 'Failed to convert lead' });
  }
}

export async function seedSampleLeads(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;

    const perm = req.crmPerm!;
    if (perm.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin only' });
      return;
    }

    const result = await crmService.seedSampleLeads(userId, tenantId);
    res.json({ success: true, data: { message: 'Seeded CRM sample leads', ...result } });
  } catch (error) {
    logger.error({ error }, 'Failed to seed CRM sample leads');
    res.status(500).json({ success: false, error: 'Failed to seed sample leads' });
  }
}

// ─── Lead Forms ────────────────────────────────────────────────────

export async function listLeadForms(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;

    const perm = req.crmPerm!;
    if (!canAccessEntity(perm.role, 'leads', 'view', perm.entityPermissions)) {
      res.status(403).json({ success: false, error: 'No permission' });
      return;
    }

    const forms = await crmService.listLeadForms(userId, tenantId);
    res.json({ success: true, data: { forms } });
  } catch (error) {
    logger.error({ error }, 'Failed to list CRM lead forms');
    res.status(500).json({ success: false, error: 'Failed to list lead forms' });
  }
}

export async function createLeadForm(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const { name } = req.body;

    const perm = req.crmPerm!;
    if (!canAccessEntity(perm.role, 'leads', 'create', perm.entityPermissions)) {
      res.status(403).json({ success: false, error: 'No permission' });
      return;
    }

    const form = await crmService.createLeadForm(userId, tenantId, name || 'Default Lead Form');
    res.json({ success: true, data: form });
  } catch (error) {
    logger.error({ error }, 'Failed to create CRM lead form');
    res.status(500).json({ success: false, error: 'Failed to create lead form' });
  }
}

export async function updateLeadForm(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;
    const {
      name, fields, isActive,
      buttonLabel, thankYouMessage,
      accentColor, borderColor, borderRadius, fontFamily,
      customCss,
    } = req.body;

    const perm = req.crmPerm!;
    if (!canAccessEntity(perm.role, 'leads', 'update', perm.entityPermissions)) {
      res.status(403).json({ success: false, error: 'No permission' });
      return;
    }

    const form = await crmService.updateLeadForm(userId, tenantId, id, {
      name, fields, isActive,
      buttonLabel, thankYouMessage,
      accentColor, borderColor, borderRadius, fontFamily,
      customCss,
    });

    if (!form) {
      res.status(404).json({ success: false, error: 'Lead form not found' });
      return;
    }
    res.json({ success: true, data: form });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update lead form';
    if (/must be|disallowed pattern|exceeds/.test(message)) {
      res.status(400).json({ success: false, error: message });
      return;
    }
    logger.error({ error }, 'Failed to update CRM lead form');
    res.status(500).json({ success: false, error: 'Failed to update lead form' });
  }
}

export async function deleteLeadForm(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;

    const perm = req.crmPerm!;
    if (!canAccessEntity(perm.role, 'leads', 'delete', perm.entityPermissions)) {
      res.status(403).json({ success: false, error: 'No permission' });
      return;
    }

    await crmService.deleteLeadForm(userId, tenantId, id);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to delete CRM lead form');
    res.status(500).json({ success: false, error: 'Failed to delete lead form' });
  }
}

export async function submitLeadForm(req: Request, res: Response) {
  try {
    const token = req.params.token as string;
    const { name, email, phone, companyName, message } = req.body;

    const result = await crmService.submitLeadForm(token, {
      name, email, phone, companyName, message,
    });

    if (!result) {
      res.status(404).json({ success: false, error: 'Form not found or inactive' });
      return;
    }

    const { lead, form } = result;

    // HTML form submissions send urlencoded content-type; render the form's
    // own branded "thank you" page so the submitter stays in the same visual
    // context as the form they just filled in.
    const contentType = req.headers['content-type'] || '';
    const acceptHeader = req.headers.accept || '';
    if (contentType.includes('application/x-www-form-urlencoded') || acceptHeader.includes('text/html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(crmService.renderPublicLeadForm({
        token: form.token,
        name: form.name,
        fields: form.fields as any,
        buttonLabel: form.buttonLabel,
        thankYouMessage: form.thankYouMessage,
        accentColor: form.accentColor,
        borderColor: form.borderColor,
        borderRadius: form.borderRadius,
        fontFamily: form.fontFamily,
        customCss: form.customCss,
      }, { submitted: true }));
      return;
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    logger.error({ error }, 'Failed to submit lead form');
    res.status(500).json({ success: false, error: 'Failed to submit form' });
  }
}

/**
 * GET /api/v1/crm/forms/public/:token — no auth. Serves the branded HTML
 * form. This is the URL the iframe embed snippet points at.
 */
export async function getPublicLeadForm(req: Request, res: Response) {
  try {
    const token = req.params.token as string;
    const form = await crmService.getLeadFormByToken(token);
    if (!form) {
      res.status(404).type('html').send('<!DOCTYPE html><html><body><p>Form not found.</p></body></html>');
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Allow embedding in iframes on any origin — this IS the public form.
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.removeHeader?.('Content-Security-Policy');
    res.send(crmService.renderPublicLeadForm({
      token: form.token,
      name: form.name,
      fields: form.fields as any,
      buttonLabel: form.buttonLabel,
      thankYouMessage: form.thankYouMessage,
      accentColor: form.accentColor,
      borderColor: form.borderColor,
      borderRadius: form.borderRadius,
      fontFamily: form.fontFamily,
      customCss: form.customCss,
    }));
  } catch (error) {
    logger.error({ error }, 'Failed to render CRM public lead form');
    res.status(500).type('html').send('<!DOCTYPE html><html><body><p>Error rendering form.</p></body></html>');
  }
}

/**
 * POST /api/v1/crm/forms/preview — admin-only. The edit UI posts its
 * current draft here and receives HTML for the live iframe preview.
 * Validates the draft CSS/colors so the preview surfaces the same errors
 * the save endpoint would.
 */
export async function previewLeadForm(req: Request, res: Response) {
  try {
    const body = req.body ?? {};
    const safe = {
      token: undefined,
      name: typeof body.name === 'string' ? body.name : 'Preview',
      fields: Array.isArray(body.fields) ? body.fields : [],
      buttonLabel: typeof body.buttonLabel === 'string' ? body.buttonLabel.slice(0, 120) : 'Submit',
      thankYouMessage: typeof body.thankYouMessage === 'string' ? body.thankYouMessage : "Thanks! We'll be in touch.",
      accentColor: typeof body.accentColor === 'string' ? body.accentColor : '#13715B',
      borderColor: typeof body.borderColor === 'string' ? body.borderColor : '#d0d5dd',
      borderRadius: Number.isFinite(Number(body.borderRadius)) ? Math.max(0, Math.min(32, Math.round(Number(body.borderRadius)))) : 6,
      fontFamily: typeof body.fontFamily === 'string' ? body.fontFamily.slice(0, 64) : 'inherit',
      customCss: typeof body.customCss === 'string' && body.customCss.length > 0 ? body.customCss : null,
    };
    // Validate the bits that would fail at save time. We want the preview
    // to complain before the user hits Save, not after.
    try {
      crmService.__internal.coerceHexColor(safe.accentColor, 'accentColor');
      crmService.__internal.coerceHexColor(safe.borderColor, 'borderColor');
      if (safe.customCss) crmService.__internal.validateCustomCss(safe.customCss);
    } catch (validationErr) {
      const message = validationErr instanceof Error ? validationErr.message : 'Invalid draft';
      res.status(400).json({ success: false, error: message });
      return;
    }
    const submitted = body.submitted === true;
    const html = crmService.renderPublicLeadForm(safe, { submitted });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    logger.error({ error }, 'Failed to preview CRM lead form');
    res.status(500).json({ success: false, error: 'Failed to preview form' });
  }
}
