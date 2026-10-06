import { Router } from 'express';
import { marketHighlightsController } from '../controllers/marketHighlightsController.js';
import { optionalAuthenticateJwt } from '../middleware/auth.js';

const router = Router();

// Public / optional auth endpoint for highlights
router.get('/highlights', optionalAuthenticateJwt, (req, res, next) =>
  marketHighlightsController.getHighlights(req, res, next)
);

// Manual or background sync route
router.post('/sync', optionalAuthenticateJwt, (req, res, next) =>
  marketHighlightsController.syncUniverse(req, res, next)
);

export default router;
