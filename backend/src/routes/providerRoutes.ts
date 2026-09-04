import { Router, Request, Response, NextFunction } from 'express';
import { ProviderFactory } from '../providers/providerFactory.js';
import { getSchedulerState } from '../jobs/scheduler.js';

const router = Router();

/**
 * GET /api/providers/status
 * Operational health and connectivity status of market and news providers
 */
router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const providerStatus = await ProviderFactory.checkStatus();
    const schedulerState = getSchedulerState();

    res.status(200).json({
      marketProvider: providerStatus.marketProvider,
      marketConnected: providerStatus.marketConnected,
      newsProvider: providerStatus.newsProvider,
      newsConnected: providerStatus.newsConnected,
      lastStockSync: schedulerState.lastStockSync,
      lastNewsSync: schedulerState.lastNewsSync,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
