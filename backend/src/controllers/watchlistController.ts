import { Response, NextFunction } from 'express';
import { watchlistService } from '../services/watchlistService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { serializeBigInt } from '../utils/json.js';

export class WatchlistController {
  async getWatchlist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { watchlistId } = req.query;

      const watchlist = await watchlistService.getWatchlist(userId, watchlistId as string | undefined);
      res.status(200).json({
        success: true,
        data: serializeBigInt(watchlist),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  async createWatchlist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { name, isDefault } = req.body;

      if (!name) {
        res.status(400).json({ success: false, error: 'Watchlist name is required' });
        return;
      }

      const watchlist = await watchlistService.createWatchlist(userId, name, Boolean(isDefault));
      res.status(201).json({
        success: true,
        data: serializeBigInt(watchlist),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  async addStock(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { symbol, watchlistId } = req.body;

      if (!symbol) {
        res.status(400).json({ success: false, error: 'Stock symbol is required' });
        return;
      }

      const item = await watchlistService.addStock(userId, symbol, watchlistId);
      res.status(200).json({
        success: true,
        data: serializeBigInt(item),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  async removeStock(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { symbol, watchlistId } = req.body;

      if (!symbol) {
        res.status(400).json({ success: false, error: 'Stock symbol is required' });
        return;
      }

      const result = await watchlistService.removeStock(userId, symbol, watchlistId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  async togglePin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { symbol, watchlistId } = req.body;

      if (!symbol) {
        res.status(400).json({ success: false, error: 'Stock symbol is required' });
        return;
      }

      const item = await watchlistService.togglePinStock(userId, symbol, watchlistId);
      res.status(200).json({
        success: true,
        data: serializeBigInt(item),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }
}

export const watchlistController = new WatchlistController();
