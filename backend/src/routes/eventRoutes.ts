import { Router } from 'express';
import { eventController } from '../controllers/eventController.js';
import { authenticateJwt } from '../middleware/auth.js';

const router = Router();

// All event routes strictly protected with authenticateJwt
router.get('/', authenticateJwt, (req, res, next) => eventController.getEvents(req, res, next));
router.patch('/mark-all-read', authenticateJwt, (req, res, next) => eventController.markAllRead(req, res, next));
router.get('/:symbol', authenticateJwt, (req, res, next) => eventController.getEventsBySymbol(req, res, next));
router.patch('/:id/read', authenticateJwt, (req, res, next) => eventController.markRead(req, res, next));
router.patch('/:id/acknowledge', authenticateJwt, (req, res, next) => eventController.acknowledge(req, res, next));

export default router;
