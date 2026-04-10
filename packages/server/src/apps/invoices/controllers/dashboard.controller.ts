import type { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { logger } from '../../../utils/logger';

export async function getInvoicesDashboard(req: Request, res: Response) {
  try {
    const tenantId = req.auth!.tenantId;
    const data = await dashboardService.getInvoicesDashboard(tenantId!);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to get invoices dashboard');
    res.status(500).json({ success: false, error: 'Failed to get invoices dashboard' });
  }
}
