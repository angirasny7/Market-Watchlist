import { AlertType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

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
   * Evaluates active alerts against current stock quotes and recent unread event attention scores.
   * When triggered: sets alert.isActive = false, alert.triggeredAt = now, creates Notification.
   */
  async evaluateAlerts(symbols?: string[]): Promise<number> {
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

      const currentPrice = Number(stock.currentPrice);
      const changePct = Number(stock.changePercent);
      const targetVal = Number(alert.targetValue);
      const currency = stock.currency || '₹';

      let isTriggered = false;
      let title = '';
      let message = '';

      switch (alert.alertType) {
        case 'PRICE_ABOVE':
          if (currentPrice >= targetVal) {
            isTriggered = true;
            title = `${alert.stockSymbol} reached ${currency}${targetVal.toFixed(2)}`;
            message = `${stock.companyName} is trading at ${currency}${currentPrice.toFixed(2)}, crossing above your target price.`;
          }
          break;

        case 'PRICE_BELOW':
          if (currentPrice <= targetVal) {
            isTriggered = true;
            title = `${alert.stockSymbol} fell to ${currency}${targetVal.toFixed(2)}`;
            message = `${stock.companyName} dropped to ${currency}${currentPrice.toFixed(2)}, reaching or falling below your target price.`;
          }
          break;

        case 'DAY_CHANGE_PCT':
          if (Math.abs(changePct) >= Math.abs(targetVal)) {
            isTriggered = true;
            const sign = changePct >= 0 ? '+' : '';
            title = `${alert.stockSymbol} moved ${sign}${changePct.toFixed(2)}% today`;
            message = `${stock.companyName} day change reached ${sign}${changePct.toFixed(2)}%, exceeding your threshold of ${targetVal}%.`;
          }
          break;

        case 'ATTENTION_LEVEL': {
          const unreadEvents = await prisma.event.findMany({
            where: {
              stockSymbol: alert.stockSymbol,
              userReads: { none: { userId: alert.userId } },
            },
            select: { priority: true, metricsDelta: true },
          });

          let maxScore = 0;
          for (const ev of unreadEvents) {
            const delta = (ev.metricsDelta as any) || {};
            let score = typeof delta.attentionScore === 'number' ? delta.attentionScore : 0;
            if (!score) {
              if (ev.priority === 'CRITICAL') score = 80;
              else if (ev.priority === 'HIGH') score = 65;
              else if (ev.priority === 'MEDIUM') score = 45;
              else score = 20;
            }
            if (score > maxScore) maxScore = score;
          }

          if (maxScore >= targetVal) {
            isTriggered = true;
            title = `${alert.stockSymbol} attention score spike (${maxScore})`;
            message = `High market attention detected for ${stock.companyName} with attention score ${maxScore} (threshold ${targetVal}).`;
          }
          break;
        }
      }

      if (isTriggered) {
        await prisma.$transaction([
          prisma.alert.update({
            where: { id: alert.id },
            data: {
              isActive: false,
              triggeredAt: now,
            },
          }),
          prisma.notification.create({
            data: {
              userId: alert.userId,
              alertId: alert.id,
              type: 'ALERT_TRIGGERED',
              title,
              message,
              createdAt: now,
            },
          }),
        ]);
        triggeredCount++;
      }
    }

    return triggeredCount;
  }
}

export const alertService = new AlertService();
