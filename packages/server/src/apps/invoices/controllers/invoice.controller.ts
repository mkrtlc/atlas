import type { Request, Response } from 'express';
import * as invoiceService from '../services/invoice.service';
import { logger } from '../../../utils/logger';
import { getAppPermission, canAccess } from '../../../services/app-permissions.service';
import { emitAppEvent } from '../../../services/event.service';

// ─── Invoices ───────────────────────────────────────────────────────

export async function listInvoices(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'invoices');
    if (!canAccess(perm.role, 'view')) {
      res.status(403).json({ success: false, error: 'No permission to view invoices' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const { companyId, contactId, dealId, status, search, includeArchived } = req.query;

    const isAdmin = perm.role === 'admin' || perm.role === 'manager';
    const invoicesList = await invoiceService.listInvoices(userId, tenantId, {
      companyId: companyId as string | undefined,
      contactId: contactId as string | undefined,
      dealId: dealId as string | undefined,
      status: status as string | undefined,
      search: search as string | undefined,
      includeArchived: includeArchived === 'true',
      isAdmin,
    });

    res.json({ success: true, data: { invoices: invoicesList } });
  } catch (error) {
    logger.error({ error }, 'Failed to list invoices');
    res.status(500).json({ success: false, error: 'Failed to list invoices' });
  }
}

export async function getInvoice(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'invoices');
    if (!canAccess(perm.role, 'view')) {
      res.status(403).json({ success: false, error: 'No permission to view invoices' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;

    const invoice = await invoiceService.getInvoice(userId, tenantId, id);
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    logger.error({ error }, 'Failed to get invoice');
    res.status(500).json({ success: false, error: 'Failed to get invoice' });
  }
}

export async function getNextInvoiceNumber(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'invoices');
    if (!canAccess(perm.role, 'view')) {
      res.status(403).json({ success: false, error: 'No permission to view invoices' });
      return;
    }

    const tenantId = req.auth!.tenantId;
    const invoiceNumber = await invoiceService.getNextInvoiceNumber(tenantId);
    res.json({ success: true, data: { invoiceNumber } });
  } catch (error) {
    logger.error({ error }, 'Failed to get next invoice number');
    res.status(500).json({ success: false, error: 'Failed to get next invoice number' });
  }
}

export async function createInvoice(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'invoices');
    if (!canAccess(perm.role, 'create')) {
      res.status(403).json({ success: false, error: 'No permission to create invoices' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const {
      companyId, contactId, dealId, proposalId,
      invoiceNumber, status, subtotal, taxPercent, taxAmount,
      discountPercent, discountAmount, total, currency,
      issueDate, dueDate, notes, timeEntryIds,
    } = req.body;

    if (!companyId) {
      res.status(400).json({ success: false, error: 'companyId is required' });
      return;
    }

    const invoice = await invoiceService.createInvoice(userId, tenantId, {
      companyId, contactId, dealId, proposalId,
      invoiceNumber, status, subtotal, taxPercent, taxAmount,
      discountPercent, discountAmount, total, currency,
      issueDate, dueDate, notes, timeEntryIds,
    });

    res.json({ success: true, data: invoice });
  } catch (error) {
    logger.error({ error }, 'Failed to create invoice');
    res.status(500).json({ success: false, error: 'Failed to create invoice' });
  }
}

export async function updateInvoice(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'invoices');
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update invoices' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;
    const {
      companyId, contactId, dealId, proposalId,
      invoiceNumber, status, subtotal, taxPercent, taxAmount,
      discountPercent, discountAmount, total, currency,
      issueDate, dueDate, notes, isArchived,
    } = req.body;

    const invoice = await invoiceService.updateInvoice(userId, tenantId, id, {
      companyId, contactId, dealId, proposalId,
      invoiceNumber, status, subtotal, taxPercent, taxAmount,
      discountPercent, discountAmount, total, currency,
      issueDate, dueDate, notes, isArchived,
    });

    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    logger.error({ error }, 'Failed to update invoice');
    res.status(500).json({ success: false, error: 'Failed to update invoice' });
  }
}

export async function deleteInvoice(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'invoices');
    if (!canAccess(perm.role, 'delete') && !canAccess(perm.role, 'delete_own')) {
      res.status(403).json({ success: false, error: 'No permission to delete invoices' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;

    await invoiceService.deleteInvoice(userId, tenantId, id);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to delete invoice');
    res.status(500).json({ success: false, error: 'Failed to delete invoice' });
  }
}

export async function sendInvoice(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'invoices');
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update invoices' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;

    const invoice = await invoiceService.sendInvoice(userId, tenantId, id);
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    // Get full invoice for event metadata
    const fullInvoice = await invoiceService.getInvoice(userId, tenantId, id);

    if (req.auth!.tenantId) {
      emitAppEvent({
        tenantId: req.auth!.tenantId,
        userId,
        appId: 'invoices',
        eventType: 'invoice.sent',
        title: `sent invoice ${invoice.invoiceNumber} to ${fullInvoice?.companyName ?? 'client'}`,
        metadata: { invoiceId: invoice.id },
      }).catch(() => {});
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    logger.error({ error }, 'Failed to send invoice');
    res.status(500).json({ success: false, error: 'Failed to send invoice' });
  }
}

export async function markInvoicePaid(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'invoices');
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update invoices' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;

    const invoice = await invoiceService.markInvoicePaid(userId, tenantId, id);
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    if (req.auth!.tenantId) {
      emitAppEvent({
        tenantId: req.auth!.tenantId,
        userId,
        appId: 'invoices',
        eventType: 'invoice.paid',
        title: `invoice ${invoice.invoiceNumber} marked as paid`,
        metadata: { invoiceId: invoice.id },
      }).catch(() => {});
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    logger.error({ error }, 'Failed to mark invoice paid');
    res.status(500).json({ success: false, error: 'Failed to mark invoice paid' });
  }
}

export async function waiveInvoice(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'invoices');
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update invoices' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;

    const invoice = await invoiceService.waiveInvoice(userId, tenantId, id);
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    logger.error({ error }, 'Failed to waive invoice');
    res.status(500).json({ success: false, error: 'Failed to waive invoice' });
  }
}

export async function duplicateInvoice(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'invoices');
    if (!canAccess(perm.role, 'create')) {
      res.status(403).json({ success: false, error: 'No permission to create invoices' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;

    const invoice = await invoiceService.duplicateInvoice(userId, tenantId, id);
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    logger.error({ error }, 'Failed to duplicate invoice');
    res.status(500).json({ success: false, error: 'Failed to duplicate invoice' });
  }
}
