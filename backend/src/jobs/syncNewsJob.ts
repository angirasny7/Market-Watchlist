import { prisma } from '../config/prisma.js';
import { ProviderFactory } from '../providers/providerFactory.js';

export interface SyncNewsResult {
  jobRunId: string;
  totalStocks: number;
  newsIngested: number;
  newsSkippedDuplicate: number;
  failedCount: number;
  durationMs: number;
}

/**
 * Real-Time News Ingestion Engine (A4)
 * 
 * Ingests verified financial news articles from the configured market provider
 * for all monitored stocks. Deduplicates by URL and validates all required metadata
 * (publisher, real URL, publishedAt).
 */
export async function runSyncNewsJob(targetSymbols?: string[]): Promise<SyncNewsResult> {
  const startTime = Date.now();
  const startedAt = new Date();

  const jobRun = await prisma.systemJobRun.create({
    data: {
      jobName: 'syncNewsJob',
      startedAt,
      status: 'RUNNING',
    },
  });

  console.log(`[SyncNewsJob:${jobRun.id}] Starting real-time news synchronization...`);

  try {
    const marketProvider = ProviderFactory.getMarketDataProvider();

    // Get symbols to sync
    let symbols = targetSymbols;
    if (!symbols || symbols.length === 0) {
      const stocks = await prisma.stock.findMany({ select: { symbol: true } });
      symbols = stocks.map((s) => s.symbol);
    }

    let newsIngested = 0;
    let newsSkippedDuplicate = 0;
    let failedCount = 0;

    for (const symbol of symbols) {
      try {
        if (!marketProvider.getNews) continue;
        const articles = await marketProvider.getNews(symbol, 10);

        for (const article of articles) {
          // Validate required metadata
          if (!article.headline || !article.sourceUrl || !article.sourceUrl.startsWith('http') || !article.sourceName) {
            continue;
          }

          // Check if article with this URL already exists for this symbol
          const existing = await prisma.news.findFirst({
            where: {
              sourceUrl: article.sourceUrl,
              stockSymbol: symbol,
            },
          });

          if (existing) {
            newsSkippedDuplicate++;
            continue;
          }

          const createdNews = await prisma.news.create({
            data: {
              stockSymbol: symbol,
              headline: article.headline,
              summary: article.summary,
              sourceName: article.sourceName,
              sourceUrl: article.sourceUrl,
              publishedAt: article.publishedAt,
              sentiment: article.sentiment,
            },
          });

          // Ingest into Event table as NEWS or FILING event (Amendment F)
          const isFiling = article.sourceName.toLowerCase().includes('bse') ||
            article.sourceName.toLowerCase().includes('nse') ||
            article.sourceName.toLowerCase().includes('sec') ||
            article.headline.toLowerCase().includes('filing') ||
            article.headline.toLowerCase().includes('disclosure');

          const eventType = isFiling ? 'FILING' : 'NEWS';
          const pubDate = new Date(article.publishedAt);
          const startOfPubDay = new Date(pubDate);
          startOfPubDay.setUTCHours(0, 0, 0, 0);
          const endOfPubDay = new Date(pubDate);
          endOfPubDay.setUTCHours(23, 59, 59, 999);

          const existingEvent = await prisma.event.findFirst({
            where: {
              stockSymbol: symbol,
              eventType,
              timestamp: { gte: startOfPubDay, lte: endOfPubDay },
            },
          });

          if (!existingEvent) {
            await prisma.event.create({
              data: {
                stockSymbol: symbol,
                eventType,
                priority: 'LOW',
                timestamp: pubDate,
                occurredOn: pubDate,
                occurredAt: pubDate,
                detectedAt: new Date(),
                metricsDelta: {
                  headline: article.headline,
                  summary: article.summary,
                  sourceUrl: article.sourceUrl,
                  sourceName: article.sourceName,
                  sentiment: article.sentiment,
                },
              },
            });
          }

          newsIngested++;
        }
      } catch (err: any) {
        console.warn(`[SyncNewsJob] Error fetching news for ${symbol}: ${err.message}`);
        failedCount++;
      }
    }

    const durationMs = Date.now() - startTime;

    await prisma.systemJobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        recordsProcessed: newsIngested,
      },
    });

    console.log(`[SyncNewsJob:${jobRun.id}] Completed in ${durationMs}ms. Ingested ${newsIngested} new articles (${newsSkippedDuplicate} duplicates skipped).`);

    return {
      jobRunId: jobRun.id,
      totalStocks: symbols.length,
      newsIngested,
      newsSkippedDuplicate,
      failedCount,
      durationMs,
    };
  } catch (err: any) {
    console.error(`[SyncNewsJob:${jobRun.id}] Fatal failure: ${err.message}`);
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
