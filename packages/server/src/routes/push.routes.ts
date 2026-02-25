import { Router } from 'express';
import type { Request, Response } from 'express';
import { handlePushNotification } from '../services/sync.service';
import { logger } from '../utils/logger';

const router = Router();

// Simple in-memory deduplication: track recent (emailAddress, historyId) pairs
// to avoid processing duplicate Pub/Sub deliveries.
const recentNotifications = new Map<string, number>();
const DEDUP_TTL_MS = 60_000; // 60 seconds

function isDuplicate(emailAddress: string, historyId: number): boolean {
  const key = `${emailAddress}:${historyId}`;
  const now = Date.now();

  // Prune stale entries periodically (every 100 checks)
  if (recentNotifications.size > 100) {
    for (const [k, ts] of recentNotifications) {
      if (now - ts > DEDUP_TTL_MS) recentNotifications.delete(k);
    }
  }

  if (recentNotifications.has(key)) return true;
  recentNotifications.set(key, now);
  return false;
}

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

    const parsedHistoryId = parseInt(String(historyId), 10);
    if (isNaN(parsedHistoryId)) {
      res.status(400).json({ error: 'Invalid historyId' });
      return;
    }

    // Acknowledge immediately
    res.status(200).json({ success: true });

    // Skip duplicates (Pub/Sub at-least-once delivery)
    if (isDuplicate(emailAddress, parsedHistoryId)) {
      logger.debug({ emailAddress, historyId: parsedHistoryId }, 'Duplicate push notification, skipping');
      return;
    }

    logger.info({ emailAddress, historyId: parsedHistoryId }, 'Received Gmail push notification');

    handlePushNotification(emailAddress, parsedHistoryId).catch((err) => {
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
