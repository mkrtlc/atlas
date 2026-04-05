import { Router, type Request, type Response } from 'express';
import { adminAuthMiddleware } from '../middleware/admin-auth';
import { logger } from '../utils/logger';

const router = Router();

// All routes require admin auth
router.use(adminAuthMiddleware);

const WATCHTOWER_URL = process.env.WATCHTOWER_URL || 'http://atlas-watchtower:8080';
const WATCHTOWER_TOKEN = process.env.WATCHTOWER_API_TOKEN || 'atlas-watchtower-token';

/**
 * GET /api/v1/updates/status
 * Check if Watchtower is running and get its status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${WATCHTOWER_URL}/v1/update`, {
      method: 'HEAD',
      headers: { Authorization: `Bearer ${WATCHTOWER_TOKEN}` },
      signal: AbortSignal.timeout(3000),
    });
    res.json({
      success: true,
      data: {
        autoUpdateEnabled: true,
        watchtowerReachable: response.ok,
      },
    });
  } catch {
    res.json({
      success: true,
      data: {
        autoUpdateEnabled: false,
        watchtowerReachable: false,
      },
    });
  }
});

/**
 * POST /api/v1/updates/check
 * Trigger Watchtower to check for updates now
 */
router.post('/check', async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${WATCHTOWER_URL}/v1/update`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${WATCHTOWER_TOKEN}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      res.status(502).json({ success: false, error: 'Watchtower returned an error' });
      return;
    }

    logger.info('Update check triggered via Watchtower API');
    res.json({ success: true, data: { message: 'Update check triggered' } });
  } catch (error: any) {
    logger.warn({ error: error?.message }, 'Failed to reach Watchtower for update check');
    res.status(503).json({
      success: false,
      error: 'Auto-update service is not running. Enable it with: docker compose --profile auto-update up -d',
    });
  }
});

export default router;
