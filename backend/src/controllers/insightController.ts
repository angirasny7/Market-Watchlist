import { Request, Response, NextFunction } from 'express';
import { insightService } from '../services/insightService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { serializeBigInt } from '../utils/json.js';

export class InsightController {
  async getInsights(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { minConfidence, symbol, limit } = req.query;

      const insights = await insightService.getInsights({
        minConfidence: minConfidence ? parseFloat(minConfidence as string) : undefined,
        symbol: symbol as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        userId,
      });

      res.status(200).json({
        success: true,
        count: insights.length,
        data: serializeBigInt(insights),
      });
    } catch (err) {
      next(err);
    }
  }

  async getInsightsByEventId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = req.params.eventId as string;
      const insights = await insightService.getInsightsByEventId(eventId);

      res.status(200).json({
        success: true,
        count: insights.length,
        data: serializeBigInt(insights),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const insightController = new InsightController();
