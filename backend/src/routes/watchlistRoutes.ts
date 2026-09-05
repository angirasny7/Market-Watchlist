import { Router } from 'express';
import { watchlistController } from '../controllers/watchlistController.js';
import { authenticateJwt } from '../middleware/auth.js';

const router = Router();

// All watchlist routes strictly protected with authenticateJwt
router.get('/', authenticateJwt, (req, res, next) => watchlistController.getWatchlist(req, res, next));
router.post('/', authenticateJwt, (req, res, next) => watchlistController.createWatchlist(req, res, next));
router.post('/add-stock', authenticateJwt, (req, res, next) => watchlistController.addStock(req, res, next));
router.post('/setup', authenticateJwt, (req, res, next) => watchlistController.setupWatchlist(req, res, next));
router.delete('/remove-stock', authenticateJwt, (req, res, next) => watchlistController.removeStock(req, res, next));
router.patch('/pin', authenticateJwt, (req, res, next) => watchlistController.togglePin(req, res, next));
router.patch('/pin-stock', authenticateJwt, (req, res, next) => watchlistController.togglePin(req, res, next));

export default router;
