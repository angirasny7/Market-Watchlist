import { EventType, Priority } from '@prisma/client';
import { SourceTrustTier, sourceRegistry } from './sourceRegistry.js';

export interface ScoreCalculationInput {
  eventType: EventType;
  changePercent: number;
  volumeRatio?: number;
  sigma60?: number; // 60-session daily standard deviation (e.g. 1.8 for 1.8%)
  trustTier?: SourceTrustTier;
  sourceCount?: number;
  isPinned?: boolean;
  hasActiveAlert?: boolean;
  watchlistCount?: number;
  hoursAgo?: number;
  sourceName?: string;
}

export interface ScoreCalculationResult {
  score: number; // 0 - 100
  tier: 'MAIN' | 'MINOR' | 'HIDDEN'; // >= 40: MAIN, 20-39: MINOR, < 20: HIDDEN
  priority: Priority;
  priorityLabel: 'Urgent' | 'Important' | 'Worth a look' | 'FYI';
  whyShown: string;
  sigmaMultiplier: number;
}

export class MeaningfulnessScoreService {
  /**
   * Calculates 0-100 meaningfulness score based on volatility-relative moves,
   * catalyst type, trust tier, multi-source corroboration, and user context.
   */
  public calculateScore(input: ScoreCalculationInput): ScoreCalculationResult {
    let baseScore = 0;
    const whyComponents: string[] = [];

    // 1. Event type baseline weight
    const typeWeights: Record<EventType, number> = {
      EARNINGS_BEAT: 40,
      EARNINGS_MISS: 40,
      MANAGEMENT_CHANGE: 35,
      DIVIDEND_ANNOUNCED: 30,
      ANALYST_UPGRADE: 25,
      FIFTY_TWO_WEEK_HIGH: 25,
      FIFTY_TWO_WEEK_LOW: 25,
      FILING: 30,
      PRICE_SURGE: 20,
      PRICE_DROP: 20,
      VOLUME_SPIKE: 15,
      NEWS: 15,
      CUMULATIVE_MOVE: 25,
    };
    baseScore += typeWeights[input.eventType] || 15;

    // 2. Volatility-relative move magnitude (|return| / sigma_60)
    const effectiveSigma = input.sigma60 && input.sigma60 > 0 ? input.sigma60 : 1.8;
    const absMove = Math.abs(input.changePercent || 0);
    const sigmaMultiplier = parseFloat((absMove / effectiveSigma).toFixed(1));

    if (sigmaMultiplier >= 4.0) {
      baseScore += 35;
      whyComponents.push(`${sigmaMultiplier}σ move`);
    } else if (sigmaMultiplier >= 3.0) {
      baseScore += 25;
      whyComponents.push(`${sigmaMultiplier}σ move`);
    } else if (sigmaMultiplier >= 2.0) {
      baseScore += 15;
      whyComponents.push(`${sigmaMultiplier}σ move`);
    } else if (sigmaMultiplier >= 1.2) {
      baseScore += 5;
    }

    // 3. Volume ratio vs 20-day historical average
    const volRatio = input.volumeRatio || 1.0;
    if (volRatio >= 3.0) {
      baseScore += 20;
      whyComponents.push(`${volRatio.toFixed(1)}x volume`);
    } else if (volRatio >= 2.0) {
      baseScore += 12;
      whyComponents.push(`${volRatio.toFixed(1)}x volume`);
    } else if (volRatio >= 1.5) {
      baseScore += 6;
    }

    // 4. Source Trust Tier & Multi-Source Corroboration
    const tier = input.trustTier || 'MAJOR_PUBLISHER';
    let tierMultiplier = 1.0;
    if (tier === 'OFFICIAL_EXCHANGE') {
      tierMultiplier = 1.0;
      whyComponents.push('Official filing');
    } else if (tier === 'MAJOR_PUBLISHER') {
      tierMultiplier = 0.9;
    } else {
      tierMultiplier = 0.75;
    }

    let corroborationBonus = 0;
    const sourcesCount = input.sourceCount || 1;
    if (sourcesCount >= 3) {
      corroborationBonus = 20;
      whyComponents.push(`${sourcesCount} sources`);
    } else if (sourcesCount >= 2) {
      corroborationBonus = 10;
      whyComponents.push('2 sources');
    }

    // 5. User Context
    let userContextBonus = 0;
    if (input.isPinned) {
      userContextBonus += 10;
      whyComponents.push('pinned');
    }
    if (input.hasActiveAlert) {
      userContextBonus += 15;
      whyComponents.push('active alert');
    }
    if (input.watchlistCount && input.watchlistCount > 1) {
      userContextBonus += 5;
    }

    // 6. Recency Decay (minor reduction for items older than 24h)
    let recencyFactor = 1.0;
    if (input.hoursAgo && input.hoursAgo > 24) {
      const days = input.hoursAgo / 24;
      recencyFactor = Math.max(0.7, 1.0 - (days - 1) * 0.05);
    }

    // Final combined score
    const rawScore = (baseScore * tierMultiplier + corroborationBonus + userContextBonus) * recencyFactor;
    const score = Math.min(100, Math.max(0, Math.round(rawScore)));

    // Categorization
    let feedTier: 'MAIN' | 'MINOR' | 'HIDDEN' = 'HIDDEN';
    if (score >= 40) {
      feedTier = 'MAIN';
    } else if (score >= 20) {
      feedTier = 'MINOR';
    } else {
      feedTier = 'HIDDEN';
    }

    // Priority mapping
    let priority: Priority = 'LOW';
    let priorityLabel: 'Urgent' | 'Important' | 'Worth a look' | 'FYI' = 'FYI';

    if (score >= 75) {
      priority = 'CRITICAL';
      priorityLabel = 'Urgent';
    } else if (score >= 55) {
      priority = 'HIGH';
      priorityLabel = 'Important';
    } else if (score >= 35) {
      priority = 'MEDIUM';
      priorityLabel = 'Worth a look';
    } else {
      priority = 'LOW';
      priorityLabel = 'FYI';
    }

    const whyShown = whyComponents.length > 0 ? whyComponents.join(' · ') : `${input.eventType.replace(/_/g, ' ')}`;

    return {
      score,
      tier: feedTier,
      priority,
      priorityLabel,
      whyShown,
      sigmaMultiplier,
    };
  }
}

export const meaningfulnessScoreService = new MeaningfulnessScoreService();
