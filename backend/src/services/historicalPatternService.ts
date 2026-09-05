import { prisma } from '../config/prisma.js';
import { EventType } from '@prisma/client';

export interface HistoricalPatternResult {
  sufficientData: boolean;
  sampleSize: number;
  avgForwardReturnPct?: number;
  winRatePct?: number;
  historicalPattern: string | null;
  forwardProbability: string | null;
}

export class HistoricalPatternService {
  /**
   * Computes empirical forward return and win rate from historical Event + StockPriceHistory records.
   * 
   * Matching Scope:
   * NOTE: Matches prioritize same-symbol events first for asset-specific relevance.
   * If same-symbol historical sample size is below minSampleSize (5), it falls back to
   * catalog-wide matching across all stocks for that eventType to maintain statistical validity.
   * 
   * Honest Fallback:
   * If total valid samples are below minSampleSize (< 5), returns sufficientData: false
   * and sets historicalPattern & forwardProbability to null. Never invents synthetic statistics.
   */
  async calculatePattern(
    eventType: EventType,
    stockSymbol?: string,
    forwardWindowDays: number = 5,
    minSampleSize: number = 5
  ): Promise<HistoricalPatternResult> {
    const windowMs = forwardWindowDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - windowMs);

    // 1. Query past events of the same eventType that occurred at least forwardWindowDays ago
    // Attempt same-symbol-first if stockSymbol is provided
    let candidateEvents = [];
    if (stockSymbol) {
      candidateEvents = await prisma.event.findMany({
        where: {
          stockSymbol,
          eventType,
          timestamp: { lte: cutoffDate },
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });
    }

    let isCatalogWide = false;
    // Fall back to catalog-wide matching if same-symbol samples are insufficient
    if (candidateEvents.length < minSampleSize) {
      isCatalogWide = true;
      candidateEvents = await prisma.event.findMany({
        where: {
          eventType,
          timestamp: { lte: cutoffDate },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
    }

    if (candidateEvents.length === 0) {
      return {
        sufficientData: false,
        sampleSize: 0,
        historicalPattern: null,
        forwardProbability: null,
      };
    }

    // 2. For each past event, compute forward return
    const returns: number[] = [];

    for (const pastEvent of candidateEvents) {
      const eventTime = pastEvent.timestamp;
      const targetForwardTime = new Date(eventTime.getTime() + windowMs);

      // Base price at event timestamp: prioritize StockPriceHistory for consistent timeseries alignment
      const baseHistory = await prisma.stockPriceHistory.findFirst({
        where: {
          stockSymbol: pastEvent.stockSymbol,
          timestamp: { lte: eventTime },
        },
        orderBy: { timestamp: 'desc' },
      });

      let basePrice: number | null = baseHistory ? Number(baseHistory.price) : null;

      // Fall back to event metricsDelta only if no prior price history bar exists
      if (!basePrice || basePrice <= 0) {
        const metrics = pastEvent.metricsDelta as any;
        if (metrics && typeof metrics.price === 'number' && metrics.price > 0) {
          basePrice = metrics.price;
        } else if (metrics && typeof metrics.currentPrice === 'number' && metrics.currentPrice > 0) {
          basePrice = metrics.currentPrice;
        }
      }

      if (!basePrice || basePrice <= 0) continue;

      // Find forward price around eventTime + forwardWindowDays
      // Look for a price bar closest to targetForwardTime
      const forwardBars = await prisma.stockPriceHistory.findMany({
        where: {
          stockSymbol: pastEvent.stockSymbol,
          timestamp: {
            gte: new Date(targetForwardTime.getTime() - 24 * 60 * 60 * 1000), // -1 day tolerance
            lte: new Date(targetForwardTime.getTime() + 2 * 24 * 60 * 60 * 1000), // +2 day tolerance
          },
        },
        take: 10,
      });

      if (forwardBars.length === 0) continue;

      const forwardHistory = forwardBars.reduce((closest, current) => {
        const currentDiff = Math.abs(current.timestamp.getTime() - targetForwardTime.getTime());
        const closestDiff = Math.abs(closest.timestamp.getTime() - targetForwardTime.getTime());
        return currentDiff < closestDiff ? current : closest;
      });

      const forwardPrice = Number(forwardHistory.price);
      if (forwardPrice > 0) {
        const returnPct = ((forwardPrice - basePrice) / basePrice) * 100;
        returns.push(returnPct);
      }
    }

    // 3. Evaluate sample threshold
    if (returns.length < minSampleSize) {
      return {
        sufficientData: false,
        sampleSize: returns.length,
        historicalPattern: null,
        forwardProbability: null,
      };
    }

    // 4. Compute empirical metrics
    const sampleSize = returns.length;
    const avgForwardReturnPct = Number((returns.reduce((sum, r) => sum + r, 0) / sampleSize).toFixed(1));
    const winCount = returns.filter((r) => r > 0).length;
    const winRatePct = Math.round((winCount / sampleSize) * 100);

    const scopeDescription = isCatalogWide
      ? `in this catalog`
      : `for ${stockSymbol}`;

    const sign = avgForwardReturnPct >= 0 ? '+' : '';
    const historicalPattern = `Based on ${sampleSize} similar ${eventType} events observed ${scopeDescription}, average ${forwardWindowDays}-day forward return was ${sign}${avgForwardReturnPct}%, positive in ${winRatePct}% of cases.`;
    const forwardProbability = `${winRatePct}% historical positive ${forwardWindowDays}-day return rate (sample size: ${sampleSize})`;

    return {
      sufficientData: true,
      sampleSize,
      avgForwardReturnPct,
      winRatePct,
      historicalPattern,
      forwardProbability,
    };
  }

  /**
   * Computes multi-horizon forward performance (1D, 5D, 30D) for a specific stock across its events.
   * If insufficient data (< minSampleSize) across horizons, returns null for unavailable horizons,
   * or null for the stock if no horizon has sufficient empirical data.
   */
  async getForwardPerformanceForStock(
    stockSymbol: string,
    eventTypes?: EventType[],
    minSampleSize: number = 5
  ): Promise<{
    day1: string | null;
    day5: string | null;
    day30: string | null;
    sampleSize?: number;
  } | null> {
    const horizons = [1, 5, 30] as const;
    const results: Record<number, { avgPct: number; count: number } | null> = {};

    for (const h of horizons) {
      const windowMs = h * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - windowMs);

      // Prioritize same-stock events first
      let pastEvents = await prisma.event.findMany({
        where: {
          stockSymbol,
          ...(eventTypes && eventTypes.length > 0 ? { eventType: { in: eventTypes } } : {}),
          timestamp: { lte: cutoffDate },
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });

      // If same-stock events are fewer than minSampleSize, fall back to catalog-wide for those eventTypes
      if (pastEvents.length < minSampleSize && eventTypes && eventTypes.length > 0) {
        pastEvents = await prisma.event.findMany({
          where: {
            eventType: { in: eventTypes },
            timestamp: { lte: cutoffDate },
          },
          orderBy: { timestamp: 'desc' },
          take: 100,
        });
      }

      const returns: number[] = [];

      for (const ev of pastEvents) {
        const eventTime = ev.timestamp;
        const targetForwardTime = new Date(eventTime.getTime() + windowMs);

        // Prioritize timeseries consistency: get basePrice from StockPriceHistory at event timestamp
        const baseHist = await prisma.stockPriceHistory.findFirst({
          where: {
            stockSymbol: ev.stockSymbol,
            timestamp: { lte: eventTime },
          },
          orderBy: { timestamp: 'desc' },
        });

        let basePrice: number | null = baseHist ? Number(baseHist.price) : null;

        // Fall back to event metrics only if no prior timeseries bar exists
        if (!basePrice || basePrice <= 0) {
          const metrics = ev.metricsDelta as any;
          if (metrics && typeof metrics.price === 'number' && metrics.price > 0) {
            basePrice = metrics.price;
          } else if (metrics && typeof metrics.currentPrice === 'number' && metrics.currentPrice > 0) {
            basePrice = metrics.currentPrice;
          }
        }

        if (!basePrice || basePrice <= 0) continue;

        // Tolerance window: 1D: +/-12h, 5D: +/-24h, 30D: +/-48h
        const toleranceMs = (h === 1 ? 12 : h === 5 ? 24 : 48) * 60 * 60 * 1000;
        const forwardBars = await prisma.stockPriceHistory.findMany({
          where: {
            stockSymbol: ev.stockSymbol,
            timestamp: {
              gte: new Date(targetForwardTime.getTime() - toleranceMs),
              lte: new Date(targetForwardTime.getTime() + toleranceMs),
            },
          },
          take: 10,
        });

        if (forwardBars.length === 0) continue;

        const forwardHist = forwardBars.reduce((closest, current) => {
          const currentDiff = Math.abs(current.timestamp.getTime() - targetForwardTime.getTime());
          const closestDiff = Math.abs(closest.timestamp.getTime() - targetForwardTime.getTime());
          return currentDiff < closestDiff ? current : closest;
        });

        const forwardPrice = Number(forwardHist.price);
        if (forwardPrice > 0) {
          returns.push(((forwardPrice - basePrice) / basePrice) * 100);
        }
      }

      if (returns.length >= minSampleSize) {
        const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
        results[h] = { avgPct: avg, count: returns.length };
      } else {
        results[h] = null;
      }
    }

    if (!results[1] && !results[5] && !results[30]) {
      return null;
    }

    const maxSample = Math.max(results[1]?.count || 0, results[5]?.count || 0, results[30]?.count || 0);

    return {
      day1: results[1] ? `${results[1].avgPct >= 0 ? '+' : ''}${results[1].avgPct.toFixed(1)}%` : null,
      day5: results[5] ? `${results[5].avgPct >= 0 ? '+' : ''}${results[5].avgPct.toFixed(1)}%` : null,
      day30: results[30] ? `${results[30].avgPct >= 0 ? '+' : ''}${results[30].avgPct.toFixed(1)}%` : null,
      sampleSize: maxSample,
    };
  }
}

export const historicalPatternService = new HistoricalPatternService();
