import { Router } from 'express';
import { memoryController } from '../controllers/memoryController.js';
import { authenticateJwt } from '../middleware/auth.js';

const router = Router();

// Memory routes strictly protected with authenticateJwt
router.use(authenticateJwt);

router.get('/', (req, res, next) => memoryController.getMemory(req, res, next));
router.get('/counts', (req, res, next) => memoryController.getMemoryCounts(req, res, next));
router.post('/items/:id/note', (req, res, next) => memoryController.updateNote(req, res, next));
router.post('/items/:id/restore-to-feed', (req, res, next) => memoryController.restoreToFeed(req, res, next));
router.post('/items/:id/permanent-delete', (req, res, next) => memoryController.permanentlyDeleteItem(req, res, next));
router.get('/events', (req, res, next) => memoryController.getArchivedEvents(req, res, next));
router.get('/digests', (req, res, next) => memoryController.getArchivedDigests(req, res, next));

export default router;

