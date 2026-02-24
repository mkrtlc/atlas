import { Router } from 'express';
import * as trackingController from '../controllers/tracking.controller';
import { trackingLimiter } from '../middleware/rate-limit';

const router = Router();

// Public endpoints — no auth required (hit by recipient's email client/browser)
router.use(trackingLimiter);
router.get('/o/:trackingId', trackingController.handleOpen);
router.get('/c/:trackingId', trackingController.handleClick);

export default router;
