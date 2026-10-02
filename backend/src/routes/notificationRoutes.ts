import { Router } from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { authenticateJwt } from '../middleware/auth.js';

const router = Router();

router.get('/unread-count', authenticateJwt, (req, res, next) => notificationController.getUnreadCount(req, res, next));
router.patch('/read-all', authenticateJwt, (req, res, next) => notificationController.markAllAsRead(req, res, next));
router.patch('/:id/read', authenticateJwt, (req, res, next) => notificationController.markAsRead(req, res, next));
router.get('/', authenticateJwt, (req, res, next) => notificationController.getNotifications(req, res, next));

export default router;
