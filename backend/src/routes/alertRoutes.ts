import { Router } from 'express';
import { alertController } from '../controllers/alertController.js';
import { authenticateJwt } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateJwt, (req, res, next) => alertController.getAlerts(req, res, next));
router.post('/', authenticateJwt, (req, res, next) => alertController.createAlert(req, res, next));
router.patch('/:id', authenticateJwt, (req, res, next) => alertController.updateAlert(req, res, next));
router.delete('/:id', authenticateJwt, (req, res, next) => alertController.deleteAlert(req, res, next));

export default router;
