import { MarketMood } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ProviderFactory } from '../providers/providerFactory.js';
import { historicalPatternService } from '../services/historicalPatternService.js';

export interface DigestGenerationResult {
  jobRunId: string;
  digestCreated: boolean;
  digestId?: string;
  eventsAttached: number;
  insightsAttached: number;
  marketMood: MarketMood;
  durationMs: number;
}

/**
 * Market Memory Digest Engine
 * 
 * Aggregates recent anomaly events, insights, and macro benchmark movements into
 * permanent historical intelligence dossiers. Automatically fires when 3+ unarchived events
 * accumulate or when explicitly requested.
 */
export async function runDigestGenerationJob(options?: { force?: boolean }): Promise<DigestGenerationResult> {
  const startTime = Date.now();
  const startedAt = new Date();

  // 1. Initialize observability record
  const jobRun = await prisma.systemJobRun.create({
    data: {
      jobName: 'digestGenerationJob',
      startedAt,
      status: 'RUNNING',
    },
  });

  console.log(`[DigestGenerationJob:${jobRun.id}] Checking for unarchived market events...`);

  try {
    // 2. Fetch unarchived events
    const unattachedEvents = await prisma.event.findMany({
      where: {
        digestEvents: { none: {} },
      },
      include: {
        stock: true,
        insights: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    // Check threshold: at least 3 events required unless forced
    if (unattachedEvents.length < 3 && !options?.force) {
      console.log(
        `[DigestGenerationJob] Found ${unattachedEvents.length} unarchived events (threshold is 3). Skipping generation.`
      );

      await prisma.systemJobRun.update({
        where: { id: jobRun.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          recordsProcessed: 0,
        },
      });

      return {
        jobRunId: jobRun.id,
        digestCreated: false,
        eventsAttached: 0,
        insightsAttached: 0,
        marketMood: MarketMood.NEUTRAL,
        durationMs: Date.now() - startTime,
      };
    }

    // 3. Compute Market Mood from current stock catalog movements
    const allStocks = await prisma.stock.findMany({
      select: { symbol: true, changePercent: true, currentPrice: true },
    });

    const avgChange =
      allStocks.reduce((sum, s) => sum + Number(s.changePercent), 0) / Math.max(1, allStocks.length);

    let marketMood: MarketMood = MarketMood.NEUTRAL;
    if (avgChange >= 1.5) {
      marketMood = MarketMood.EXTREME_GREED;
    } else if (avgChange >= 0.3) {
      marketMood = MarketMood.BULLISH;
    } else if (avgChange <= -1.5) {
      marketMood = MarketMood.BEARISH;
    } else if (avgChange <= -0.3) {
      marketMood = MarketMood.CHOPPY;
    } else {
      marketMood = MarketMood.NEUTRAL;
    }

    // 4. Construct Benchmark Closes & Forward Performance Projections
    let benchmarkCloses: Record<string, any> = {
      nifty50: null,
      sensex: null,
      indiaVix: null,
    };

    try {
      const marketProvider = ProviderFactory.getMarketDataProvider();
      const indexQuotes = await marketProvider.getBatchQuotes(['^NSEI', '^BSESN', '^INDIAVIX']);
      const niftyQuote = indexQuotes.find((q) => q.symbol === '^NSEI' || q.symbol === 'NIFTY50' || q.symbol === 'NIFTY');
      const sensexQuote = indexQuotes.find((q) => q.symbol === '^BSESN' || q.symbol === 'SENSEX');
      const vixQuote = indexQuotes.find((q) => q.symbol === '^INDIAVIX' || q.symbol === 'INDIAVIX' || q.symbol === 'VIX');

      benchmarkCloses = {
        nifty50: niftyQuote ? {
          close: Number(niftyQuote.price.toFixed(2)),
          change: Number(niftyQuote.changeAmount.toFixed(2)),
          pct: Number(niftyQuote.changePercent.toFixed(2)),
        } : null,
        sensex: sensexQuote ? {
          close: Number(sensexQuote.price.toFixed(2)),
          change: Number(sensexQuote.changeAmount.toFixed(2)),
          pct: Number(sensexQuote.changePercent.toFixed(2)),
        } : null,
        indiaVix: vixQuote ? {
          close: Number(vixQuote.price.toFixed(2)),
          change: Number(vixQuote.changeAmount.toFixed(2)),
          pct: Number(vixQuote.changePercent.toFixed(2)),
        } : null,
      };
    } catch (err: any) {
      console.warn(`[DigestGenerationJob] Failed to fetch live benchmark index quotes: ${err.message}`);
    }

    const topMovingStock = unattachedEvents[0]?.stockSymbol || allStocks[0]?.symbol || 'NIFTY';
    const eventCount = unattachedEvents.length;

    const headline = `Market Dossier: ${topMovingStock} Catalysts, Volume Rotations, and Sector Trends`;
    const executiveSummary = `Comprehensive intelligence summary across ${eventCount} active watchlist developments. Overall market posture indicates a ${marketMood.toLowerCase().replace('_', ' ')} environment with average catalog variance of ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%. Institutional positioning remained focused on high-conviction large caps with active liquidity concentration.`;

    // 4b. Construct real per-stock forward performance map
    const forwardPerformanceMap: Record<string, any> = {};
    const uniqueSymbols = Array.from(new Set(unattachedEvents.map((e) => e.stockSymbol)));

    for (const symbol of uniqueSymbols) {
      const stockEvents = unattachedEvents.filter((e) => e.stockSymbol === symbol);
      const stockEventTypes = Array.from(new Set(stockEvents.map((e) => e.eventType)));
      const perf = await historicalPatternService.getForwardPerformanceForStock(symbol, stockEventTypes, 5);
      forwardPerformanceMap[symbol] = perf;
    }

    // 5. Gather unique insights across these events
    const insightIdsToAttach: string[] = [];
    for (const ev of unattachedEvents) {
      for (const ins of ev.insights) {
        insightIdsToAttach.push(ins.id);
      }
    }

    // 6. Create Digest record and relational links
    const digest = await prisma.digest.create({
      data: {
        headline,
        executiveSummary,
        marketMood,
        timeRange: `${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} Trading Session`,
        benchmarkCloses,
        forwardPerformanceMap,
        read: false,
        digestEvents: {
          create: unattachedEvents.map((e) => ({
            eventId: e.id,
          })),
        },
        digestInsights: {
          create: insightIdsToAttach.map((id) => ({
            insightId: id,
          })),
        },
      },
    });

    const durationMs = Date.now() - startTime;

    await prisma.systemJobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        recordsProcessed: 1,
      },
    });

    console.log(
      `[DigestGenerationJob:${jobRun.id}] Completed in ${durationMs}ms. Created Digest "${digest.id}" attaching ${unattachedEvents.length} events and ${insightIdsToAttach.length} insights.`
    );

    return {
      jobRunId: jobRun.id,
      digestCreated: true,
      digestId: digest.id,
      eventsAttached: unattachedEvents.length,
      insightsAttached: insightIdsToAttach.length,
      marketMood,
      durationMs,
    };
  } catch (err: any) {
    console.error(`[DigestGenerationJob:${jobRun.id}] Fatal execution failure: ${err.message}`);

    await prisma.systemJobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: err.message,
      },
    });

    throw err;
  }
}
