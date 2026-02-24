import type { Request, Response } from 'express';
import * as trackingService from '../services/tracking.service';
import { logger } from '../utils/logger';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getIp(req: Request): string | undefined {
  const ip = req.ip;
  return typeof ip === 'string' ? ip : undefined;
}

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : undefined;
}

export async function handleOpen(req: Request, res: Response) {
  const trackingId = req.params.trackingId as string;
  const gif = trackingService.getTrackingPixelBuffer();

  // Always return the GIF — tracking is best-effort
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.end(gif);

  // Record asynchronously — don't block the response
  if (UUID_REGEX.test(trackingId)) {
    trackingService.recordOpenEvent(
      trackingId,
      getIp(req),
      getUserAgent(req),
    ).catch(() => {});
  }
}

export async function handleClick(req: Request, res: Response) {
  const trackingId = req.params.trackingId as string;
  const url = req.query.u as string | undefined;

  // Validate URL — must be http(s) to prevent open redirect abuse
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    res.status(400).send('Invalid redirect URL');
    return;
  }

  // Always redirect — tracking is best-effort
  res.redirect(302, url);

  // Record asynchronously
  if (UUID_REGEX.test(trackingId)) {
    trackingService.recordClickEvent(
      trackingId,
      url,
      getIp(req),
      getUserAgent(req),
    ).catch(() => {});
  }
}

export async function getThreadTracking(req: Request, res: Response) {
  try {
    const threadId = req.params.id as string;
    const stats = await trackingService.getThreadTrackingStats(
      req.auth!.accountId,
      threadId,
    );
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch tracking stats');
    res.status(500).json({ success: false, error: 'Failed to fetch tracking data' });
  }
}
