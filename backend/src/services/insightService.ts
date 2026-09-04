import { prisma } from '../config/prisma.js';

export class InsightService {
  async getInsights(options?: {
    minConfidence?: number;
    symbol?: string;
    limit?: number;
  }) {
    const where: any = {};

    if (options?.symbol) {
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
