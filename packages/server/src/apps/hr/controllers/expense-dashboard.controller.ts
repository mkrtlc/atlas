import type { Request, Response } from 'express';
import * as expenseDashboardService from '../services/expense-dashboard.service';
import { logger } from '../../../utils/logger';
import { getAppPermission, canAccess } from '../../../services/app-permissions.service';

// ─── Expense Dashboard ──────────────────────────────────────────────

export async function getExpenseDashboard(req: Request, res: Response) {
  try {
    const tenantId = req.auth!.tenantId;

    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'hr');
    if (!canAccess(perm.role, 'view')) {
      res.status(403).json({ success: false, error: 'No permission to view HR data' });
      return;
    }

    const data = await expenseDashboardService.getExpenseDashboard(tenantId!);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to get expense dashboard');
    res.status(500).json({ success: false, error: 'Failed to get expense dashboard' });
  }
}
