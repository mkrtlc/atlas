import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as presenceService from '../services/presence.service';
import { logger } from '../utils/logger';

const router = Router();

router.use(authMiddleware);

// POST /presence/heartbeat — body: { appId, recordId }
router.post('/heartbeat', async (req: Request, res: Response) => {
  try {
    const { appId, recordId } = req.body;
    if (!appId || !recordId) {
      res.status(400).json({ success: false, error: 'appId and recordId are required' });
      return;
    }
    const tenantId = req.auth!.tenantId;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant context required' });
      return;
    }
    await presenceService.upsertHeartbeat(req.auth!.userId, tenantId, appId, recordId);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to upsert presence heartbeat');
    res.status(500).json({ success: false, error: 'Failed to upsert heartbeat' });
  }
});

// GET /presence/:appId/:recordId — returns active viewers
router.get('/:appId/:recordId', async (req: Request, res: Response) => {
  try {
    const appId = req.params.appId as string;
    const recordId = req.params.recordId as string;
    const tenantId = req.auth!.tenantId;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant context required' });
      return;
    }
    const viewers = await presenceService.getActiveViewers(
      tenantId,
      appId,
      recordId,
      req.auth!.userId,
    );
    res.json({ success: true, data: viewers });
  } catch (error) {
    logger.error({ error }, 'Failed to get active viewers');
    res.status(500).json({ success: false, error: 'Failed to get active viewers' });
  }
});

export default router;
