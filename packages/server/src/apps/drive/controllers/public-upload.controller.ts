import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../../../config/database';
import { driveItems, driveShareLinks, driveActivityLog } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../../utils/logger';

const UPLOADS_DIR = path.join(__dirname, '../../../../uploads');

export async function handlePublicUpload(req: Request, res: Response) {
  try {
    const token = req.params.token as string;
    const { name, email } = req.body as { name?: string; email?: string };

    const [link] = await db
      .select()
      .from(driveShareLinks)
      .where(eq(driveShareLinks.shareToken, token))
      .limit(1);
    if (!link) {
      res.status(404).json({ success: false, error: 'Link not found' });
      return;
    }
    if (link.mode !== 'upload_only') {
      res.status(403).json({ success: false, error: 'Not an upload link' });
      return;
    }
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      res.status(410).json({ success: false, error: 'Link expired' });
      return;
    }
    if (link.requireUploaderEmail && (!name || !email)) {
      res.status(400).json({ success: false, error: 'Name and email required' });
      return;
    }

    const [folder] = await db
      .select()
      .from(driveItems)
      .where(eq(driveItems.id, link.driveItemId))
      .limit(1);
    if (!folder || folder.type !== 'folder') {
      res.status(404).json({ success: false, error: 'Target folder not found' });
      return;
    }

    const files = (req.files as Express.Multer.File[]) ?? [];
    const created: Array<{ id: string; name: string; size: number }> = [];

    for (const file of files) {
      const storageRel = `${folder.tenantId}/${crypto.randomUUID()}_${Date.now()}_${file.originalname}`;
      const storageAbs = path.join(UPLOADS_DIR, storageRel);
      fs.mkdirSync(path.dirname(storageAbs), { recursive: true });
      fs.writeFileSync(storageAbs, file.buffer);

      const uploadSourceTag = JSON.stringify({
        type: 'upload_source',
        name: name || 'Anonymous',
        email: email || null,
        uploadedAt: new Date().toISOString(),
      });

      const [row] = await db.insert(driveItems).values({
        tenantId: folder.tenantId,
        userId: folder.userId,
        parentId: folder.id,
        name: file.originalname,
        type: 'file',
        mimeType: file.mimetype,
        size: file.size,
        storagePath: storageRel,
        tags: [uploadSourceTag],
      }).returning();

      // drive_activity_log.tenant_id is NOT NULL — include it.
      await db.insert(driveActivityLog).values({
        driveItemId: row.id,
        tenantId: folder.tenantId,
        userId: folder.userId,
        action: 'public_upload',
        metadata: { uploaderName: name, uploaderEmail: email, viaToken: token },
      });

      created.push({ id: row.id, name: row.name, size: row.size ?? 0 });
    }

    res.json({ success: true, data: { uploaded: created } });
  } catch (error) {
    logger.error({ error }, 'Public upload failed');
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
}
