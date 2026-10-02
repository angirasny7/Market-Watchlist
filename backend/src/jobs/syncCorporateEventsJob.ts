import YahooFinance from 'yahoo-finance2';
import { prisma } from '../config/prisma.js';
import { CorporateEventType } from '@prisma/client';

export interface SyncCorporateEventsResult {
  jobRunId: string;
  totalStocks: number;
  eventsSynced: number;
  durationMs: number;
}

/**
 * Resolves internal symbol to Yahoo Finance query ticker.
 */
function resolveYahooTicker(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  const symbolMap: Record<string, string> = {
    TATAMOTORS: 'TMCV.NS',
    TMPV: 'TMPV.NS',
    TMCV: 'TMCV.NS',
    INFY: 'INFY.NS',
    TCS: 'TCS.NS',
    RELIANCE: 'RELIANCE.NS',
    HDFCBANK: 'HDFCBANK.NS',
    ICICIBANK: 'ICICIBANK.NS',
    LT: 'LT.NS',
    BHARTIARTL: 'BHARTIARTL.NS',
    SBIN: 'SBIN.NS',
    ITC: 'ITC.NS',
    SUZLON: 'SUZLON.NS',
    ZOMATO: 'ETERNAL.NS',
    ETERNAL: 'ETERNAL.NS',
    NIFTY50: '^NSEI',
    NIFTY: '^NSEI',
    SENSEX: '^BSESN',
    INDIAVIX: '^INDIAVIX',
  };

  if (symbolMap[upper]) return symbolMap[upper];
  if (upper.startsWith('^') || upper.includes('.') || upper.includes('=')) return upper;

  const usTickers = new Set(['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'SPY', 'QQQ']);
  if (usTickers.has(upper)) return upper;

  return `${upper}.NS`;
}

/**
 * Syncs real upcoming corporate events (Earnings, Dividends, Ex-Dividends)
 * from Yahoo Finance into the CorporateEvent table.
 *
 * Handles failures per symbol gracefully and logs execution to SystemJobRun.
 */
export async function runSyncCorporateEventsJob(): Promise<SyncCorporateEventsResult> {
  const startTime = Date.now();
  const startedAt = new Date();

  const jobRun = await prisma.systemJobRun.create({
    data: {
      jobName: 'syncCorporateEvents',
      startedAt,
      status: 'RUNNING',
    },
  });

  const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

  try {
    const stocks = await prisma.stock.findMany({
      select: { symbol: true, companyName: true },
    });

    if (stocks.length === 0) {
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
        totalStocks: 0,
        eventsSynced: 0,
        durationMs: Date.now() - startTime,
      };
    }

    let totalEventsSynced = 0;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    for (const stock of stocks) {
      try {
        const yahooTicker = resolveYahooTicker(stock.symbol);

        // Fetch calendar events module
        let calendarEvents: any = null;
        try {
          const summary: any = await yf.quoteSummary(yahooTicker, {
            modules: ['calendarEvents'],
          });
          calendarEvents = summary?.calendarEvents;
        } catch {
          // calendarEvents module may not be supported for all tickers
        }

        const candidates: Array<{
          type: CorporateEventType;
          date: Date;
          title: string;
          details?: string;
        }> = [];

        // 1. Earnings dates
        if (calendarEvents?.earnings?.earningsDate) {
          const rawDates = Array.isArray(calendarEvents.earnings.earningsDate)
            ? calendarEvents.earnings.earningsDate
            : [calendarEvents.earnings.earningsDate];

          for (const d of rawDates) {
            const dt = new Date(d);
            if (!isNaN(dt.getTime()) && dt >= startOfToday) {
              const isEstimate = Boolean(calendarEvents.earnings.isEarningsDateEstimate);
              candidates.push({
                type: 'EARNINGS',
                date: dt,
                title: `${stock.companyName || stock.symbol} Earnings Announcement`,
                details: isEstimate ? 'Estimated quarterly earnings release' : 'Confirmed earnings release',
              });
            }
          }
        }

        // 2. Ex-Dividend date
        if (calendarEvents?.exDividendDate) {
          const dt = new Date(calendarEvents.exDividendDate);
          if (!isNaN(dt.getTime()) && dt >= startOfToday) {
            candidates.push({
              type: 'EX_DIVIDEND',
              date: dt,
              title: `${stock.companyName || stock.symbol} Ex-Dividend Date`,
              details: 'Ex-dividend date for upcoming corporate distribution',
            });
          }
        }

        // 3. Dividend payout date
        if (calendarEvents?.dividendDate) {
          const dt = new Date(calendarEvents.dividendDate);
          if (!isNaN(dt.getTime()) && dt >= startOfToday) {
            candidates.push({
              type: 'DIVIDEND',
              date: dt,
              title: `${stock.companyName || stock.symbol} Dividend Payout Date`,
              details: 'Expected dividend payout date',
            });
          }
        }

        // 4. Fallback to quote() if calendarEvents module produced no future dates
        if (candidates.length === 0) {
          try {
            const q: any = await yf.quote(yahooTicker);
            if (q?.earningsTimestamp) {
              const dt = new Date(q.earningsTimestamp);
              if (!isNaN(dt.getTime()) && dt >= startOfToday) {
                candidates.push({
                  type: 'EARNINGS',
                  date: dt,
                  title: `${stock.companyName || stock.symbol} Earnings Announcement`,
                  details: 'Earnings announcement date from market quote',
                });
              }
            }
            if (q?.dividendDate) {
              const dt = new Date(q.dividendDate);
              if (!isNaN(dt.getTime()) && dt >= startOfToday) {
                candidates.push({
                  type: 'DIVIDEND',
                  date: dt,
                  title: `${stock.companyName || stock.symbol} Dividend Payout Date`,
                  details: 'Upcoming dividend payout date',
                });
              }
            }
          } catch {
            // Ignore quote fallback error
          }
        }

        // Upsert candidates idempotently
        for (const cand of candidates) {
          const windowStart = new Date(cand.date.getTime() - 24 * 60 * 60 * 1000);
          const windowEnd = new Date(cand.date.getTime() + 24 * 60 * 60 * 1000);

          const existing = await prisma.corporateEvent.findFirst({
            where: {
              stockSymbol: stock.symbol,
              eventType: cand.type,
              eventDate: { gte: windowStart, lte: windowEnd },
            },
          });

          if (existing) {
            await prisma.corporateEvent.update({
              where: { id: existing.id },
              data: {
                eventDate: cand.date,
                title: cand.title,
                details: cand.details,
                isDemo: false,
              },
            });
          } else {
            await prisma.corporateEvent.create({
              data: {
                stockSymbol: stock.symbol,
                eventType: cand.type,
                eventDate: cand.date,
                title: cand.title,
                details: cand.details,
                isDemo: false,
              },
            });
          }
          totalEventsSynced++;
        }
      } catch (symbolError: any) {
        // Individual symbol failures do not crash the job
        console.warn(`[SyncCorporateEventsJob] Warning: Failed to sync events for ${stock.symbol}: ${symbolError.message}`);
      }
    }

    await prisma.systemJobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        recordsProcessed: totalEventsSynced,
      },
    });

    return {
      jobRunId: jobRun.id,
      totalStocks: stocks.length,
      eventsSynced: totalEventsSynced,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    console.error('[SyncCorporateEventsJob] Fatal job execution error:', err.message);
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
