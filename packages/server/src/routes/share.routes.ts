import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import * as driveService from '../apps/drive/service';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { driveItems } from '../db/schema';
import { eq } from 'drizzle-orm';
import path from 'node:path';
import { existsSync, createReadStream, statSync } from 'node:fs';
import { handlePublicUpload } from '../apps/drive/controllers/public-upload.controller';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB per file
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => `${req.params.token}:${req.ip}`,
  message: { success: false, error: 'Too many uploads. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function handleMulterError(err: unknown, _req: Request, res: Response, next: Function) {
  const error = err as { code?: string; message?: string };
  if (error?.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ success: false, error: 'File too large (max 100 MB)' });
    return;
  }
  if (error?.message) {
    res.status(400).json({ success: false, error: error.message });
    return;
  }
  next();
}

// GET /api/v1/share/:token — public file metadata
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;
    const item = await driveService.getItemByShareToken(token);

    if (!item) {
      res.status(404).json({ success: false, error: 'Link expired or not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        name: item.name,
        type: item.type,
        mimeType: item.mimeType,
        size: item.size,
        passwordRequired: item.hasPassword,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get shared item');
    res.status(500).json({ success: false, error: 'Failed to get shared item' });
  }
});

// GET /api/v1/share/:token/download — public file download
router.get('/:token/download', async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;
    const item = await driveService.getItemByShareToken(token);

    if (!item || item.type !== 'file' || !item.storagePath) {
      res.status(404).json({ success: false, error: 'Link expired or not found' });
      return;
    }

    // Password protection check
    if (item.hasPassword) {
      const password = req.query.password as string | undefined;
      if (!password) {
        res.status(401).json({ success: false, error: 'Password required', passwordRequired: true });
        return;
      }
      const valid = await driveService.verifyShareLinkPassword(token, password);
      if (!valid) {
        res.status(401).json({ success: false, error: 'Incorrect password', passwordRequired: true });
        return;
      }
    }

    const filePath = path.join(UPLOADS_DIR, item.storagePath);
    if (!existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'File not found on disk' });
      return;
    }

    const stat = statSync(filePath);
    const mimeType = item.mimeType || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(item.name)}"`);

    createReadStream(filePath).pipe(res);
  } catch (error) {
    logger.error({ error }, 'Failed to download shared file');
    res.status(500).json({ success: false, error: 'Failed to download shared file' });
  }
});

// GET /api/v1/share/:token/info — public metadata for file request links
router.get('/:token/info', async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;
    const link = await driveService.getShareLinkByToken(token);
    if (!link) {
      res.status(404).json({ success: false, error: 'Link not found' });
      return;
    }
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      res.status(410).json({ success: false, error: 'Link expired' });
      return;
    }
    const [folder] = await db
      .select({ id: driveItems.id, name: driveItems.name, type: driveItems.type })
      .from(driveItems)
      .where(eq(driveItems.id, link.driveItemId))
      .limit(1);
    if (!folder) {
      res.status(404).json({ success: false, error: 'Target not found' });
      return;
    }
    res.json({
      success: true,
      data: {
        mode: link.mode,
        folderName: folder.name,
        instructions: link.uploadInstructions,
        requireEmail: link.requireUploaderEmail,
        passwordProtected: !!link.passwordHash,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to load share link info');
    res.status(500).json({ success: false, error: 'Failed to load link info' });
  }
});

router.post('/:token/upload', uploadLimiter, upload.array('files', 10), handleMulterError, handlePublicUpload);

export default router;
