import { Response, NextFunction } from 'express';
import { watchlistService } from '../services/watchlistService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { serializeBigInt } from '../utils/json.js';

export class WatchlistController {
  // ==========================================
  // Modern Multi-Watchlist API (Phase 1)
  // ==========================================

  /**
   * GET /watchlists
   * Returns all watchlists owned by user with stockCount.
   */
  async getUserWatchlists(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const watchlists = await watchlistService.getUserWatchlists(userId);
      res.status(200).json({
        success: true,
        data: serializeBigInt(watchlists),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  /**
   * POST /watchlists
   * Create a new watchlist with max 10 check and 1-40 char unique name.
   */
  async createWatchlist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { name } = req.body;

      if (!name) {
        res.status(400).json({ success: false, error: 'Watchlist name is required' });
        return;
      }

      const watchlist = await watchlistService.createWatchlist(userId, name);
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

  /**
   * PATCH /watchlists/:id
   * Rename an existing watchlist.
   */
  async renameWatchlist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = req.params.id as string;
      const { name } = req.body;

      if (!id) {
        res.status(400).json({ success: false, error: 'Watchlist ID is required' });
        return;
      }
      if (!name) {
        res.status(400).json({ success: false, error: 'Watchlist name is required' });
        return;
      }

      const updated = await watchlistService.renameWatchlist(userId, id, name);
      res.status(200).json({
        success: true,
        data: serializeBigInt(updated),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  /**
   * DELETE /watchlists/:id
   * Delete a watchlist (cannot delete default or sole watchlist).
   */
  async deleteWatchlist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = req.params.id as string;

      if (!id) {
        res.status(400).json({ success: false, error: 'Watchlist ID is required' });
        return;
      }

      const result = await watchlistService.deleteWatchlist(userId, id);
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

  /**
   * POST /watchlists/:id/stocks
   * Add a stock to a specific watchlist (max 50, distinct).
   */
  async addStockToWatchlist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = req.params.id as string;
      const { symbol } = req.body;

      if (!id || !symbol) {
        res.status(400).json({ success: false, error: 'Watchlist ID and stock symbol are required' });
        return;
      }

      const item = await watchlistService.addStockToWatchlist(userId, id, symbol);
      res.status(201).json({
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

  /**
   * DELETE /watchlists/:id/stocks/:symbol
   * Remove a stock from a specific watchlist.
   */
  async removeStockFromWatchlist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = req.params.id as string;
      const symbol = req.params.symbol as string;

      if (!id || !symbol) {
        res.status(400).json({ success: false, error: 'Watchlist ID and stock symbol are required' });
        return;
      }

      const result = await watchlistService.removeStockFromWatchlist(userId, id, symbol);
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

  /**
   * PATCH /watchlists/:id/stocks/:symbol/pin
   * Toggle pin for a stock in a specific watchlist.
   */
  async togglePinInWatchlist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = req.params.id as string;
      const symbol = req.params.symbol as string;

      if (!id || !symbol) {
        res.status(400).json({ success: false, error: 'Watchlist ID and stock symbol are required' });
        return;
      }

      const item = await watchlistService.togglePinInWatchlist(userId, id, symbol);
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

  /**
   * GET /watchlists/:id/overview?range=1D|1W|1M
   * Single call aggregated overview for a specific watchlist.
   */
  async getWatchlistOverview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = req.params.id as string;
      const range = (req.query.range as '1D' | '1W' | '1M') || '1D';

      if (!id) {
        res.status(400).json({ success: false, error: 'Watchlist ID is required' });
        return;
      }

      const overview = await watchlistService.getOverview(userId, id, range);
      res.status(200).json({
        success: true,
        data: serializeBigInt(overview),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  /**
   * GET /watchlists/all/overview?range=1D|1W|1M
   * Single call aggregated overview across all user watchlists (union, deduplicated).
   */
  async getAllOverview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const range = (req.query.range as '1D' | '1W' | '1M') || '1D';

      const overview = await watchlistService.getOverview(userId, 'all', range);
      res.status(200).json({
        success: true,
        data: serializeBigInt(overview),
      });
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  // ==========================================
  // Legacy Watchlist API (Backwards Compatibility)
  // ==========================================

  async getWatchlist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const watchlistId = (req.params?.id as string | undefined) || (req.query.watchlistId as string | undefined);

      const watchlist = await watchlistService.getWatchlist(userId, watchlistId);
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

  async setupWatchlist(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { name, symbols } = req.body;

      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        res.status(400).json({ success: false, error: 'At least one stock symbol is required' });
        return;
      }

      const watchlist = await watchlistService.setupWatchlist(userId, { name, symbols });
      res.status(200).json({
        success: true,
        isOnboarded: true,
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
