import { Response, NextFunction } from 'express';
import { memoryService } from '../services/memoryService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { serializeBigInt } from '../utils/json.js';

export class MemoryController {
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

  async getArchivedDigests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized: Authentication required' });
        return;
      }

      const { search, limit } = req.query;

      const digests = await memoryService.getArchivedDigests({
        userId,
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.status(200).json({
        success: true,
        count: digests.length,
        data: serializeBigInt(digests),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const memoryController = new MemoryController();
