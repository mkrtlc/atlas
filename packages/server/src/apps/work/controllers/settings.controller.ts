import type { Request, Response } from 'express';
import * as settingsService from '../services/settings.service';
import { canAccess } from '../../../services/app-permissions.service';
import { logger } from '../../../utils/logger';

const WEEK_START_DAYS = new Set(['monday', 'sunday', 'saturday']);
const PROJECT_VISIBILITIES = new Set(['team', 'private']);

export async function getSettings(req: Request, res: Response) {
  try {
    const tenantId = req.auth!.tenantId!;
    const settings = await settingsService.getSettings(tenantId);
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error({ error }, 'Failed to get work settings');
    res.status(500).json({ success: false, error: 'Failed to get work settings' });
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    const perm = req.workPerm!;
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update work settings' });
      return;
    }

    const tenantId = req.auth!.tenantId!;
    const { weekStartDay, defaultProjectVisibility, defaultBillable } = req.body ?? {};

    const cleanWeekStartDay = typeof weekStartDay === 'string' && WEEK_START_DAYS.has(weekStartDay)
      ? (weekStartDay as 'monday' | 'sunday' | 'saturday')
      : undefined;
    const cleanVisibility = typeof defaultProjectVisibility === 'string' && PROJECT_VISIBILITIES.has(defaultProjectVisibility)
      ? (defaultProjectVisibility as 'team' | 'private')
      : undefined;
    const cleanBillable = typeof defaultBillable === 'boolean' ? defaultBillable : undefined;

    const settings = await settingsService.updateSettings(tenantId, {
      weekStartDay: cleanWeekStartDay,
      defaultProjectVisibility: cleanVisibility,
      defaultBillable: cleanBillable,
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error({ error }, 'Failed to update work settings');
    res.status(500).json({ success: false, error: 'Failed to update work settings' });
  }
}
