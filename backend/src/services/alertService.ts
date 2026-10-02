import { AlertType, EventType, Priority, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export interface EvaluateAlertOptions {
  historicalBars?: Map<
    string,
    Array<{
      timestamp: Date | string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>
  >;
  since?: Date;
}

export class AlertService {
  async listAlerts(userId: string) {
    const alerts = await prisma.alert.findMany({
      where: { userId },
      include: {
        stock: {
          select: {
            symbol: true,
            companyName: true,
            currentPrice: true,
            changePercent: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map((a) => ({
      id: a.id,
      stockSymbol: a.stockSymbol,
      alertType: a.alertType,
      targetValue: Number(a.targetValue),
      isActive: a.isActive,
      triggeredAt: a.triggeredAt ? a.triggeredAt.toISOString() : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      stock: a.stock
        ? {
            symbol: a.stock.symbol,
            companyName: a.stock.companyName,
            currentPrice: Number(a.stock.currentPrice),
            changePercent: Number(a.stock.changePercent),
            currency: a.stock.currency,
          }
        : null,
    }));
  }

  async createAlert(
    userId: string,
    data: { stockSymbol: string; alertType: AlertType; targetValue: number }
  ) {
    const symbol = (data.stockSymbol || '').toUpperCase().trim();
    if (!symbol) {
      const error: any = new Error('Stock symbol is required');
      error.statusCode = 400;
      throw error;
    }

    const validTypes: AlertType[] = [
      'PRICE_ABOVE',
      'PRICE_BELOW',
      'DAY_CHANGE_PCT',
      'ATTENTION_LEVEL',
      'ATTENTION_SCORE',
      'EARNINGS',
      'DIVIDEND',
      'AGM',
    ];
    if (!validTypes.includes(data.alertType)) {
      const error: any = new Error(
        `Invalid alertType. Allowed: ${validTypes.join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }

    const targetVal = Number(data.targetValue);
    if (isNaN(targetVal)) {
      const error: any = new Error('targetValue must be a valid number');
      error.statusCode = 400;
      throw error;
    }

    // Validation per alert type
    if (
      (data.alertType === 'ATTENTION_LEVEL' || data.alertType === 'ATTENTION_SCORE') &&
      (targetVal < 0 || targetVal > 100)
    ) {
      const error: any = new Error('Attention score threshold must be between 0 and 100');
      error.statusCode = 400;
      throw error;
    }

    if (
      (data.alertType === 'EARNINGS' || data.alertType === 'DIVIDEND' || data.alertType === 'AGM') &&
      (targetVal <= 0 || !Number.isInteger(targetVal))
    ) {
      const error: any = new Error('Event notice days must be a positive integer (e.g. 1, 3, or 7 days prior)');
      error.statusCode = 400;
      throw error;
    }

    const stock = await prisma.stock.findUnique({
      where: { symbol },
    });
    if (!stock) {
      const error: any = new Error(`Stock ${symbol} does not exist`);
      error.statusCode = 404;
      throw error;
    }

    const alert = await prisma.alert.create({
      data: {
        userId,
        stockSymbol: symbol,
        alertType: data.alertType,
        targetValue: new Prisma.Decimal(targetVal),
        isActive: true,
      },
      include: {
        stock: {
          select: {
            symbol: true,
            companyName: true,
            currentPrice: true,
            changePercent: true,
            currency: true,
          },
        },
      },
    });

    return {
      id: alert.id,
      stockSymbol: alert.stockSymbol,
      alertType: alert.alertType,
      targetValue: Number(alert.targetValue),
      isActive: alert.isActive,
      triggeredAt: null,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
      stock: alert.stock
        ? {
            symbol: alert.stock.symbol,
            companyName: alert.stock.companyName,
            currentPrice: Number(alert.stock.currentPrice),
            changePercent: Number(alert.stock.changePercent),
            currency: alert.stock.currency,
          }
        : null,
    };
  }

  async updateAlert(
    userId: string,
    alertId: string,
    data: { isActive?: boolean; targetValue?: number }
  ) {
    const alert = await prisma.alert.findFirst({
      where: { id: alertId, userId },
    });
    if (!alert) {
      const error: any = new Error('Alert not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const updateData: any = {};
    if (typeof data.isActive === 'boolean') {
      updateData.isActive = data.isActive;
    }
    if (typeof data.targetValue === 'number' && !isNaN(data.targetValue)) {
      updateData.targetValue = new Prisma.Decimal(data.targetValue);
    }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: updateData,
      include: {
        stock: {
          select: {
            symbol: true,
            companyName: true,
            currentPrice: true,
            changePercent: true,
            currency: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      stockSymbol: updated.stockSymbol,
      alertType: updated.alertType,
      targetValue: Number(updated.targetValue),
      isActive: updated.isActive,
      triggeredAt: updated.triggeredAt ? updated.triggeredAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      stock: updated.stock
        ? {
            symbol: updated.stock.symbol,
            companyName: updated.stock.companyName,
            currentPrice: Number(updated.stock.currentPrice),
            changePercent: Number(updated.stock.changePercent),
            currency: updated.stock.currency,
          }
        : null,
    };
  }

  async deleteAlert(userId: string, alertId: string) {
    const alert = await prisma.alert.findFirst({
      where: { id: alertId, userId },
    });
    if (!alert) {
      const error: any = new Error('Alert not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    await prisma.alert.delete({
      where: { id: alertId },
    });

    return { success: true, id: alertId };
  }

  /**
   * Alert trigger engine
   * Evaluates active alerts against current stock quotes, historical crossing bars (for catch-up),
   * attention scores, and upcoming corporate events (Earnings, Dividends, AGMs).
   *
   * When triggered:
   * 1. Sets alert.isActive = false, alert.triggeredAt = timestamp.
   * 2. Creates Notification.
   * 3. Creates an Attention Feed Event + Insight (idempotently, never twice for the same crossing).
   */
  async evaluateAlerts(symbols?: string[], options?: EvaluateAlertOptions): Promise<number> {
    const whereClause: any = { isActive: true };
    if (symbols && symbols.length > 0) {
      whereClause.stockSymbol = { in: symbols };
    }

    const activeAlerts = await prisma.alert.findMany({
      where: whereClause,
      include: { stock: true },
    });

    if (activeAlerts.length === 0) return 0;

    let triggeredCount = 0;
    const now = new Date();

    for (const alert of activeAlerts) {
      const stock = alert.stock;
      if (!stock) continue;

      // Cooldown safeguard: If alert was triggered within the last 60 minutes, do not trigger again
      if (alert.triggeredAt) {
        const cooldownMs = 60 * 60 * 1000;
        if (now.getTime() - new Date(alert.triggeredAt).getTime() < cooldownMs) {
          continue;
        }
      }

      const currentPrice = Number(stock.currentPrice);
      const changePct = Number(stock.changePercent);
      const targetVal = Number(alert.targetValue);
      const currency = stock.currency || '₹';

      let isTriggered = false;
      let title = '';
      let message = '';
      let crossingTimestamp: Date = now;
      let feedEventType: EventType = EventType.PRICE_SURGE;

      // Check if historical bars provide exact date for price crossings
      const stockBars = options?.historicalBars?.get(alert.stockSymbol);

      switch (alert.alertType) {
        case 'PRICE_ABOVE': {
          feedEventType = EventType.PRICE_SURGE;
          // Check if triggered currently or in historical bars since last visit
          let crossingBar: any = null;
          if (stockBars && stockBars.length > 0) {
            for (const bar of stockBars) {
              const bTime = new Date(bar.timestamp);
              if (options?.since && bTime.getTime() < options.since.getTime()) continue;
              if (bar.high >= targetVal || bar.close >= targetVal) {
                crossingBar = bar;
                break;
              }
            }
          }

          if (crossingBar) {
            isTriggered = true;
            crossingTimestamp = new Date(crossingBar.timestamp);
            const dateStr = crossingTimestamp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            title = `${alert.stockSymbol} crossed ${currency}${targetVal.toLocaleString('en-IN')} on ${dateStr}`;
            message = `${stock.companyName} crossed above your target price of ${currency}${targetVal.toLocaleString('en-IN')} on ${dateStr}. Current price: ${currency}${currentPrice.toFixed(2)}.`;
          } else if (currentPrice >= targetVal) {
            isTriggered = true;
            crossingTimestamp = now;
            const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            title = `${alert.stockSymbol} crossed ${currency}${targetVal.toLocaleString('en-IN')} on ${dateStr}`;
            message = `${stock.companyName} is trading at ${currency}${currentPrice.toFixed(2)}, crossing above your target price of ${currency}${targetVal.toLocaleString('en-IN')} on ${dateStr}.`;
          }
          break;
        }

        case 'PRICE_BELOW': {
          feedEventType = EventType.PRICE_DROP;
          let crossingBar: any = null;
          if (stockBars && stockBars.length > 0) {
            for (const bar of stockBars) {
              const bTime = new Date(bar.timestamp);
              if (options?.since && bTime.getTime() < options.since.getTime()) continue;
              if (bar.low <= targetVal || bar.close <= targetVal) {
                crossingBar = bar;
                break;
              }
            }
          }

          if (crossingBar) {
            isTriggered = true;
            crossingTimestamp = new Date(crossingBar.timestamp);
            const dateStr = crossingTimestamp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            title = `${alert.stockSymbol} dropped below ${currency}${targetVal.toLocaleString('en-IN')} on ${dateStr}`;
            message = `${stock.companyName} dropped below your target price of ${currency}${targetVal.toLocaleString('en-IN')} on ${dateStr}. Current price: ${currency}${currentPrice.toFixed(2)}.`;
          } else if (currentPrice <= targetVal) {
            isTriggered = true;
            crossingTimestamp = now;
            const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            title = `${alert.stockSymbol} dropped below ${currency}${targetVal.toLocaleString('en-IN')} on ${dateStr}`;
            message = `${stock.companyName} dropped to ${currency}${currentPrice.toFixed(2)}, falling below your target price of ${currency}${targetVal.toLocaleString('en-IN')} on ${dateStr}.`;
          }
          break;
        }

        case 'DAY_CHANGE_PCT': {
          feedEventType = changePct >= 0 ? EventType.PRICE_SURGE : EventType.PRICE_DROP;
          if (Math.abs(changePct) >= Math.abs(targetVal)) {
            isTriggered = true;
            crossingTimestamp = now;
            const sign = changePct >= 0 ? '+' : '';
            title = `${alert.stockSymbol} moved ${sign}${changePct.toFixed(2)}% today`;
            message = `${stock.companyName} day change reached ${sign}${changePct.toFixed(2)}%, exceeding your threshold of ${targetVal}%.`;
          }
          break;
        }

        // ATTENTION_LEVEL and ATTENTION_SCORE are both evaluated against the composite 0-100 attention score
        // derived from unread event metricsDelta.attentionScore (or priority fallback CRITICAL: 80, HIGH: 65, MEDIUM: 45, LOW: 20).
        // If maxScore >= targetVal (0-100), the alert triggers.
        case 'ATTENTION_LEVEL':
        case 'ATTENTION_SCORE': {
          feedEventType = EventType.VOLUME_SPIKE;
          const unreadEvents = await prisma.event.findMany({
            where: {
              stockSymbol: alert.stockSymbol,
              userReads: { none: { userId: alert.userId } },
            },
            select: { priority: true, metricsDelta: true, timestamp: true },
          });

          let maxScore = 0;
          let latestEventTime: Date = now;
          for (const ev of unreadEvents) {
            const delta = (ev.metricsDelta as any) || {};
            let score = typeof delta.attentionScore === 'number' ? delta.attentionScore : 0;
            if (!score) {
              if (ev.priority === 'CRITICAL') score = 80;
              else if (ev.priority === 'HIGH') score = 65;
              else if (ev.priority === 'MEDIUM') score = 45;
              else score = 20;
            }
            if (score > maxScore) {
              maxScore = score;
              latestEventTime = ev.timestamp;
            }
          }

          if (maxScore >= targetVal) {
            isTriggered = true;
            crossingTimestamp = latestEventTime;
            title = `${alert.stockSymbol} attention score reached ${maxScore}`;
            message = `High market attention detected for ${stock.companyName} with attention score ${maxScore} (threshold ${targetVal}).`;
          }
          break;
        }

        // Corporate Event Alerts: EARNINGS, DIVIDEND, AGM
        // Target value specifies notice window in days: 1, 3, or 7 days before event date
        case 'EARNINGS':
        case 'DIVIDEND':
        case 'AGM': {
          const matchTypes =
            alert.alertType === 'DIVIDEND'
              ? ['DIVIDEND', 'EX_DIVIDEND']
              : [alert.alertType];

          if (alert.alertType === 'EARNINGS') feedEventType = EventType.EARNINGS_BEAT;
          else if (alert.alertType === 'DIVIDEND') feedEventType = EventType.DIVIDEND_ANNOUNCED;
          else feedEventType = EventType.MANAGEMENT_CHANGE;

          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);

          const corpEvent = await prisma.corporateEvent.findFirst({
            where: {
              stockSymbol: alert.stockSymbol,
              eventType: { in: matchTypes as any },
              eventDate: { gte: startOfToday },
            },
            orderBy: { eventDate: 'asc' },
          });

          if (corpEvent) {
            const diffMs = corpEvent.eventDate.getTime() - Date.now();
            const daysAway = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

            if (daysAway <= targetVal) {
              isTriggered = true;
              crossingTimestamp = now;
              const dateStr = corpEvent.eventDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              title = `${alert.stockSymbol} ${alert.alertType} event in ${daysAway} day${daysAway === 1 ? '' : 's'} (${dateStr})`;
              message = `${stock.companyName} has an upcoming corporate event "${corpEvent.title}" on ${dateStr} (in ${daysAway} day${daysAway === 1 ? '' : 's'}).`;
            }
          }
          break;
        }
      }

      if (isTriggered) {
        // Idempotent crossing creation: Check if an Attention Feed Event already exists for this alert crossing
        const existingFeedEvent = await prisma.event.findFirst({
          where: {
            stockSymbol: alert.stockSymbol,
            metricsDelta: {
              path: ['alertId'],
              equals: alert.id,
            },
          },
        });

        await prisma.$transaction(async (tx) => {
          // 1. Deactivate alert and record trigger timestamp
          await tx.alert.update({
            where: { id: alert.id },
            data: {
              isActive: false,
              triggeredAt: crossingTimestamp,
            },
          });

          // 2. Create user notification
          await tx.notification.create({
            data: {
              userId: alert.userId,
              alertId: alert.id,
              type: 'ALERT_TRIGGERED',
              title,
              message,
              createdAt: crossingTimestamp,
            },
          });

          // 3. Create Attention Feed Event if not already recorded (idempotent)
          if (!existingFeedEvent) {
            const feedEvent = await tx.event.create({
              data: {
                stockSymbol: alert.stockSymbol,
                eventType: feedEventType,
                priority: Priority.HIGH,
                timestamp: crossingTimestamp,
                metricsDelta: {
                  alertId: alert.id,
                  alertType: alert.alertType,
                  targetValue: targetVal,
                  crossingPrice: currentPrice,
                  crossingDate: crossingTimestamp.toISOString(),
                  attentionScore: 75,
                  detectionReason: message,
                  explanation: `${stock.companyName} triggered user alert: ${title}`,
                  price: currentPrice,
                  changePercent: changePct,
                  enrichment: {
                    whatHappened: title,
                    whyItHappened: message,
                    whyItMatters: `Custom watchlist alert triggered: ${title}`,
                    sources: [
                      {
                        title: 'Watchlist Alert Monitor',
                        url: `https://www.nseindia.com/get-quotes/equity?symbol=${alert.stockSymbol}`,
                        publisher: 'Market Alert Engine',
                        publishedAt: crossingTimestamp.toISOString(),
                        confidence: 0.95,
                      },
                    ],
                    confidenceScore: 0.95,
                  },
                },
              },
            });

            await tx.insight.create({
              data: {
                relatedEventId: feedEvent.id,
                stockSymbol: alert.stockSymbol,
                headline: title,
                possibleExplanation: message,
                whyItMatters: `Custom watchlist alert triggered: ${title}`,
                confidenceScore: new Prisma.Decimal(0.95),
                sources: ['Watchlist Alert Monitor'],
              },
            });
          }
        });

        triggeredCount++;
      }
    }

    return triggeredCount;
  }
}

export const alertService = new AlertService();
