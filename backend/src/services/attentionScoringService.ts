import { Priority, EventType } from '@prisma/client';

export interface AttentionScoreResult {
  score: number;
  priority: Priority;
  explanation: string;
}

export class AttentionScoringService {
  /**
   * Computes dynamic attention score (0 - 100) and priority classification
   * based on price magnitude, volume anomaly ratio, catalyst type, and recency.
   */
  public calculateScore(params: {
    changePercent: number;
    volume: number;
    avgVolume20D: number;
    eventType: EventType;
    eventTimestamp?: Date;
  }): AttentionScoreResult {
    const { changePercent, volume, avgVolume20D, eventType, eventTimestamp } = params;

    // 1. Price movement factor (0 - 40 points)
    const absChange = Math.abs(changePercent);
    const priceScore = Math.min(40, parseFloat((absChange * 4).toFixed(1)));

    // 2. Volume anomaly factor (0 - 30 points)
    const effectiveAvgVolume = avgVolume20D > 0 ? avgVolume20D : Math.max(1, volume);
    const volumeRatio = volume / effectiveAvgVolume;
    const volumeScore = Math.min(30, parseFloat((volumeRatio * 15).toFixed(1)));

    // 3. Catalyst bonus (10 - 25 points)
    let catalystScore = 10;
    let catalystDescription = 'Standard market anomaly';

    switch (eventType) {
      case 'EARNINGS_BEAT':
      case 'EARNINGS_MISS':
        catalystScore = 25;
        catalystDescription = 'Quarterly earnings catalyst';
        break;
      case 'FIFTY_TWO_WEEK_HIGH':
      case 'FIFTY_TWO_WEEK_LOW':
        catalystScore = 22;
        catalystDescription = '52-Week boundary breakout';
        break;
      case 'PRICE_SURGE':
      case 'PRICE_DROP':
        catalystScore = 20;
        catalystDescription = 'Extreme directional price expansion';
        break;
      case 'VOLUME_SPIKE':
        catalystScore = 18;
        catalystDescription = 'Abnormal institutional volume liquidity';
        break;
      case 'DIVIDEND_ANNOUNCED':
      case 'ANALYST_UPGRADE':
        catalystScore = 15;
        catalystDescription = 'Corporate action / analyst guidance change';
        break;
      case 'MANAGEMENT_CHANGE':
        catalystScore = 15;
        catalystDescription = 'Key executive leadership change';
        break;
      default:
        catalystScore = 10;
        break;
    }

    // 4. Recency bonus (0 - 10 points)
    const now = Date.now();
    const eventTime = eventTimestamp ? new Date(eventTimestamp).getTime() : now;
    const hoursElapsed = Math.max(0, (now - eventTime) / (1000 * 60 * 60));
    const recencyScore = Math.max(0, Math.min(10, parseFloat((10 - hoursElapsed * 2.5).toFixed(1))));

    // Composite 0 - 100
    const rawScore = priceScore + volumeScore + catalystScore + recencyScore;
    const finalScore = Math.min(100, Math.max(5, Math.round(rawScore)));

    // Priority classification
    let priority: Priority = Priority.LOW;
    if (finalScore >= 75) {
      priority = Priority.CRITICAL;
    } else if (finalScore >= 55) {
      priority = Priority.HIGH;
    } else if (finalScore >= 35) {
      priority = Priority.MEDIUM;
    } else {
      priority = Priority.LOW;
    }

    const direction = changePercent >= 0 ? '+' : '';
    const explanation = `${direction}${changePercent.toFixed(1)}% price move with ${volumeRatio.toFixed(1)}x avg volume. ${catalystDescription} (Attention Score: ${finalScore}/100).`;

    return {
      score: finalScore,
      priority,
      explanation,
    };
  }
}

export const attentionScoringService = new AttentionScoringService();
