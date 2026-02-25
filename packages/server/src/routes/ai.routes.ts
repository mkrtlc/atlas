import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { authMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limit';

const router = Router();

// Test key doesn't require auth (user may not be logged in yet in settings)
// Rate-limited to prevent brute-force API key testing
router.post('/test-key', authLimiter, aiController.testKey);

// All other AI endpoints require auth
router.use(authMiddleware);
router.post('/summarize', aiController.summarize);
router.post('/quick-replies', aiController.quickReplies);
router.post('/write-assist', aiController.writeAssist);

export default router;
