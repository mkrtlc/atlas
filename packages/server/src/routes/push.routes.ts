import { Router } from 'express';
import type { Request, Response } from 'express';
import { handlePushNotification } from '../services/sync.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Gmail push notification webhook.
 *
 * Google Pub/Sub sends a POST with a base64-encoded JSON body:
 * { message: { data: base64("{ emailAddress, historyId }") } }
 *
 * This endpoint is unauthenticated (Pub/Sub cannot send JWTs) but safe
 * because handlePushNotification only triggers an incremental sync which
 * requires valid OAuth tokens stored in the DB.
 */
router.post('/gmail', async (req: Request, res: Response) => {
  try {
    const message = req.body?.message;
    if (!message?.data) {
      res.status(400).json({ error: 'Missing message data' });
      return;
    }

    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf8'));
    const { emailAddress, historyId } = decoded;

    if (!emailAddress || !historyId) {
      res.status(400).json({ error: 'Missing emailAddress or historyId' });
      return;
    }

    logger.info({ emailAddress, historyId }, 'Received Gmail push notification');

    // Acknowledge immediately, process in background (fire-and-forget)
    res.status(200).json({ success: true });

    // Run sync after responding — no await to avoid headers-already-sent errors
    handlePushNotification(emailAddress, parseInt(String(historyId), 10)).catch((err) => {
      logger.error({ err, emailAddress }, 'Push-triggered sync failed in background');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to process Gmail push notification');
    if (!res.headersSent) {
      res.status(200).json({ success: true });
    }
  }
});

export default router;
