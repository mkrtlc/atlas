import type { Request, Response } from 'express';
import { db } from '../../../config/database';
import { crmCompanies, invoices, invoiceLineItems } from '../../../db/schema';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { logger } from '../../../utils/logger';
import { markInvoiceViewed } from '../services/invoice.service';

// ─── Portal (public, token-based) ──────────────────────────────────

async function getCompanyByPortalToken(portalToken: string) {
  const [company] = await db
    .select({
      id: crmCompanies.id,
      tenantId: crmCompanies.tenantId,
      name: crmCompanies.name,
    })
    .from(crmCompanies)
    .where(and(
      eq(crmCompanies.portalToken, portalToken),
      eq(crmCompanies.isArchived, false),
    ))
    .limit(1);

  return company || null;
}

export async function getPortalInvoices(req: Request, res: Response) {
  try {
    const token = req.params.token as string;
    if (!token) {
      res.status(400).json({ success: false, error: 'Portal token is required' });
      return;
    }

    const company = await getCompanyByPortalToken(token);
    if (!company) {
      res.status(404).json({ success: false, error: 'Invalid portal token' });
      return;
    }

    const invoiceList = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        total: invoices.total,
        currency: invoices.currency,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        sentAt: invoices.sentAt,
        paidAt: invoices.paidAt,
      })
      .from(invoices)
      .where(and(
        eq(invoices.companyId, company.id),
        eq(invoices.tenantId, company.tenantId),
        eq(invoices.isArchived, false),
        sql`${invoices.status} != 'draft'`,
      ))
      .orderBy(desc(invoices.createdAt));

    res.json({ success: true, data: { company: { name: company.name }, invoices: invoiceList } });
  } catch (error) {
    logger.error({ error }, 'Failed to get portal invoices');
    res.status(500).json({ success: false, error: 'Failed to get portal invoices' });
  }
}

export async function getPortalInvoice(req: Request, res: Response) {
  try {
    const token = req.params.token as string;
    const invoiceId = req.params.invoiceId as string;
    if (!token || !invoiceId) {
      res.status(400).json({ success: false, error: 'Portal token and invoice ID are required' });
      return;
    }

    const company = await getCompanyByPortalToken(token);
    if (!company) {
      res.status(404).json({ success: false, error: 'Invalid portal token' });
      return;
    }

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.id, invoiceId),
        eq(invoices.companyId, company.id),
        eq(invoices.tenantId, company.tenantId),
        eq(invoices.isArchived, false),
        sql`${invoices.status} != 'draft'`,
      ))
      .limit(1);

    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    // Mark as viewed (first time only)
    await markInvoiceViewed(company.tenantId, invoiceId);

    // Fetch line items
    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId))
      .orderBy(asc(invoiceLineItems.sortOrder), asc(invoiceLineItems.createdAt));

    res.json({
      success: true,
      data: {
        company: { name: company.name },
        invoice: { ...invoice, lineItems },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get portal invoice');
    res.status(500).json({ success: false, error: 'Failed to get portal invoice' });
  }
}
