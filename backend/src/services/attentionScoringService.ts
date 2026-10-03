import { Priority, EventType } from '@prisma/client';

export interface AttentionScoreResult {
  score: number;
  priority: Priority;
  explanation: string;
}

export class AttentionScoringService {
  /**
   * Computes calibrated, rule-based attention score (0 - 100) and priority classification.
   * 
   * Criteria:
   * - CRITICAL (Urgent, Score >= 85): Rare, verified extreme conditions (>= 12% move, >= 4x volume surge, major earnings shock).
   * - HIGH (Important, Score 65 - 84): Substantial technical breakout, 52W high/low break, or >= 6% move with elevated volume.
   * - MEDIUM (Worth a look, Score 40 - 64): Moderate anomaly (3% - 6% move, 1.5x - 2.5x volume, corporate action).
   * - LOW (FYI, Score < 40): Standard market action, minor dividend notice, or baseline volatility.
   */
  public calculateScore(params: {
    changePercent: number;
    volume: number;
    avgVolume20D: number;
    eventType: EventType;
    eventTimestamp?: Date;
  }): AttentionScoreResult {
    const { changePercent, volume, avgVolume20D, eventType, eventTimestamp } = params;

    // 1. Price movement factor (0 - 35 points)
    const absChange = Math.abs(changePercent);
    let priceScore = 0;
    if (absChange >= 15.0) {
      priceScore = 35;
    } else if (absChange >= 10.0) {
      priceScore = 28;
    } else if (absChange >= 6.0) {
      priceScore = 20;
    } else if (absChange >= 3.0) {
      priceScore = 12;
    } else {
      priceScore = Math.max(0, Math.round(absChange * 3));
    }

    // 2. Volume anomaly factor (0 - 25 points)
    const effectiveAvgVolume = avgVolume20D > 0 ? avgVolume20D : Math.max(1, volume);
    const volumeRatio = volume / effectiveAvgVolume;
    let volumeScore = 0;
    if (volumeRatio >= 4.0) {
      volumeScore = 25;
    } else if (volumeRatio >= 2.5) {
      volumeScore = 18;
    } else if (volumeRatio >= 1.8) {
      volumeScore = 12;
    } else if (volumeRatio >= 1.2) {
      volumeScore = 6;
    } else {
      volumeScore = 2;
    }

    // 3. Catalyst type factor (5 - 25 points)
    let catalystScore = 5;
    let catalystDescription = 'Standard market anomaly';

    switch (eventType) {
      case 'EARNINGS_BEAT':
      case 'EARNINGS_MISS':
        catalystScore = 20;
        catalystDescription = 'Quarterly earnings catalyst';
        break;
      case 'FIFTY_TWO_WEEK_HIGH':
      case 'FIFTY_TWO_WEEK_LOW':
        catalystScore = 15;
        catalystDescription = '52-Week boundary breakout';
        break;
      case 'PRICE_SURGE':
      case 'PRICE_DROP':
        catalystScore = 12;
        catalystDescription = 'Directional price movement';
        break;
      case 'VOLUME_SPIKE':
        catalystScore = 10;
        catalystDescription = 'Abnormal institutional volume liquidity';
        break;
      case 'DIVIDEND_ANNOUNCED':
      case 'ANALYST_UPGRADE':
        catalystScore = 8;
        catalystDescription = 'Corporate action / analyst guidance';
        break;
      case 'MANAGEMENT_CHANGE':
        catalystScore = 8;
        catalystDescription = 'Key executive leadership change';
        break;
      default:
        catalystScore = 5;
        break;
    }

    // 4. Recency decay factor (0 - 15 points)
    const now = Date.now();
    const eventTime = eventTimestamp ? new Date(eventTimestamp).getTime() : now;
    const hoursElapsed = Math.max(0, (now - eventTime) / (1000 * 60 * 60));
    let recencyScore = 0;
    if (hoursElapsed <= 2) {
      recencyScore = 15;
    } else if (hoursElapsed <= 6) {
      recencyScore = 10;
    } else if (hoursElapsed <= 24) {
      recencyScore = 5;
    } else {
      recencyScore = 0;
    }

    // Composite Score: 0 - 100
    const rawScore = priceScore + volumeScore + catalystScore + recencyScore;
    const finalScore = Math.min(100, Math.max(5, Math.round(rawScore)));

    // Calibrated Priority Classification
    let priority: Priority = Priority.LOW;
    if (finalScore >= 85) {
      priority = Priority.CRITICAL;
    } else if (finalScore >= 65) {
      priority = Priority.HIGH;
    } else if (finalScore >= 40) {
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
