import { Request, Response, NextFunction } from 'express';
import { marketUniverseService } from '../services/marketUniverseService.js';

export class MarketHighlightsController {
  async getHighlights(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id || (req.query.userId as string) || undefined;
      const data = await marketUniverseService.getMarketHighlights(userId);
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async syncUniverse(req: Request, res: Response, next: NextFunction) {
    try {
      await marketUniverseService.ensureUniverseSeeded();
      await marketUniverseService.syncBenchmarkQuotes();
      const stocksSynced = await marketUniverseService.syncUniverseStockQuotes();
      res.json({
        success: true,
        message: 'Market universe quotes synced successfully',
        stocksSynced,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const marketHighlightsController = new MarketHighlightsController();
