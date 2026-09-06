import { Router, Request, Response } from 'express';
import authRoutes from './authRoutes.js';
import stockRoutes from './stockRoutes.js';
import watchlistRoutes from './watchlistRoutes.js';
import eventRoutes from './eventRoutes.js';
import insightRoutes from './insightRoutes.js';
import digestRoutes from './digestRoutes.js';
import newsRoutes from './newsRoutes.js';
import providerRoutes from './providerRoutes.js';
import adminRoutes from './adminRoutes.js';
import userRoutes from './userRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import memoryRoutes from './memoryRoutes.js';

const router = Router();

// Requirement 8: Health Check Endpoint (supports both /health and /api/health)
const healthCheckHandler = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'healthy',
    service: 'smart-market-watchlist-backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
};

router.get('/health', healthCheckHandler);
router.get('/api/health', healthCheckHandler);

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/stocks', stockRoutes);
router.use('/watchlist', watchlistRoutes);
router.use('/events', eventRoutes);
router.use('/insights', insightRoutes);
router.use('/digests', digestRoutes);
router.use('/news', newsRoutes);
router.use('/providers', providerRoutes);
router.use('/admin', adminRoutes);
router.use('/memory', memoryRoutes);

export default router;



