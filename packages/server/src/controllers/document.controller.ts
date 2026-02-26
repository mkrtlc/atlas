import type { Request, Response } from 'express';
import * as documentService from '../services/document.service';
import { logger } from '../utils/logger';

// GET /api/docs
export async function listDocuments(req: Request, res: Response) {
  try {
    const accountId = req.auth!.accountId;
    const includeArchived = req.query.includeArchived === 'true';

    // Auto-seed sample documents on first visit
    await documentService.seedSampleDocuments(accountId);

    const docs = await documentService.listDocuments(accountId, includeArchived);
    const tree = documentService.buildDocumentTree(docs);

    res.json({ success: true, data: { documents: docs, tree } });
  } catch (error) {
    logger.error({ error }, 'Failed to list documents');
    res.status(500).json({ success: false, error: 'Failed to list documents' });
  }
}

// POST /api/docs
export async function createDocument(req: Request, res: Response) {
  try {
    const accountId = req.auth!.accountId;
    const { parentId, title, icon, content } = req.body;

    const doc = await documentService.createDocument(accountId, {
      parentId,
      title,
      icon,
      content,
    });

    res.json({ success: true, data: doc });
  } catch (error) {
    logger.error({ error }, 'Failed to create document');
    res.status(500).json({ success: false, error: 'Failed to create document' });
  }
}

// GET /api/docs/:id
export async function getDocument(req: Request, res: Response) {
  try {
    const accountId = req.auth!.accountId;
    const documentId = req.params.id as string;

    const doc = await documentService.getDocument(accountId, documentId);

    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    logger.error({ error }, 'Failed to get document');
    res.status(500).json({ success: false, error: 'Failed to get document' });
  }
}

// PATCH /api/docs/:id
export async function updateDocument(req: Request, res: Response) {
  try {
    const accountId = req.auth!.accountId;
    const documentId = req.params.id as string;
    const { title, content, icon, coverImage, parentId, isArchived } = req.body;

    const doc = await documentService.updateDocument(accountId, documentId, {
      title,
      content,
      icon,
      coverImage,
      parentId,
      isArchived,
    });

    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    logger.error({ error }, 'Failed to update document');
    res.status(500).json({ success: false, error: 'Failed to update document' });
  }
}

// DELETE /api/docs/:id (soft delete)
export async function deleteDocument(req: Request, res: Response) {
  try {
    const accountId = req.auth!.accountId;
    const documentId = req.params.id as string;

    await documentService.deleteDocument(accountId, documentId);

    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to delete document');
    res.status(500).json({ success: false, error: 'Failed to delete document' });
  }
}

// PATCH /api/docs/:id/move
export async function moveDocument(req: Request, res: Response) {
  try {
    const accountId = req.auth!.accountId;
    const documentId = req.params.id as string;
    const { parentId, sortOrder } = req.body;

    if (typeof sortOrder !== 'number') {
      res.status(400).json({ success: false, error: 'sortOrder must be a number' });
      return;
    }

    const doc = await documentService.moveDocument(accountId, documentId, {
      parentId: parentId ?? null,
      sortOrder,
    });

    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    res.json({ success: true, data: doc });
  } catch (error: any) {
    if (error.message?.includes('descendants')) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    logger.error({ error }, 'Failed to move document');
    res.status(500).json({ success: false, error: 'Failed to move document' });
  }
}

// PATCH /api/docs/:id/restore
export async function restoreDocument(req: Request, res: Response) {
  try {
    const accountId = req.auth!.accountId;
    const documentId = req.params.id as string;

    const doc = await documentService.restoreDocument(accountId, documentId);

    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    logger.error({ error }, 'Failed to restore document');
    res.status(500).json({ success: false, error: 'Failed to restore document' });
  }
}

// GET /api/docs/search?q=...
export async function searchDocuments(req: Request, res: Response) {
  try {
    const accountId = req.auth!.accountId;
    const query = (req.query.q as string) || '';

    if (!query.trim()) {
      res.json({ success: true, data: [] });
      return;
    }

    const results = await documentService.searchDocuments(accountId, query.trim());
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error({ error }, 'Failed to search documents');
    res.status(500).json({ success: false, error: 'Failed to search documents' });
  }
}

// GET /api/docs/:id/versions
export async function listVersions(req: Request, res: Response) {
  try {
    const accountId = req.auth!.accountId;
    const documentId = req.params.id as string;

    const versions = await documentService.listVersions(accountId, documentId);
    res.json({ success: true, data: versions });
  } catch (error) {
    logger.error({ error }, 'Failed to list versions');
    res.status(500).json({ success: false, error: 'Failed to list versions' });
  }
}

// POST /api/docs/:id/versions (create a snapshot)
export async function createVersion(req: Request, res: Response) {
  try {
    const accountId = req.auth!.accountId;
    const documentId = req.params.id as string;

    const version = await documentService.createVersion(accountId, documentId);
    if (!version) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    res.json({ success: true, data: version });
  } catch (error) {
    logger.error({ error }, 'Failed to create version');
    res.status(500).json({ success: false, error: 'Failed to create version' });
  }
}

// POST /api/docs/:id/versions/:versionId/restore
export async function restoreVersion(req: Request, res: Response) {
  try {
    const accountId = req.auth!.accountId;
    const documentId = req.params.id as string;
    const versionId = req.params.versionId as string;

    const doc = await documentService.restoreVersion(accountId, documentId, versionId);
    if (!doc) {
      res.status(404).json({ success: false, error: 'Version not found' });
      return;
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    logger.error({ error }, 'Failed to restore version');
    res.status(500).json({ success: false, error: 'Failed to restore version' });
  }
}
