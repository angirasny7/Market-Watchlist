import { Request, Response, NextFunction } from 'express';
import { newsService } from '../services/newsService.js';
import { serializeBigInt } from '../utils/json.js';

export class NewsController {
  async getNews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { symbol, limit } = req.query;
      const news = await newsService.getNews({
        symbol: symbol as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.status(200).json({
        success: true,
        count: news.length,
        data: serializeBigInt(news),
      });
    } catch (err) {
      next(err);
    }
  }

  async getNewsById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const item = await newsService.getNewsById(id);

      res.status(200).json({
        success: true,
        data: serializeBigInt(item),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const newsController = new NewsController();
