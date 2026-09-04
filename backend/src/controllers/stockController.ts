import { Request, Response, NextFunction } from 'express';
import { stockService } from '../services/stockService.js';
import { serializeBigInt } from '../utils/json.js';

export class StockController {
  async getAllStocks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sector, search, exchange } = req.query;
      const stocks = await stockService.getAllStocks({
        sector: sector as string | undefined,
        search: search as string | undefined,
        exchange: exchange as string | undefined,
      });

      res.status(200).json({
        success: true,
        count: stocks.length,
        data: serializeBigInt(stocks),
      });
    } catch (err) {
      next(err);
    }
  }

  async getStockBySymbol(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const symbol = req.params.symbol as string;
      const stock = await stockService.getStockBySymbol(symbol);

      res.status(200).json({
        success: true,
        data: serializeBigInt(stock),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const stockController = new StockController();
