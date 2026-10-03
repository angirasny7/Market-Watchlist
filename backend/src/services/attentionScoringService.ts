import { Priority, EventType } from '@prisma/client';

export interface AttentionScoreResult {
  score: number;
  priority: Priority;
  explanation: string;
}

export class AttentionScoringService {
  /**
   * Computes magnitude-driven attention score (0 - 100) and priority classification.
   * 
   * Criteria:
   * - CRITICAL (Urgent, Score >= 85): Rare, extreme market conditions (e.g. >= 10% move with >= 2x volume, >= 15% move, or 52W extreme with major volume).
   * - HIGH (Important, Score 65 - 84): Substantial market moves (e.g. >= 12% price move with normal volume, >= 5% move with elevated volume, 52W breakout).
   * - MEDIUM (Worth a look, Score 40 - 64): Moderate anomaly (3% - 5% move, 1.5x volume, corporate action).
   * - LOW (FYI, Score < 40): Standard baseline market movements.
   * 
   * Note: Verified sources only raise causal CONFIDENCE (0 - 100%), not technical magnitude priority.
   */
  public calculateScore(params: {
    changePercent: number;
    volume: number;
    avgVolume20D: number;
    eventType: EventType;
    eventTimestamp?: Date;
  }): AttentionScoreResult {
    const { changePercent, volume, avgVolume20D, eventType, eventTimestamp } = params;

    const absChange = Math.abs(changePercent);
    const effectiveAvgVolume = avgVolume20D > 0 ? avgVolume20D : Math.max(1, volume);
    const volumeRatio = volume / effectiveAvgVolume;

    // 1. Price movement magnitude factor (0 - 45 points)
    let priceScore = 0;
    if (absChange >= 15.0) {
      priceScore = 45;
    } else if (absChange >= 10.0) {
      priceScore = 36;
    } else if (absChange >= 6.0) {
      priceScore = 26;
    } else if (absChange >= 4.0) {
      priceScore = 18;
    } else if (absChange >= 2.0) {
      priceScore = 10;
    } else {
      priceScore = Math.max(0, Math.round(absChange * 4));
    }

    // 2. Volume anomaly & rarity factor (0 - 30 points)
    let volumeScore = 0;
    if (volumeRatio >= 4.0) {
      volumeScore = 30;
    } else if (volumeRatio >= 2.5) {
      volumeScore = 24;
    } else if (volumeRatio >= 2.0) {
      volumeScore = 20;
    } else if (volumeRatio >= 1.5) {
      volumeScore = 14;
    } else if (volumeRatio >= 1.2) {
      volumeScore = 8;
    } else {
      volumeScore = 2;
    }

    // 3. Technical anomaly / event type rarity (5 - 20 points)
    let catalystScore = 5;
    let catalystDescription = 'Statistical price move';

    switch (eventType) {
      case 'FIFTY_TWO_WEEK_HIGH':
      case 'FIFTY_TWO_WEEK_LOW':
        catalystScore = 20;
        catalystDescription = '52-Week boundary breakout';
        break;
      case 'EARNINGS_BEAT':
      case 'EARNINGS_MISS':
        catalystScore = 18;
        catalystDescription = 'Earnings catalyst';
        break;
      case 'PRICE_SURGE':
      case 'PRICE_DROP':
        catalystScore = 15;
        catalystDescription = 'Directional price movement';
        break;
      case 'VOLUME_SPIKE':
        catalystScore = 15;
        catalystDescription = 'Abnormal institutional volume liquidity';
        break;
      case 'DIVIDEND_ANNOUNCED':
      case 'ANALYST_UPGRADE':
        catalystScore = 10;
        catalystDescription = 'Corporate capital / analyst action';
        break;
      case 'MANAGEMENT_CHANGE':
        catalystScore = 10;
        catalystDescription = 'Leadership change';
        break;
      default:
        catalystScore = 5;
        break;
    }

    // 4. Recency decay factor (0 - 10 points)
    const now = Date.now();
    const eventTime = eventTimestamp ? new Date(eventTimestamp).getTime() : now;
    const hoursElapsed = Math.max(0, (now - eventTime) / (1000 * 60 * 60));
    let recencyScore = 0;
    if (hoursElapsed <= 2) {
      recencyScore = 10;
    } else if (hoursElapsed <= 6) {
      recencyScore = 6;
    } else if (hoursElapsed <= 24) {
      recencyScore = 3;
    } else {
      recencyScore = 0;
    }

    // Composite Raw Score
    let rawScore = priceScore + volumeScore + catalystScore + recencyScore;

    // Hard Rule Guarantees driven purely by magnitude & rarity:
    // - Extreme move: >= 10% move with >= 2x volume or >= 15% move is guaranteed CRITICAL (>= 85)
    if ((absChange >= 10.0 && volumeRatio >= 2.0) || absChange >= 15.0) {
      rawScore = Math.max(rawScore, 88);
    }
    // - Important move: >= 12% move (even with 1x volume) or >= 6% move with elevated volume is guaranteed HIGH (>= 65)
    else if (absChange >= 12.0 || (absChange >= 6.0 && volumeRatio >= 1.5)) {
      rawScore = Math.max(rawScore, 72);
    }

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
