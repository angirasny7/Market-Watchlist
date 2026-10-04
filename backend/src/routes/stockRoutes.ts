import { Router } from 'express';
import { stockController } from '../controllers/stockController.js';
import { authenticateJwt } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Rate limiter for history requests: 60 requests/min
const historyLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many stock history requests, please try again later.',
});

router.get('/', (req, res, next) => stockController.getAllStocks(req, res, next));
router.get('/:symbol/history', authenticateJwt, historyLimiter, (req, res, next) => stockController.getStockHistory(req, res, next));
router.get('/:symbol', (req, res, next) => stockController.getStockBySymbol(req, res, next));

export default router;

