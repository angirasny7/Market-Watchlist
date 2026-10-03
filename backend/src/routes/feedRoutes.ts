import { Router } from 'express';
import { feedController } from '../controllers/feedController.js';
import { optionalAuthenticateJwt } from '../middleware/auth.js';

const router = Router();

router.use(optionalAuthenticateJwt);

router.get('/', (req, res, next) => feedController.getFeed(req, res, next));
router.get('/summary', (req, res, next) => feedController.getSummary(req, res, next));
router.get('/items/:id/details', (req, res, next) => feedController.getItemDetails(req, res, next));
router.post('/mark-read', (req, res, next) => feedController.markRead(req, res, next));
router.post('/items/:id/mark-read', (req, res, next) => feedController.markItemRead(req, res, next));
router.post('/items/:id/save', (req, res, next) => feedController.toggleSave(req, res, next));
router.post('/caught-up', (req, res, next) => feedController.markCaughtUp(req, res, next));

export default router;
