import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import * as googleDriveController from './controllers/google-drive.controller';

const router = Router();
router.use(authMiddleware);

router.get('/status', googleDriveController.getStatus);
router.get('/connect', googleDriveController.connect);
router.get('/browse', googleDriveController.browse);
router.post('/import', googleDriveController.importFiles);
router.post('/export', googleDriveController.exportFile);

export default router;
