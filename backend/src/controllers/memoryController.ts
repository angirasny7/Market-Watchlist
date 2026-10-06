import { Response, NextFunction } from 'express';
import { memoryService } from '../services/memoryService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { serializeBigInt } from '../utils/json.js';

export class MemoryController {
  /**
   * GET /api/memory
   * Primary query endpoint for Market Memory (Saved | Read | Deleted)
   */
  async getMemory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized: Authentication required' });
        return;
      }

      const {
        tab,
        search,
        stock,
        watchlistId,
        priority,
        eventType,
        startDate,
        endDate,
        dateFilterType,
        hasNote,
        sortBy,
        cursor,
        limit,
      } = req.query;

      const result = await memoryService.getMemoryItems(userId, {
        tab: tab as any,
        search: search as string | undefined,
        stock: stock as string | undefined,
        watchlistId: watchlistId as string | undefined,
        priority: priority as string | undefined,
        eventType: eventType as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        dateFilterType: dateFilterType as any,
        hasNote: hasNote === 'true' || hasNote === '1',
        sortBy: sortBy as any,
        cursor: cursor as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.status(200).json({
        success: true,
        data: serializeBigInt(result),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/memory/counts
   * Single source of truth for Saved, Read, Deleted counters
   */
  async getMemoryCounts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized: Authentication required' });
        return;
      }

      const counts = await memoryService.getMemoryCounts(userId);

      res.status(200).json({
        success: true,
        data: counts,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/memory/items/:id/note
   * Add / update / delete note on a saved memory item
   */
  async updateNote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized: Authentication required' });
        return;
      }

      const eventId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { note } = req.body || {};

      const result = await memoryService.updateNote(userId, eventId, typeof note === 'string' ? note : null);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/memory/items/:id/restore-to-feed
   * Move item out of memory back into unhandled Attention Feed
   */
  async restoreToFeed(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized: Authentication required' });
        return;
      }

      const eventId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await memoryService.restoreToFeed(userId, eventId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/memory/items/:id/permanent-delete
   * Permanently removes item from the Deleted tab
   */
  async permanentlyDeleteItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized: Authentication required' });
        return;
      }

      const eventId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await memoryService.permanentlyDeleteItem(userId, eventId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Legacy endpoints for backward compatibility
   */
  async getArchivedEvents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized: Authentication required' });
        return;
      }

      const {
        memoryType,
        dateRange,
        startDate,
        endDate,
        symbol,
        watchlistOnly,
        eventType,
        marketMood,
        search,
        limit,
      } = req.query;

      const events = await memoryService.getArchivedEvents({
        userId,
        memoryType: memoryType as string | undefined,
        dateRange: dateRange as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        symbol: symbol as string | undefined,
        watchlistOnly: watchlistOnly === 'true',
        eventType: eventType as string | undefined,
        marketMood: marketMood as string | undefined,
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.status(200).json({
        success: true,
        count: events.length,
        data: serializeBigInt(events),
      });
    } catch (err) {
      next(err);
    }
  }

  async getArchivedDigests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    res.status(200).json({
      success: true,
      count: 0,
      data: [],
    });
  }
}

export const memoryController = new MemoryController();

