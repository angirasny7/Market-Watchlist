import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticateJwt, optionalAuthenticateJwt } from '../middleware/auth.js';

const router = Router();

router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/logout', optionalAuthenticateJwt, (req, res) => authController.logout(req, res));
router.get('/me', authenticateJwt, (req, res, next) => authController.getMe(req, res, next));
router.patch('/heartbeat', authenticateJwt, (req, res, next) => authController.heartbeat(req, res, next));

export default router;
