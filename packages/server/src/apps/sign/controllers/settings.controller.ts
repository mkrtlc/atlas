import type { Request, Response } from 'express';
import * as settingsService from '../services/settings.service';
import { canAccess } from '../../../services/app-permissions.service';
import { logger } from '../../../utils/logger';

// ─── Settings ──────────────────────────────────────────────────────

export async function getSettings(req: Request, res: Response) {
  try {
    const tenantId = req.auth!.tenantId!;
    const settings = await settingsService.getSettings(tenantId);
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error({ error }, 'Failed to get sign settings');
    res.status(500).json({ success: false, error: 'Failed to get sign settings' });
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    const perm = req.signPerm!;
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update sign settings' });
      return;
    }

    const tenantId = req.auth!.tenantId!;
    const { reminderCadenceDays, signatureExpiryDays } = req.body;

    const clampDays = (n: unknown): number | undefined => {
      if (n === undefined || n === null) return undefined;
      const parsed = typeof n === 'number' ? n : parseInt(String(n), 10);
      if (Number.isNaN(parsed)) return undefined;
      return Math.max(1, Math.min(365, Math.round(parsed)));
    };

    const settings = await settingsService.updateSettings(tenantId, {
      reminderCadenceDays: clampDays(reminderCadenceDays),
      signatureExpiryDays: clampDays(signatureExpiryDays),
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error({ error }, 'Failed to update sign settings');
    res.status(500).json({ success: false, error: 'Failed to update sign settings' });
  }
}
