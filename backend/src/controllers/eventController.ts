import { Response, NextFunction } from 'express';
import { Priority, EventType } from '@prisma/client';
import { eventService } from '../services/eventService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { serializeBigInt } from '../utils/json.js';

export class EventController {
  async getEvents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { symbol, priority, eventType, sinceLastVisit, unreadOnly, watchlistOnly, limit } = req.query;

      const events = await eventService.getEvents({
        symbol: symbol as string | undefined,
        priority: priority as Priority | undefined,
        eventType: eventType as EventType | undefined,
        sinceLastVisit: sinceLastVisit === 'true',
        userId,
        unreadOnly: unreadOnly === 'true',
        watchlistOnly: watchlistOnly === 'true',
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

  async getEventsBySymbol(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const symbol = req.params.symbol as string;
      const events = await eventService.getEventsBySymbol(symbol, userId);

      res.status(200).json({
        success: true,
        count: events.length,
        data: serializeBigInt(events),
      });
    } catch (err) {
      next(err);
    }
  }

  async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = req.params.id as string;
      await eventService.markEventRead(id, userId);

      res.status(200).json({
        success: true,
        message: 'Event marked as read',
      });
    } catch (err) {
      next(err);
    }
  }

  async saveForLater(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = req.params.id as string;
      await eventService.saveEventForLater(id, userId);

      res.status(200).json({
        success: true,
        message: 'Event saved for later',
      });
    } catch (err) {
      next(err);
    }
  }

  async markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const result = await eventService.markAllRead(userId);

      res.status(200).json({
        success: true,
        message: 'All events marked as read',
        updatedCount: (result as any).count ?? 0,
      });
    } catch (err) {
      next(err);
    }
  }

  async acknowledge(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = req.params.id as string;
      await eventService.acknowledgeEvent(id, userId);

      res.status(200).json({
        success: true,
        message: 'Event acknowledged',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const eventController = new EventController();
