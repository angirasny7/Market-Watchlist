import { prisma } from '../config/prisma.js';
import { ProviderFactory } from '../providers/providerFactory.js';
import { recordStockSyncCompleted } from './scheduler.js';

export interface SyncStocksResult {
  jobRunId: string;
  totalTracked: number;
  successCount: number;
  failedCount: number;
  durationMs: number;
}

/**
 * Stock Synchronization Job
 * 
 * Fetches real-time quotes from the configured MarketDataProvider,
 * updates current prices and volume metrics in the Stock table,
 * and appends historical checkpoints to StockPriceHistory.
 */
export async function runSyncStocksJob(): Promise<SyncStocksResult> {
  const startTime = Date.now();
  const startedAt = new Date();

  // 1. Initialize observability record
  const jobRun = await prisma.systemJobRun.create({
    data: {
      jobName: 'syncStocksJob',
      startedAt,
      status: 'RUNNING',
    },
  });

  console.log(`[SyncStocksJob:${jobRun.id}] Starting real-time stock synchronization...`);

  try {
    const marketProvider = ProviderFactory.getMarketDataProvider();

    // 2. Fetch all registered stocks from database
    const stocks = await prisma.stock.findMany({
      select: { symbol: true },
    });

    if (stocks.length === 0) {
      console.log('[SyncStocksJob] No stocks found in database to synchronize.');
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
        totalTracked: 0,
        successCount: 0,
        failedCount: 0,
        durationMs: Date.now() - startTime,
      };
    }

    let successCount = 0;
    let failedCount = 0;

    // 3. Process each ticker independently with isolated error boundaries
    for (const stock of stocks) {
      try {
        const quote = await marketProvider.getQuote(stock.symbol);

        if (!quote) {
          console.warn(`[SyncStocksJob] Quote not returned for ${stock.symbol}`);
          failedCount++;
          continue;
        }

        const now = new Date();

        // Update master stock record
        await prisma.stock.update({
          where: { symbol: stock.symbol },
          data: {
            currentPrice: quote.price,
            changeAmount: quote.changeAmount,
            changePercent: quote.changePercent,
            volume: BigInt(Math.max(0, Math.round(quote.volume))),
            avgVolume20D: BigInt(Math.max(0, Math.round(quote.avgVolume20D))),
            high52w: quote.high52w,
            low52w: quote.low52w,
            peRatio: quote.peRatio !== undefined ? quote.peRatio : undefined,
            marketCap: quote.marketCap || undefined,
            updatedAt: now,
          },
        });

        // Append historical price checkpoint for charts and anomaly scoring
        await prisma.stockPriceHistory.create({
          data: {
            stockSymbol: stock.symbol,
            price: quote.price,
            changePercent: quote.changePercent,
            volume: BigInt(Math.max(0, Math.round(quote.volume))),
            timestamp: now,
          },
        });

        // Backfill 30-day historical bars if history is sparse (< 7 checkpoints)
        const historyCount = await prisma.stockPriceHistory.count({
          where: { stockSymbol: stock.symbol },
        });

        if (historyCount < 7) {
          const bars = await marketProvider.getHistoricalBars(stock.symbol, 30);
          if (bars && bars.length > 0) {
            for (const bar of bars) {
              await prisma.stockPriceHistory.create({
                data: {
                  stockSymbol: stock.symbol,
                  price: bar.close,
                  changePercent: parseFloat((((bar.close - bar.open) / (bar.open || 1)) * 100).toFixed(2)),
                  volume: BigInt(Math.max(0, Math.round(bar.volume))),
                  timestamp: bar.timestamp,
                },
              });
            }
            console.log(`[SyncStocksJob] Backfilled ${bars.length} historical bars for ${stock.symbol}`);
          }
        }

        successCount++;
      } catch (tickerErr: any) {
        console.error(`[SyncStocksJob] Error syncing ticker ${stock.symbol}: ${tickerErr.message}`);
        failedCount++;
      }
    }

    const durationMs = Date.now() - startTime;

    // 4. Update observability record
    await prisma.systemJobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        recordsProcessed: successCount,
      },
    });

    console.log(`[SyncStocksJob:${jobRun.id}] Completed in ${durationMs}ms. Updated ${successCount}/${stocks.length} stocks (${failedCount} failed).`);

    recordStockSyncCompleted();

    return {
      jobRunId: jobRun.id,
      totalTracked: stocks.length,
      successCount,
      failedCount,
      durationMs,
    };
  } catch (err: any) {
    console.error(`[SyncStocksJob:${jobRun.id}] Fatal execution failure: ${err.message}`);

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
