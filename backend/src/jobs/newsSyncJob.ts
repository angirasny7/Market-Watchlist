import { prisma } from '../config/prisma.js';
import { ProviderFactory } from '../providers/providerFactory.js';
import { recordNewsSyncCompleted } from './scheduler.js';

export interface SyncNewsResult {
  jobRunId: string;
  totalArticlesFetched: number;
  newArticlesInserted: number;
  duplicateArticlesSkipped: number;
  durationMs: number;
}

/**
 * News Synchronization Job
 * 
 * Ingests live financial media headlines from RSS feeds and financial news APIs,
 * performs strict URL and headline deduplication, and persists clean articles into PostgreSQL.
 */
export async function runNewsSyncJob(): Promise<SyncNewsResult> {
  const startTime = Date.now();
  const startedAt = new Date();

  // 1. Initialize observability record
  const jobRun = await prisma.systemJobRun.create({
    data: {
      jobName: 'newsSyncJob',
      startedAt,
      status: 'RUNNING',
    },
  });

  console.log(`[NewsSyncJob:${jobRun.id}] Starting real-time news synchronization...`);

  try {
    const newsProvider = ProviderFactory.getNewsProvider();

    // 2. Fetch tracked stocks
    const stocks = await prisma.stock.findMany({
      select: { symbol: true },
      take: 10,
    });

    let totalFetched = 0;
    let insertedCount = 0;
    let skippedCount = 0;

    // Default anchor stock for macro / general market news
    const defaultAnchorSymbol = stocks[0]?.symbol || 'RELIANCE';

    // 3. Ingest stock-specific news
    for (const stock of stocks) {
      try {
        const articles = await newsProvider.getNewsForStock(stock.symbol, 4);
        totalFetched += articles.length;

        for (const item of articles) {
          // Check for existing article by URL or identical headline
          const existing = await prisma.news.findFirst({
            where: {
              OR: [
                { sourceUrl: item.sourceUrl },
                { headline: item.headline },
              ],
            },
          });

          if (existing) {
            skippedCount++;
            continue;
          }

          await prisma.news.create({
            data: {
              stockSymbol: stock.symbol,
              headline: item.headline,
              summary: item.summary,
              sourceName: item.sourceName,
              sourceUrl: item.sourceUrl,
              publishedAt: item.publishedAt,
              sentiment: item.sentiment,
            },
          });

          insertedCount++;
        }
      } catch (stockErr: any) {
        console.warn(`[NewsSyncJob] Failed to fetch news for ${stock.symbol}: ${stockErr.message}`);
      }
    }

    // 4. Ingest broader market / macro news
    try {
      const macroArticles = await newsProvider.getLatestNews(5);
      totalFetched += macroArticles.length;

      for (const item of macroArticles) {
        const existing = await prisma.news.findFirst({
          where: {
            OR: [
              { sourceUrl: item.sourceUrl },
              { headline: item.headline },
            ],
          },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        await prisma.news.create({
          data: {
            stockSymbol: defaultAnchorSymbol,
            headline: item.headline,
            summary: item.summary,
            sourceName: item.sourceName,
            sourceUrl: item.sourceUrl,
            publishedAt: item.publishedAt,
            sentiment: item.sentiment,
          },
        });

        insertedCount++;
      }
    } catch (macroErr: any) {
      console.warn(`[NewsSyncJob] Failed to fetch macro market news: ${macroErr.message}`);
    }

    const durationMs = Date.now() - startTime;

    // 5. Update observability record
    await prisma.systemJobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        recordsProcessed: insertedCount,
      },
    });

    console.log(
      `[NewsSyncJob:${jobRun.id}] Completed in ${durationMs}ms. Ingested ${insertedCount} new articles (${skippedCount} duplicates skipped, ${totalFetched} total evaluated).`
    );

    recordNewsSyncCompleted();

    return {
      jobRunId: jobRun.id,
      totalArticlesFetched: totalFetched,
      newArticlesInserted: insertedCount,
      duplicateArticlesSkipped: skippedCount,
      durationMs,
    };
  } catch (err: any) {
    console.error(`[NewsSyncJob:${jobRun.id}] Fatal execution failure: ${err.message}`);

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
