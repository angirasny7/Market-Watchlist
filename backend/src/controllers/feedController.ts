import { Request, Response, NextFunction } from 'express';
import { feedService } from '../services/feedService.js';
import { prisma } from '../config/prisma.js';

export class FeedController {
  private resolveUserId(req: any): string {
    const authUserId = req.user?.userId;
    if (authUserId) return authUserId;

    const headerUserId = req.headers['x-user-id'] as string;
    if (headerUserId) return headerUserId;

    const err: any = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }

  /**
   * GET /api/feed
   * Lightweight clustered feed items with cursor pagination
   */
  async getFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await this.resolveUserId(req);
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const window = req.query.window as 'sinceLastVisit' | '24h' | '7d' | '30d' | undefined;
      const watchlistId = req.query.watchlistId as string | undefined;
      const symbol = req.query.symbol as string | undefined;
      const priority = req.query.priority as string | undefined;
      const type = req.query.type as any;
      const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === '1';
      const savedOnly = req.query.savedOnly === 'true' || req.query.savedOnly === '1';
      const q = req.query.q as string | undefined;

      const result = await feedService.getFeed(userId, {
        cursor,
        limit,
        window,
        watchlistId,
        symbol,
        priority,
        type,
        unreadOnly,
        savedOnly,
        q,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/feed/summary
   * High-level summary sentence, counts and freshness
   */
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await this.resolveUserId(req);
      const windowParam = req.query.window as any;
      const summary = await feedService.getSummary(userId, { window: windowParam });

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/feed/items/:id/details
   * Lazy-computed tab details for a feed item
   */
  async getItemDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await this.resolveUserId(req);
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const tab = req.query.tab as any;

      const details = await feedService.getItemDetails(userId, id, tab);

      if (!details) {
        res.status(404).json({
          success: false,
          error: 'Feed item not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: details,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/feed/mark-read
   * Mark all or specified items read
   */
  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await this.resolveUserId(req);
      const { eventIds } = req.body || {};

      const result = await feedService.markRead(userId, eventIds);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/feed/items/:id/mark-read
   * Mark single item read
   */
  async markItemRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await this.resolveUserId(req);
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const result = await feedService.markRead(userId, [id]);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/feed/items/:id/save
   * Toggle saved status
   */
  async toggleSave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await this.resolveUserId(req);
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const result = await feedService.toggleSave(userId, id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/feed/caught-up
   * Mark caught up and advance session cursor
   */
  async markCaughtUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = await this.resolveUserId(req);
      const result = await feedService.markCaughtUp(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const feedController = new FeedController();
