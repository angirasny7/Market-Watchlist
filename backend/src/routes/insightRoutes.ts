import { Router } from 'express';
import { insightController } from '../controllers/insightController.js';

const router = Router();

router.get('/', (req, res, next) => insightController.getInsights(req, res, next));
router.get('/:eventId', (req, res, next) => insightController.getInsightsByEventId(req, res, next));

export default router;
