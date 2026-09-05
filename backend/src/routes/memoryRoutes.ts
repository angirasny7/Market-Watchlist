import { Router } from 'express';
import { memoryController } from '../controllers/memoryController.js';
import { authenticateJwt } from '../middleware/auth.js';

const router = Router();

// Memory routes strictly protected with authenticateJwt
router.get('/events', authenticateJwt, (req, res, next) => memoryController.getArchivedEvents(req, res, next));
router.get('/counts', authenticateJwt, (req, res, next) => memoryController.getMemoryCounts(req, res, next));
router.get('/digests', authenticateJwt, (req, res, next) => memoryController.getArchivedDigests(req, res, next));

export default router;
