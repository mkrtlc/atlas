import { Router } from 'express';
import * as documentController from '../controllers/document.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', documentController.listDocuments);
router.post('/', documentController.createDocument);
router.get('/search', documentController.searchDocuments);
router.get('/:id', documentController.getDocument);
router.patch('/:id', documentController.updateDocument);
router.delete('/:id', documentController.deleteDocument);
router.patch('/:id/move', documentController.moveDocument);
router.patch('/:id/restore', documentController.restoreDocument);
router.get('/:id/versions', documentController.listVersions);
router.post('/:id/versions', documentController.createVersion);
router.post('/:id/versions/:versionId/restore', documentController.restoreVersion);

export default router;
