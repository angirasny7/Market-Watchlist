import { prisma } from '../config/prisma.js';
import { masterStockCatalog } from '../data/stockCatalogData.js';

export class StockService {
  /**
   * Automatically verifies and upserts the master catalog on startup.
   * Preserves all user-generated watchlists, reads, memories, and state.
   */
  async ensureMasterCatalogSeeded(): Promise<number> {
    let count = 0;
    for (const item of masterStockCatalog) {
      await prisma.stock.upsert({
        where: { symbol: item.symbol },
        update: {
          companyName: item.companyName,
          sector: item.sector,
          exchange: item.exchange,
          currency: item.currency,
          currentPrice: item.currentPrice,
          changeAmount: item.changeAmount,
          changePercent: item.changePercent,
          volume: item.volume,
          avgVolume20D: item.avgVolume20D,
          marketCap: item.marketCap,
          peRatio: item.peRatio,
          high52w: item.high52w,
          low52w: item.low52w,
          tags: item.tags,
          sparkline: item.sparkline,
        },
        create: {
          symbol: item.symbol,
          companyName: item.companyName,
          sector: item.sector,
          exchange: item.exchange,
          currency: item.currency,
          currentPrice: item.currentPrice,
          changeAmount: item.changeAmount,
          changePercent: item.changePercent,
          volume: item.volume,
          avgVolume20D: item.avgVolume20D,
          marketCap: item.marketCap,
          peRatio: item.peRatio,
          high52w: item.high52w,
          low52w: item.low52w,
          tags: item.tags,
          sparkline: item.sparkline,
        },
      });
      count++;
    }
    console.log(`[StockService] Master stock catalog verified (${count} stocks synced)`);
    return count;
  }

  async getAllStocks(query?: { sector?: string; search?: string; exchange?: string }) {
    const where: any = {};

    if (query?.sector && query.sector !== 'ALL') {
      where.sector = query.sector;
    }

    if (query?.exchange && query.exchange !== 'ALL') {
      const ex = query.exchange.trim().toUpperCase();
      if (ex === 'US' || ex === 'GLOBAL') {
        where.exchange = { in: ['NASDAQ', 'NYSE'] };
      } else if (ex === 'INDIA' || ex === 'IN') {
        where.exchange = 'NSE';
      } else {
        where.exchange = { equals: query.exchange, mode: 'insensitive' };
      }
    }

    if (query?.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { symbol: { contains: s, mode: 'insensitive' } },
        { companyName: { contains: s, mode: 'insensitive' } },
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
    // and provide both changePercent and dailyChangePercent
    return stocks.map((s) => ({
      ...s,
      currentPrice: Number(s.currentPrice),
      changeAmount: Number(s.changeAmount),
      changePercent: Number(s.changePercent),
      dailyChangePercent: Number(s.changePercent),
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
