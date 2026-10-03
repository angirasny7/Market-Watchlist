import { describe, it, expect } from 'vitest';
import { attentionScoringService } from '../src/services/attentionScoringService';
import { EventType, Priority } from '@prisma/client';

describe('Calibrated Attention Scoring & Priority Distribution (F0.4)', () => {
  it('classifies normal 5% surge as MEDIUM (Worth a look), reserving CRITICAL for extreme anomalies', () => {
    // Normal 5% surge with 2.0x volume
    const normalSurge = attentionScoringService.calculateScore({
      changePercent: 5.0,
      volume: 2000000,
      avgVolume20D: 1000000,
      eventType: EventType.PRICE_SURGE,
      eventTimestamp: new Date(Date.now() - 10 * 3600 * 1000), // 10h ago
    });

    expect(normalSurge.priority).toBe(Priority.MEDIUM);
    expect(normalSurge.score).toBeLessThan(65);

    // Minor dividend announcement
    const minorDividend = attentionScoringService.calculateScore({
      changePercent: 0.8,
      volume: 1000000,
      avgVolume20D: 1000000,
      eventType: EventType.DIVIDEND_ANNOUNCED,
      eventTimestamp: new Date(Date.now() - 30 * 3600 * 1000), // > 24h ago
    });
    expect(minorDividend.priority).toBe(Priority.LOW);
    expect(minorDividend.score).toBeLessThan(40);

    // Extreme breakout: 16% surge with 5.0x volume, fresh
    const extremeSurge = attentionScoringService.calculateScore({
      changePercent: 16.0,
      volume: 5000000,
      avgVolume20D: 1000000,
      eventType: EventType.PRICE_SURGE,
      eventTimestamp: new Date(Date.now() - 30 * 60 * 1000), // 30m ago
    });
    expect(extremeSurge.priority).toBe(Priority.CRITICAL);
    expect(extremeSurge.score).toBeGreaterThanOrEqual(85);
  });
});
