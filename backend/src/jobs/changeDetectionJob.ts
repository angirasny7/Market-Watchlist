import { EventType } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { attentionScoringService } from '../services/attentionScoringService.js';
import { contextEnrichmentService } from '../services/contextEnrichmentService.js';

export interface ChangeDetectionResult {
  jobRunId: string;
  totalStocksEvaluated: number;
  eventsCreated: number;
  eventsSkippedDuplicate: number;
  durationMs: number;
}

/**
 * Change Detection Engine
 * 
 * Inspects all active stock quotes in PostgreSQL and evaluates them against 7 core anomaly rules.
 * Computes attention scores and priorities, deduplicates events within a 4-hour window,
 * and persists new Event records linked to master stocks.
 */
export async function runChangeDetectionJob(): Promise<ChangeDetectionResult> {
  const startTime = Date.now();
  const startedAt = new Date();

  // 1. Initialize observability record
  const jobRun = await prisma.systemJobRun.create({
    data: {
      jobName: 'changeDetectionJob',
      startedAt,
      status: 'RUNNING',
    },
  });

  console.log(`[ChangeDetectionJob:${jobRun.id}] Starting automated anomaly detection...`);

  try {
    const stocks = await prisma.stock.findMany({
      include: {
        news: {
          orderBy: { publishedAt: 'desc' },
          take: 3,
        },
      },
    });

    let eventsCreated = 0;
    let eventsSkippedDuplicate = 0;
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    for (const stock of stocks) {
      const currentPrice = Number(stock.currentPrice);
      const changeAmount = Number(stock.changeAmount);
      const changePercent = Number(stock.changePercent);
      const volume = Number(stock.volume);
      const avgVolume20D = Number(stock.avgVolume20D);
      const high52w = Number(stock.high52w);
      const low52w = Number(stock.low52w);

      const potentialAnomalies: Array<{
        eventType: EventType;
        reason: string;
      }> = [];

      // Rule 1: Price Surge (>= 5%)
      if (changePercent >= 5.0) {
        potentialAnomalies.push({
          eventType: EventType.PRICE_SURGE,
          reason: `Price surged +${changePercent.toFixed(2)}% exceeding the +5% anomaly threshold.`,
        });
      }

      // Rule 2: Price Drop (<= -5%)
      if (changePercent <= -5.0) {
        potentialAnomalies.push({
          eventType: EventType.PRICE_DROP,
          reason: `Price dropped ${changePercent.toFixed(2)}% exceeding the -5% risk threshold.`,
        });
      }

      // Rule 3: Volume Spike (>= 2x 20D average)
      if (avgVolume20D > 0 && volume >= 2.0 * avgVolume20D) {
        const ratio = (volume / avgVolume20D).toFixed(1);
        potentialAnomalies.push({
          eventType: EventType.VOLUME_SPIKE,
          reason: `Trading volume reached ${ratio}x of the 20-day historical average (${volume.toLocaleString()} vs ${avgVolume20D.toLocaleString()}).`,
        });
      } else if (avgVolume20D > 0 && volume >= 1.5 * avgVolume20D) {
        const ratio = (volume / avgVolume20D).toFixed(1);
        potentialAnomalies.push({
          eventType: EventType.VOLUME_SPIKE,
          reason: `Elevated institutional volume (${ratio}x of 20-day average).`,
        });
      }

      // Rule 4: 52-Week High (within 0.5% or breaking past)
      if (high52w > 0 && currentPrice >= high52w * 0.995) {
        potentialAnomalies.push({
          eventType: EventType.FIFTY_TWO_WEEK_HIGH,
          reason: `Price (${currentPrice}) traded within 0.5% of the 52-week peak (${high52w}).`,
        });
      }

      // Rule 5: 52-Week Low (within 0.5% or breaking lower)
      if (low52w > 0 && currentPrice <= low52w * 1.005) {
        potentialAnomalies.push({
          eventType: EventType.FIFTY_TWO_WEEK_LOW,
          reason: `Price (${currentPrice}) tested the 52-week support floor (${low52w}).`,
        });
      }

      // Validation before event generation:
      if (!currentPrice || currentPrice <= 0 || isNaN(currentPrice)) {
        continue;
      }

      // Check sanity: reject > 25% single-day moves without corporate action
      if (Math.abs(changePercent) > 25.0) {
        const corporateActions = await prisma.corporateEvent.findMany({
          where: {
            stockSymbol: stock.symbol,
            eventDate: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          },
        });
        if (corporateActions.length === 0) {
          await prisma.systemJobRun.create({
            data: {
              jobName: 'changeDetectionSanityGuard',
              status: 'FAILED',
              errorMessage: `Skipped implausible move of ${changePercent.toFixed(2)}% for ${stock.symbol} exceeding 25% single-day limit without corporate action.`,
              completedAt: new Date(),
            },
          }).catch(() => {});
          continue;
        }
      }

      // Deduplicate and persist each detected anomaly (Calendar-day idempotency)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const baselinePrice = currentPrice - changeAmount;

      for (const anomaly of potentialAnomalies) {
        const existingEventToday = await prisma.event.findFirst({
          where: {
            stockSymbol: stock.symbol,
            eventType: anomaly.eventType,
            timestamp: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        });

        const scoreResult = attentionScoringService.calculateScore({
          changePercent,
          volume,
          avgVolume20D,
          eventType: anomaly.eventType,
        });

        const metricsData = {
          attentionScore: scoreResult.score,
          detectionReason: anomaly.reason,
          explanation: scoreResult.explanation,
          baselinePrice: parseFloat(baselinePrice.toFixed(2)),
          price: currentPrice,
          eventPrice: currentPrice,
          changeAmount,
          changePercent,
          volume,
          avgVolume20D,
          volumeRatio: avgVolume20D > 0 ? parseFloat((volume / avgVolume20D).toFixed(2)) : 1.0,
          high52w,
          low52w,
          updatedAt: new Date().toISOString(),
        };

        if (existingEventToday) {
          // Idempotent update: update metrics if new data is available on the same calendar day
          const updatedMetrics = {
            ...((existingEventToday.metricsDelta as any) || {}),
            ...metricsData,
          };

          const enrichment = await contextEnrichmentService.enrichEvent(
            {
              ...existingEventToday,
              metricsDelta: updatedMetrics,
            },
            stock
          );

          await prisma.event.update({
            where: { id: existingEventToday.id },
            data: {
              priority: scoreResult.priority,
              metricsDelta: {
                ...updatedMetrics,
                enrichment,
              },
            },
          });

          eventsSkippedDuplicate++;
          continue;
        }

        const createdEvent = await prisma.event.create({
          data: {
            stockSymbol: stock.symbol,
            eventType: anomaly.eventType,
            priority: scoreResult.priority,
            timestamp: new Date(),
            occurredOn: new Date(),
            detectedAt: new Date(),
            metricsDelta: metricsData,
          },
        });

        // Enrich with verified context & evidence
        const enrichment = await contextEnrichmentService.enrichEvent(createdEvent, stock);
        await prisma.event.update({
          where: { id: createdEvent.id },
          data: {
            metricsDelta: {
              ...(createdEvent.metricsDelta as any),
              enrichment,
            },
          },
        });

        eventsCreated++;
      }
    }

    const durationMs = Date.now() - startTime;

    await prisma.systemJobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        recordsProcessed: eventsCreated,
      },
    });

    console.log(
      `[ChangeDetectionJob:${jobRun.id}] Completed in ${durationMs}ms. Created ${eventsCreated} new events (${eventsSkippedDuplicate} duplicates skipped).`
    );

    return {
      jobRunId: jobRun.id,
      totalStocksEvaluated: stocks.length,
      eventsCreated,
      eventsSkippedDuplicate,
      durationMs,
    };
  } catch (err: any) {
    console.error(`[ChangeDetectionJob:${jobRun.id}] Fatal execution failure: ${err.message}`);

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
