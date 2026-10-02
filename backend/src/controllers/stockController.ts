import { Request, Response, NextFunction } from 'express';
import { stockService, StockHistoryRange } from '../services/stockService.js';
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

  async getStockHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const symbol = req.params.symbol as string;
      const rawRange = ((req.query.range as string) || '1M').toUpperCase();
      const validRanges: StockHistoryRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'];
      if (!validRanges.includes(rawRange as StockHistoryRange)) {
        res.status(400).json({
          success: false,
          error: `Invalid range. Allowed: 1D, 1W, 1M, 3M, 6M, 1Y`,
        });
        return;
      }
      const range = rawRange as StockHistoryRange;
      const history = await stockService.getStockHistory(symbol, range);

      res.status(200).json({
        success: true,
        data: history,
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

export const stockController = new StockController();
