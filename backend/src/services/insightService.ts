import { prisma } from '../config/prisma.js';
import { getUserWatchlistSymbols } from '../utils/userOnboarding.js';

export class InsightService {
  async getInsights(options?: {
    minConfidence?: number;
    symbol?: string;
    limit?: number;
    userId?: string;
  }) {
    const where: any = {};

    if (options?.userId) {
      const watchlistSymbols = await getUserWatchlistSymbols(options.userId);
      if (watchlistSymbols.length === 0) {
        return []; // User has an empty watchlist, so no insights exist
      }

      if (options?.symbol) {
        const reqSym = options.symbol.toUpperCase();
        if (!watchlistSymbols.includes(reqSym)) {
          return []; // Symbol not in user's watchlist
        }
        where.stockSymbol = reqSym;
      } else {
        where.stockSymbol = { in: watchlistSymbols };
      }
    } else if (options?.symbol) {
      where.stockSymbol = options.symbol.toUpperCase();
    }

    if (options?.minConfidence) {
      where.confidenceScore = { gte: options.minConfidence };
    }

    const insights = await prisma.insight.findMany({
      where,
      orderBy: { confidenceScore: 'desc' },
      take: options?.limit || 20,
      include: {
        event: {
          include: { stock: true },
        },
      },
    });

    return insights.map((ins) => ({
      ...ins,
      confidenceScore: Number(ins.confidenceScore),
      event: {
        ...ins.event,
        stock: {
          ...ins.event.stock,
          currentPrice: Number(ins.event.stock.currentPrice),
          changeAmount: Number(ins.event.stock.changeAmount),
          changePercent: Number(ins.event.stock.changePercent),
          volume: Number(ins.event.stock.volume),
          avgVolume20D: Number(ins.event.stock.avgVolume20D),
          peRatio: ins.event.stock.peRatio ? Number(ins.event.stock.peRatio) : null,
          high52w: Number(ins.event.stock.high52w),
          low52w: Number(ins.event.stock.low52w),
        },
      },
    }));
  }

  async getInsightsByEventId(eventId: string) {
    const insights = await prisma.insight.findMany({
      where: { relatedEventId: eventId },
      include: {
        event: {
          include: { stock: true },
        },
      },
    });

    return insights.map((ins) => ({
      ...ins,
      confidenceScore: Number(ins.confidenceScore),
      event: {
        ...ins.event,
        stock: {
          ...ins.event.stock,
          currentPrice: Number(ins.event.stock.currentPrice),
          changeAmount: Number(ins.event.stock.changeAmount),
          changePercent: Number(ins.event.stock.changePercent),
          volume: Number(ins.event.stock.volume),
          avgVolume20D: Number(ins.event.stock.avgVolume20D),
          peRatio: ins.event.stock.peRatio ? Number(ins.event.stock.peRatio) : null,
          high52w: Number(ins.event.stock.high52w),
          low52w: Number(ins.event.stock.low52w),
        },
      },
    }));
  }
}

export const insightService = new InsightService();
