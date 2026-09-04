import { prisma } from '../config/prisma.js';

export class StockService {
  async getAllStocks(query?: { sector?: string; search?: string; exchange?: string }) {
    const where: any = {};

    if (query?.sector) {
      where.sector = query.sector;
    }
    if (query?.exchange) {
      where.exchange = query.exchange;
    }
    if (query?.search) {
      where.OR = [
        { symbol: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const stocks = await prisma.stock.findMany({
      where,
      orderBy: { changePercent: 'desc' },
      include: {
        events: {
          take: 1,
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    // Map BigInt volume fields to numbers/strings for clean JSON serialization
    return stocks.map((s) => ({
      ...s,
      currentPrice: Number(s.currentPrice),
      changeAmount: Number(s.changeAmount),
      changePercent: Number(s.changePercent),
      volume: Number(s.volume),
      avgVolume20D: Number(s.avgVolume20D),
      peRatio: s.peRatio ? Number(s.peRatio) : null,
      high52w: Number(s.high52w),
      low52w: Number(s.low52w),
    }));
  }

  async getStockBySymbol(symbol: string) {
    const stock = await prisma.stock.findUnique({
      where: { symbol: symbol.toUpperCase() },
      include: {
        events: {
          orderBy: { timestamp: 'desc' },
          take: 5,
          include: { insights: true },
        },
        news: {
          orderBy: { publishedAt: 'desc' },
          take: 5,
        },
        priceHistory: {
          orderBy: { timestamp: 'desc' },
          take: 30,
        },
      },
    });

    if (!stock) {
      const error: any = new Error(`Stock with symbol ${symbol} not found`);
      error.statusCode = 404;
      throw error;
    }

    return {
      ...stock,
      currentPrice: Number(stock.currentPrice),
      changeAmount: Number(stock.changeAmount),
      changePercent: Number(stock.changePercent),
      volume: Number(stock.volume),
      avgVolume20D: Number(stock.avgVolume20D),
      peRatio: stock.peRatio ? Number(stock.peRatio) : null,
      high52w: Number(stock.high52w),
      low52w: Number(stock.low52w),
      priceHistory: stock.priceHistory.map((p) => ({
        ...p,
        price: Number(p.price),
        changePercent: Number(p.changePercent),
        volume: Number(p.volume),
      })),
    };
  }
}

export const stockService = new StockService();
