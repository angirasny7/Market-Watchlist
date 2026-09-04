import { Router } from 'express';
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

const router = Router();

// Requirement 8: Health Check Endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'smart-market-watchlist-backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

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

export default router;



