import { EventType, MarketMood, Priority } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ProviderFactory } from '../providers/providerFactory.js';
import { attentionScoringService } from './attentionScoringService.js';
import { computeUserSinceTimestamp } from './sinceLastVisitService.js';
import { alertService } from './alertService.js';

export interface CatchUpResult {
  userId: string;
  since: string;
  daysSince: number;
  watchlistSymbols: string[];
  eventsCreated: number;
  digestsCreated: number;
  isStale: boolean;
  durationMs: number;
}

export class CatchUpService {
  /**
   * Reconstructs missed market events and digests for a user returning after absence.
   */
  async catchUpForUser(userId: string): Promise<CatchUpResult> {
    const startTime = Date.now();

    // 1. Determine `since` cursor and user's watchlist symbols
    const userState = await prisma.userState.findUnique({
      where: { userId },
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastLoginAt: true },
    });

    const since = computeUserSinceTimestamp({
      previousSessionAt: userState?.previousSessionAt,
      lastSeenAt: userState?.lastSeenAt,
      lastLoginAt: userState?.lastLoginAt || user?.lastLoginAt,
    });

    const watchlistStocks = await prisma.watchlistStock.findMany({
      where: { watchlist: { userId } },
      include: { stock: true },
    });

    const watchlistSymbols = Array.from(new Set(watchlistStocks.map((w) => w.stockSymbol)));
    const daysSince = Math.max(1, Math.ceil((Date.now() - since.getTime()) / (24 * 60 * 60 * 1000)));

    if (watchlistSymbols.length === 0) {
      return {
        userId,
        since: since.toISOString(),
        daysSince,
        watchlistSymbols: [],
        eventsCreated: 0,
        digestsCreated: 0,
        isStale: false,
        durationMs: Date.now() - startTime,
      };
    }

    const marketProvider = ProviderFactory.getMarketDataProvider();

    // 2. Check last successful quote sync; if older than 30 min, do lightweight sync for user's symbols
    const lastSyncRun = await prisma.systemJobRun.findFirst({
      where: { jobName: 'syncStocksJob', status: 'SUCCESS' },
      orderBy: { completedAt: 'desc' },
    });

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const quoteSyncNeeded = !lastSyncRun || !lastSyncRun.completedAt || lastSyncRun.completedAt < thirtyMinutesAgo;

    if (quoteSyncNeeded) {
      for (const symbol of watchlistSymbols) {
        try {
          const quote = await marketProvider.getQuote(symbol);
          if (quote) {
            await prisma.stock.upsert({
              where: { symbol },
              update: {
                currentPrice: quote.price,
                changeAmount: quote.changeAmount,
                changePercent: quote.changePercent,
                volume: BigInt(quote.volume),
                avgVolume20D: BigInt(quote.avgVolume20D),
                high52w: quote.high52w,
                low52w: quote.low52w,
                peRatio: quote.peRatio,
                marketCap: quote.marketCap || 'N/A',
                updatedAt: new Date(),
              },
              create: {
                symbol,
                companyName: quote.companyName,
                sector: 'General',
                exchange: quote.exchange,
                currency: quote.currency,
                currentPrice: quote.price,
                changeAmount: quote.changeAmount,
                changePercent: quote.changePercent,
                volume: BigInt(quote.volume),
                avgVolume20D: BigInt(quote.avgVolume20D),
                high52w: quote.high52w,
                low52w: quote.low52w,
                marketCap: quote.marketCap || 'N/A',
              },
            });
          }
        } catch (err: any) {
          console.warn(`[CatchUpService] Quote sync failed for ${symbol}: ${err.message}`);
          await prisma.systemJobRun.create({
            data: {
              jobName: 'catchUpSyncStock',
              status: 'FAILED',
              errorMessage: `Quote sync failed for ${symbol}: ${err.message}`,
              completedAt: new Date(),
            },
          }).catch(() => {});
        }
      }
    }

    // 3. For each symbol, fetch historical bars min(daysSince + 25, 365) and evaluate thresholds
    let eventsCreated = 0;
    const daysToFetch = Math.min(daysSince + 25, 365);

    for (const symbol of watchlistSymbols) {
      let bars: any[] = [];
      try {
        bars = await marketProvider.getHistoricalBars(symbol, daysToFetch);
      } catch (err: any) {
        console.warn(`[CatchUpService] Historical bars fetch failed for ${symbol}: ${err.message}`);
        await prisma.systemJobRun.create({
          data: {
            jobName: 'catchUpHistoricalBars',
            status: 'FAILED',
            errorMessage: `Failed historical bars for ${symbol}: ${err.message}`,
            completedAt: new Date(),
          },
        }).catch(() => {});
        continue;
      }

      if (!bars || bars.length === 0) continue;

      // Ensure bars sorted chronologically
      bars.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const stock = await prisma.stock.findUnique({ where: { symbol } });
      const currentStockPrice = stock ? Number(stock.currentPrice) : bars[bars.length - 1].close;

      // Find bar closest to `since` for cumulative evaluation
      let barAtSince: any = null;
      for (const bar of bars) {
        if (new Date(bar.timestamp).getTime() <= since.getTime()) {
          barAtSince = bar;
        } else {
          if (!barAtSince) barAtSince = bar;
          break;
        }
      }
      if (!barAtSince && bars.length > 0) {
        barAtSince = bars[0];
      }

      // Check bars after `since`
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        const barTime = new Date(bar.timestamp);
        if (barTime.getTime() <= since.getTime()) {
          continue;
        }

        const prevBar = i > 0 ? bars[i - 1] : null;
        const basePrice = prevBar ? prevBar.close : bar.open;
        const dayChangePercent = basePrice > 0 ? ((bar.close - basePrice) / basePrice) * 100 : 0;
        const barVolume = bar.volume || 0;

        // Calculate trailing 20-bar average volume
        const priorBars = bars.slice(Math.max(0, i - 20), i);
        const avgVol20 =
          priorBars.length > 0
            ? priorBars.reduce((sum, b) => sum + (b.volume || 0), 0) / priorBars.length
            : 0;

        // Trailing 52-week High/Low from past bars
        const trailing52wBars = bars.slice(Math.max(0, i - 252), i + 1);
        const high52w = trailing52wBars.length > 0 ? Math.max(...trailing52wBars.map((b) => b.high)) : bar.high;
        const low52w = trailing52wBars.length > 0 ? Math.min(...trailing52wBars.map((b) => b.low)) : bar.low;

        const dateStr = barTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const anomalies: Array<{ eventType: EventType; reason: string; priority: Priority; score: number }> = [];

        // Threshold 1: Day Price Surge (>= 5%)
        if (dayChangePercent >= 5.0) {
          const scoreRes = attentionScoringService.calculateScore({
            changePercent: dayChangePercent,
            volume: barVolume,
            avgVolume20D: Math.round(avgVol20),
            eventType: EventType.PRICE_SURGE,
          });
          anomalies.push({
            eventType: EventType.PRICE_SURGE,
            reason: `Price surged +${dayChangePercent.toFixed(2)}% on ${dateStr} exceeding the +5% anomaly threshold.`,
            priority: scoreRes.priority,
            score: scoreRes.score,
          });
        }

        // Threshold 2: Day Price Drop (<= -5%)
        if (dayChangePercent <= -5.0) {
          const scoreRes = attentionScoringService.calculateScore({
            changePercent: dayChangePercent,
            volume: barVolume,
            avgVolume20D: Math.round(avgVol20),
            eventType: EventType.PRICE_DROP,
          });
          anomalies.push({
            eventType: EventType.PRICE_DROP,
            reason: `Price dropped ${dayChangePercent.toFixed(2)}% on ${dateStr} exceeding the -5% risk threshold.`,
            priority: scoreRes.priority,
            score: scoreRes.score,
          });
        }

        // Threshold 3: Volume Spike (>= 2x 20D average)
        if (avgVol20 > 0 && barVolume >= 2.0 * avgVol20) {
          const ratio = (barVolume / avgVol20).toFixed(1);
          const scoreRes = attentionScoringService.calculateScore({
            changePercent: dayChangePercent,
            volume: barVolume,
            avgVolume20D: Math.round(avgVol20),
            eventType: EventType.VOLUME_SPIKE,
          });
          anomalies.push({
            eventType: EventType.VOLUME_SPIKE,
            reason: `Trading volume reached ${ratio}x of 20-day historical average on ${dateStr}.`,
            priority: scoreRes.priority,
            score: scoreRes.score,
          });
        }

        // Threshold 4: 52-Week High Proximity (within 0.5%)
        if (high52w > 0 && bar.high >= high52w * 0.995) {
          const scoreRes = attentionScoringService.calculateScore({
            changePercent: dayChangePercent,
            volume: barVolume,
            avgVolume20D: Math.round(avgVol20),
            eventType: EventType.FIFTY_TWO_WEEK_HIGH,
          });
          anomalies.push({
            eventType: EventType.FIFTY_TWO_WEEK_HIGH,
            reason: `Price traded within 0.5% of 52-week peak (${high52w.toFixed(2)}) on ${dateStr}.`,
            priority: scoreRes.priority,
            score: scoreRes.score,
          });
        }

        // Threshold 5: 52-Week Low Proximity (within 0.5%)
        if (low52w > 0 && bar.low <= low52w * 1.005) {
          const scoreRes = attentionScoringService.calculateScore({
            changePercent: dayChangePercent,
            volume: barVolume,
            avgVolume20D: Math.round(avgVol20),
            eventType: EventType.FIFTY_TWO_WEEK_LOW,
          });
          anomalies.push({
            eventType: EventType.FIFTY_TWO_WEEK_LOW,
            reason: `Price tested 52-week support floor (${low52w.toFixed(2)}) on ${dateStr}.`,
            priority: scoreRes.priority,
            score: scoreRes.score,
          });
        }

        // Calendar-day deduplication & persistence
        const startOfDay = new Date(barTime);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(barTime);
        endOfDay.setHours(23, 59, 59, 999);

        for (const anomaly of anomalies) {
          const existingEvent = await prisma.event.findFirst({
            where: {
              stockSymbol: symbol,
              eventType: anomaly.eventType,
              timestamp: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          });

          if (!existingEvent) {
            await prisma.event.create({
              data: {
                stockSymbol: symbol,
                eventType: anomaly.eventType,
                priority: anomaly.priority,
                timestamp: barTime,
                metricsDelta: {
                  attentionScore: anomaly.score,
                  detectionReason: anomaly.reason,
                  price: bar.close,
                  changePercent: parseFloat(dayChangePercent.toFixed(2)),
                  volume: barVolume,
                  avgVolume20D: Math.round(avgVol20),
                  volumeRatio: avgVol20 > 0 ? parseFloat((barVolume / avgVol20).toFixed(2)) : 1.0,
                  enrichment: {
                    whatHappened: anomaly.reason,
                    whyItHappened: `Session price action and volume accumulation on ${dateStr}.`,
                    whyItMatters: `High-impact technical movement detected during your absence.`,
                    sources: [
                      {
                        title: `${symbol} Trading Record (${dateStr})`,
                        url: `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`,
                        publisher: 'NSE Historical Feed',
                        publishedAt: barTime.toISOString(),
                        confidence: 0.95,
                      },
                    ],
                    confidenceScore: 0.92,
                  },
                },
              },
            });
            eventsCreated++;
          }
        }
      }

      // 4. Cumulative event: |price now vs price at `since`| >= 8%
      if (barAtSince && barAtSince.close > 0) {
        const priceAtSince = barAtSince.close;
        const cumChangePct = ((currentStockPrice - priceAtSince) / priceAtSince) * 100;

        if (Math.abs(cumChangePct) >= 8.0) {
          const isGain = cumChangePct >= 0;
          const cumEventType = isGain ? EventType.PRICE_SURGE : EventType.PRICE_DROP;
          const signStr = isGain ? '+' : '';
          const cumReason = `${stock?.companyName || symbol} is ${signStr}${cumChangePct.toFixed(1)}% since your last visit (${priceAtSince.toFixed(2)} → ${currentStockPrice.toFixed(2)}).`;

          // Check if cumulative event already created for today's calendar day
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);

          const existingCumEvent = await prisma.event.findFirst({
            where: {
              stockSymbol: symbol,
              eventType: cumEventType,
              timestamp: {
                gte: todayStart,
                lte: todayEnd,
              },
            },
          });

          if (!existingCumEvent) {
            const scoreRes = attentionScoringService.calculateScore({
              changePercent: cumChangePct,
              volume: stock ? Number(stock.volume) : 1000000,
              avgVolume20D: stock ? Number(stock.avgVolume20D) : 1000000,
              eventType: cumEventType,
            });

            await prisma.event.create({
              data: {
                stockSymbol: symbol,
                eventType: cumEventType,
                priority: scoreRes.priority,
                timestamp: new Date(),
                metricsDelta: {
                  attentionScore: scoreRes.score,
                  detectionReason: cumReason,
                  price: currentStockPrice,
                  priceAtSince,
                  changePercent: parseFloat(cumChangePct.toFixed(2)),
                  isCumulativeReturnEvent: true,
                  enrichment: {
                    whatHappened: cumReason,
                    whyItHappened: `Cumulative market trend since last session on ${since.toLocaleDateString()}.`,
                    whyItMatters: `Significant portfolio drift occurred while you were away.`,
                    sources: [
                      {
                        title: `${symbol} Trend Assessment`,
                        url: `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`,
                        publisher: 'Market Intelligence Engine',
                        publishedAt: new Date().toISOString(),
                        confidence: 0.98,
                      },
                    ],
                    confidenceScore: 0.98,
                  },
                },
              },
            });
            eventsCreated++;
          }
        }
      }
    }

    // 5. Create digests for the gap
    let digestsCreated = 0;
    const gapEvents = await prisma.event.findMany({
      where: {
        stockSymbol: { in: watchlistSymbols },
        timestamp: { gte: since },
        digestEvents: { none: {} },
      },
      include: {
        stock: true,
        insights: true,
      },
      orderBy: { timestamp: 'desc' },
    });

    if (gapEvents.length > 0) {
      if (daysSince <= 7) {
        // Group by calendar day (one digest per missed trading day)
        const dayMap = new Map<string, typeof gapEvents>();
        for (const ev of gapEvents) {
          const dStr = new Date(ev.timestamp).toISOString().split('T')[0];
          if (!dayMap.has(dStr)) dayMap.set(dStr, []);
          dayMap.get(dStr)!.push(ev);
        }

        for (const [dayKey, dayEvts] of dayMap.entries()) {
          const dateObj = new Date(dayKey);
          const formattedDate = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          const mood = this.determineMoodFromEvents(dayEvts);
          const topSymbol = dayEvts[0].stockSymbol;
          const headline = `${topSymbol} & Watchlist Developments (${formattedDate})`;
          const executiveSummary = `${dayEvts.length} notable event(s) detected across your tracked stocks on ${formattedDate}.`;

          const digest = await prisma.digest.create({
            data: {
              headline,
              executiveSummary,
              marketMood: mood,
              timeRange: `${formattedDate} Session`,
              benchmarkCloses: { nifty50: null, sensex: null, indiaVix: null },
              read: false,
              digestEvents: {
                create: dayEvts.map((e) => ({ eventId: e.id })),
              },
            },
          });
          if (digest) digestsCreated++;
        }
      } else {
        // Single summary digest for the gap
        const mood = this.determineMoodFromEvents(gapEvents);
        const topSymbol = gapEvents[0].stockSymbol;
        const headline = `${daysSince}-Day Market Dossier: ${topSymbol} & Watchlist Developments`;
        const executiveSummary = `Comprehensive summary of ${gapEvents.length} watchlist events detected while you were away (${daysSince} days).`;

        const digest = await prisma.digest.create({
          data: {
            headline,
            executiveSummary,
            marketMood: mood,
            timeRange: `${since.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${daysSince} Days)`,
            benchmarkCloses: { nifty50: null, sensex: null, indiaVix: null },
            read: false,
            digestEvents: {
              create: gapEvents.map((e) => ({ eventId: e.id })),
            },
          },
        });
        if (digest) digestsCreated++;
      }
    }

    // Evaluate active alerts for the user's watchlist symbols
    try {
      await alertService.evaluateAlerts(watchlistSymbols);
    } catch (e: any) {
      console.error('[CatchUp] Alert evaluation warning:', e.message);
    }

    return {
      userId,
      since: since.toISOString(),
      daysSince,
      watchlistSymbols,
      eventsCreated,
      digestsCreated,
      isStale: false,
      durationMs: Date.now() - startTime,
    };
  }

  private determineMoodFromEvents(events: any[]): MarketMood {
    let surgeCount = 0;
    let dropCount = 0;
    for (const ev of events) {
      if (ev.eventType === EventType.PRICE_SURGE || ev.eventType === EventType.FIFTY_TWO_WEEK_HIGH) surgeCount++;
      if (ev.eventType === EventType.PRICE_DROP || ev.eventType === EventType.FIFTY_TWO_WEEK_LOW) dropCount++;
    }
    if (surgeCount > dropCount) return MarketMood.BULLISH;
    if (dropCount > surgeCount) return MarketMood.BEARISH;
    return MarketMood.NEUTRAL;
  }
}

export const catchUpService = new CatchUpService();
