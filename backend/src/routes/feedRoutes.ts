import { Router } from 'express';
import { feedController } from '../controllers/feedController.js';
import { authenticateJwt } from '../middleware/auth.js';

const router = Router();

// All feed routes strictly protected with authenticateJwt
router.use(authenticateJwt);

router.get('/', (req, res, next) => feedController.getFeed(req, res, next));
router.get('/counts', (req, res, next) => feedController.getCounts(req, res, next));
router.get('/summary', (req, res, next) => feedController.getSummary(req, res, next));
router.get('/items/:id/details', (req, res, next) => feedController.getItemDetails(req, res, next));
router.post('/mark-read', (req, res, next) => feedController.markRead(req, res, next));
router.post('/items/:id/mark-read', (req, res, next) => feedController.markItemRead(req, res, next));
router.post('/items/:id/save', (req, res, next) => feedController.saveItem(req, res, next));
router.post('/items/:id/unsave', (req, res, next) => feedController.unsaveItem(req, res, next));
router.post('/items/:id/restore', (req, res, next) => feedController.restoreItem(req, res, next));
router.post('/undo', (req, res, next) => feedController.undoAction(req, res, next));
router.post('/caught-up', (req, res, next) => feedController.markCaughtUp(req, res, next));

export default router;
