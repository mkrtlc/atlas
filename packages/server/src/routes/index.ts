import { Router } from 'express';
import authRoutes from './auth.routes';
import settingsRoutes from './settings.routes';
import aiRoutes from './ai.routes';
import docsRoutes from './docs.routes';
import drawingsRoutes from './drawings.routes';
import tasksRoutes from './tasks.routes';
import tablesRoutes from './tables.routes';
import uploadRoutes from './upload.routes';
import driveRoutes from './drive.routes';
import platformRoutes from './platform.routes';
import adminRoutes from './admin.routes';
import { adminLimiter } from '../middleware/rate-limit';

const router = Router();

router.use('/admin', adminLimiter, adminRoutes);
router.use('/auth', authRoutes);
router.use('/settings', settingsRoutes);
router.use('/ai', aiRoutes);
router.use('/docs', docsRoutes);
router.use('/drawings', drawingsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/tables', tablesRoutes);
router.use('/upload', uploadRoutes);
router.use('/drive', driveRoutes);
router.use('/platform', adminLimiter, platformRoutes);

export default router;
