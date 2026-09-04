import { Router } from 'express';
import { digestController } from '../controllers/digestController.js';
import { authenticateJwt } from '../middleware/auth.js';

const router = Router();

// All digest routes strictly protected with authenticateJwt
router.get('/', authenticateJwt, (req, res, next) => digestController.getDigests(req, res, next));
router.get('/:id', authenticateJwt, (req, res, next) => digestController.getDigestById(req, res, next));
router.patch('/:id/read', authenticateJwt, (req, res, next) => digestController.markRead(req, res, next));
router.patch('/:id/view', authenticateJwt, (req, res, next) => digestController.viewDigest(req, res, next));

export default router;
