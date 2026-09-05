import { Router } from 'express';
import { insightController } from '../controllers/insightController.js';
import { authenticateJwt } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateJwt, (req, res, next) => insightController.getInsights(req, res, next));
router.get('/:eventId', authenticateJwt, (req, res, next) => insightController.getInsightsByEventId(req, res, next));

export default router;
