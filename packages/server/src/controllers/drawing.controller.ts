import type { Request, Response } from 'express';
import * as drawingService from '../services/drawing.service';
import { logger } from '../utils/logger';

// GET /api/drawings
export async function listDrawings(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;
    const includeArchived = req.query.includeArchived === 'true';

    // Auto-seed sample drawing on first visit
    await drawingService.seedSampleDrawings(userId, accountId);

    const drawings = await drawingService.listDrawings(userId, includeArchived);

    res.json({ success: true, data: { drawings } });
  } catch (error) {
    logger.error({ error }, 'Failed to list drawings');
    res.status(500).json({ success: false, error: 'Failed to list drawings' });
  }
}

// POST /api/drawings
export async function createDrawing(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;
    const { title, content } = req.body;

    const drawing = await drawingService.createDrawing(userId, accountId, {
      title,
      content,
    });

    res.json({ success: true, data: drawing });
  } catch (error) {
    logger.error({ error }, 'Failed to create drawing');
    res.status(500).json({ success: false, error: 'Failed to create drawing' });
  }
}

// GET /api/drawings/:id
export async function getDrawing(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const drawingId = req.params.id as string;

    const drawing = await drawingService.getDrawing(userId, drawingId);

    if (!drawing) {
      res.status(404).json({ success: false, error: 'Drawing not found' });
      return;
    }

    res.json({ success: true, data: drawing });
  } catch (error) {
    logger.error({ error }, 'Failed to get drawing');
    res.status(500).json({ success: false, error: 'Failed to get drawing' });
  }
}

// PATCH /api/drawings/:id
export async function updateDrawing(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const drawingId = req.params.id as string;
    const { title, content, isArchived } = req.body;

    const drawing = await drawingService.updateDrawing(userId, drawingId, {
      title,
      content,
      isArchived,
    });

    if (!drawing) {
      res.status(404).json({ success: false, error: 'Drawing not found' });
      return;
    }

    res.json({ success: true, data: drawing });
  } catch (error) {
    logger.error({ error }, 'Failed to update drawing');
    res.status(500).json({ success: false, error: 'Failed to update drawing' });
  }
}

// DELETE /api/drawings/:id (soft delete)
export async function deleteDrawing(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const drawingId = req.params.id as string;

    await drawingService.deleteDrawing(userId, drawingId);

    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to delete drawing');
    res.status(500).json({ success: false, error: 'Failed to delete drawing' });
  }
}

// PATCH /api/drawings/:id/restore
export async function restoreDrawing(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const drawingId = req.params.id as string;

    const drawing = await drawingService.restoreDrawing(userId, drawingId);

    if (!drawing) {
      res.status(404).json({ success: false, error: 'Drawing not found' });
      return;
    }

    res.json({ success: true, data: drawing });
  } catch (error) {
    logger.error({ error }, 'Failed to restore drawing');
    res.status(500).json({ success: false, error: 'Failed to restore drawing' });
  }
}

// GET /api/drawings/search?q=...
export async function searchDrawings(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const query = (req.query.q as string) || '';

    if (!query.trim()) {
      res.json({ success: true, data: [] });
      return;
    }

    const results = await drawingService.searchDrawings(userId, query.trim());
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error({ error }, 'Failed to search drawings');
    res.status(500).json({ success: false, error: 'Failed to search drawings' });
  }
}
