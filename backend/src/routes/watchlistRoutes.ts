import { Router } from 'express';
import { watchlistController } from '../controllers/watchlistController.js';
import { authenticateJwt } from '../middleware/auth.js';

const router = Router();

// ==========================================
// All watchlist routes protected by JWT
// ==========================================

// 1. Overview endpoints (Phase 1)
router.get('/all/overview', authenticateJwt, (req, res, next) => watchlistController.getAllOverview(req, res, next));
router.get('/:id/overview', authenticateJwt, (req, res, next) => watchlistController.getWatchlistOverview(req, res, next));

// 2. Legacy endpoints (Must come before parameterised routes to avoid route collision)
router.post('/setup', authenticateJwt, (req, res, next) => watchlistController.setupWatchlist(req, res, next));
router.post('/add-stock', authenticateJwt, (req, res, next) => watchlistController.addStock(req, res, next));
router.delete('/remove-stock', authenticateJwt, (req, res, next) => watchlistController.removeStock(req, res, next));
router.patch('/pin', authenticateJwt, (req, res, next) => watchlistController.togglePin(req, res, next));
router.patch('/pin-stock', authenticateJwt, (req, res, next) => watchlistController.togglePin(req, res, next));

// 3. Multi-watchlist stock operations (Phase 1)
router.patch('/:id/stocks/:symbol/pin', authenticateJwt, (req, res, next) => watchlistController.togglePinInWatchlist(req, res, next));
router.post('/:id/stocks', authenticateJwt, (req, res, next) => watchlistController.addStockToWatchlist(req, res, next));
router.delete('/:id/stocks/:symbol', authenticateJwt, (req, res, next) => watchlistController.removeStockFromWatchlist(req, res, next));

// 4. Multi-watchlist management operations (Phase 1)
router.patch('/:id', authenticateJwt, (req, res, next) => watchlistController.renameWatchlist(req, res, next));
router.delete('/:id', authenticateJwt, (req, res, next) => watchlistController.deleteWatchlist(req, res, next));
router.get('/:id', authenticateJwt, (req, res, next) => watchlistController.getWatchlist(req, res, next));

// 5. Root collection operations
// POST /watchlists or POST /watchlist
router.post('/', authenticateJwt, (req, res, next) => watchlistController.createWatchlist(req, res, next));

// GET /watchlists returns all user watchlists with stockCount
// GET /watchlist returns default watchlist (legacy)
router.get('/', authenticateJwt, (req, res, next) => {
  const isWatchlistsRoute = req.baseUrl.endsWith('/watchlists') || req.originalUrl.split('?')[0].endsWith('/watchlists');
  if (isWatchlistsRoute || req.query.list === 'all') {
    return watchlistController.getUserWatchlists(req, res, next);
  }
  return watchlistController.getWatchlist(req, res, next);
});

export default router;
