import { prisma } from '../config/prisma.js';
import { masterStockCatalog } from '../data/stockCatalogData.js';
import { ProviderFactory } from '../providers/providerFactory.js';

export type StockHistoryRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface StockHistoryBar {
  time: number; // Unix timestamp in seconds (for lightweight-charts)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockHistoryResponse {
  symbol: string;
  range: StockHistoryRange;
  currency: string;
  currentPrice: number;
  changePercent: number;
  dataPoints: StockHistoryBar[];
}

interface CachedHistoryEntry {
  data: StockHistoryResponse;
  expiresAt: number;
}

// In-memory TTL cache for stock history (5 min for intraday 1D/1W, 1 hour for 1M/1Y/ALL)
const historyCache = new Map<string, CachedHistoryEntry>();

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

  /**
   * Fetch historical OHLCV chart bars for lightweight-charts with TTL in-memory caching.
   * Caches 5 minutes for 1D/1W, 1 hour for 1M/1Y/ALL.
   */
  async getStockHistory(
    rawSymbol: string,
    range: StockHistoryRange = '1M'
  ): Promise<StockHistoryResponse> {
    const symbol = rawSymbol.toUpperCase().trim();
    const cacheKey = `${symbol}_${range}`;
    const now = Date.now();

    // 1. Check in-memory TTL cache
    const cached = historyCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // 2. Lookup stock
    const stock = await prisma.stock.findUnique({
      where: { symbol },
    });
    if (!stock) {
      const error: any = new Error(`Stock with symbol ${symbol} not found`);
      error.statusCode = 404;
      throw error;
    }

    const currentPrice = Number(stock.currentPrice);
    const changePercent = Number(stock.changePercent || 0);

    let days = 30;
    if (range === '1D') days = 1;
    else if (range === '1W') days = 7;
    else if (range === '1M') days = 30;
    else if (range === '3M') days = 90;
    else if (range === '6M') days = 180;
    else if (range === '1Y') days = 365;
    else if (range === 'ALL') days = 730;

    let bars: StockHistoryBar[] = [];

    // 3. Intraday 1D session generation vs Multi-day bars
    if (range === '1D') {
      const openPrice = +(currentPrice / (1 + changePercent / 100)).toFixed(2);
      const pointsCount = 24; // 15-minute intervals across market day
      const sessionStart = new Date();
      sessionStart.setHours(9, 15, 0, 0);
      const startMs = sessionStart.getTime();

      let prevClose = openPrice;
      for (let i = 0; i < pointsCount; i++) {
        const t = i / (pointsCount - 1);
        const wave = Math.sin(t * Math.PI) * 0.004 * currentPrice;
        const target = openPrice + (currentPrice - openPrice) * t + wave;
        const close = +(target).toFixed(2);
        const high = +(Math.max(prevClose, close) + Math.abs(close * 0.002)).toFixed(2);
        const low = +(Math.min(prevClose, close) - Math.abs(close * 0.002)).toFixed(2);
        const barTime = Math.floor((startMs + i * 15 * 60 * 1000) / 1000);

        bars.push({
          time: barTime,
          open: prevClose,
          high,
          low,
          close,
          volume: Math.floor(50000 + Math.random() * 80000),
        });
        prevClose = close;
      }
    } else {
      // Multi-day bars from provider
      try {
        const provider = ProviderFactory.getMarketDataProvider();
        const rawBars = await provider.getHistoricalBars(symbol, days);

        if (rawBars && rawBars.length > 0) {
          bars = rawBars.map((b) => ({
            time: Math.floor(new Date(b.timestamp).getTime() / 1000),
            open: +b.open.toFixed(2),
            high: +b.high.toFixed(2),
            low: +b.low.toFixed(2),
            close: +b.close.toFixed(2),
            volume: b.volume || 100000,
          }));
        }
      } catch (err) {
        console.warn(`[StockService] Provider getHistoricalBars error for ${symbol}:`, err);
      }

      // Fallback: if provider returned no bars, synthesize mathematically consistent continuous bars
      if (bars.length === 0) {
        const count =
          range === '1W' ? 7 :
          range === '1M' ? 22 :
          range === '3M' ? 65 :
          range === '6M' ? 130 :
          range === '1Y' ? 250 : 300;
        const stepDays = days / count;
        let prevClose = +(currentPrice / (1 + (changePercent * (count > 20 ? 1.5 : 1)) / 100)).toFixed(2);

        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          const drift = prevClose + (currentPrice - prevClose) * t;
          const noise = (Math.sin(i * 0.8) * 0.01 + (Math.random() * 0.006 - 0.003)) * currentPrice;
          const close = +(i === count - 1 ? currentPrice : Math.max(1, drift + noise)).toFixed(2);
          const high = +(Math.max(prevClose, close) + Math.abs(close * 0.008)).toFixed(2);
          const low = +(Math.min(prevClose, close) - Math.abs(close * 0.008)).toFixed(2);
          const barDate = new Date(now - (count - 1 - i) * stepDays * 24 * 60 * 60 * 1000);
          const barTime = Math.floor(barDate.getTime() / 1000);

          bars.push({
            time: barTime,
            open: prevClose,
            high,
            low,
            close,
            volume: Math.floor(200000 + Math.random() * 300000),
          });
          prevClose = close;
        }
      }
    }

    // Ensure strictly ascending time order (TradingView lightweight-charts requirement)
    bars.sort((a, b) => a.time - b.time);

    // Deduplicate any exact timestamp collisions
    const deduplicatedBars: StockHistoryBar[] = [];
    let lastTime = 0;
    for (const b of bars) {
      if (b.time > lastTime) {
        deduplicatedBars.push(b);
        lastTime = b.time;
      }
    }

    const response: StockHistoryResponse = {
      symbol: stock.symbol,
      range,
      currency: stock.currency || '₹',
      currentPrice,
      changePercent,
      dataPoints: deduplicatedBars,
    };

    // 4. Cache response (5 min for 1D/1W, 1 hour for 1M/1Y/ALL)
    const ttlMs = range === '1D' || range === '1W' ? 5 * 60 * 1000 : 60 * 60 * 1000;
    historyCache.set(cacheKey, {
      data: response,
      expiresAt: now + ttlMs,
    });

    return response;
  }
}

export const stockService = new StockService();
