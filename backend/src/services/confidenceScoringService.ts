import { Event, Stock } from '@prisma/client';
import { EvidenceItem } from './evidenceAggregator.js';

export interface ConfidenceScoreBreakdown {
  score: number; // 0 to 100
  factors: {
    newsSupportScore: number;       // 0 to 25
    filingsSupportScore: number;    // 0 to 30
    volumeConfirmationScore: number;// 0 to 20
    priceMagnitudeScore: number;    // 0 to 15
    multiSourceScore: number;       // 0 to 10
  };
}

/**
 * Confidence Scoring Engine
 * 
 * Computes deterministic 0-100 confidence scores based on:
 * 1. Presence of supporting news
 * 2. Presence of official filings / exchange announcements
 * 3. Volume confirmation
 * 4. Price movement magnitude
 * 5. Multiple independent sources
 */
export class ConfidenceScoringService {
  calculateConfidence(
    event: Event,
    stock?: Stock | null,
    evidence: EvidenceItem[] = []
  ): ConfidenceScoreBreakdown {
    const delta = (event.metricsDelta as any) || {};
    const changePercent = Math.abs(Number(delta.changePercent ?? stock?.changePercent ?? 0));
    const volume = Number(delta.volume ?? stock?.volume ?? 0);
    const avgVolume20D = Number(delta.avgVolume20D ?? stock?.avgVolume20D ?? 0);
    const volumeRatio = delta.volumeRatio ?? (avgVolume20D > 0 ? volume / avgVolume20D : 1.0);

    // 1. Presence of supporting news (0 to 25 pts)
    const newsItems = evidence.filter((e) => e.sourceType === 'NEWS');
    let newsSupportScore = 0;
    if (newsItems.length >= 2) {
      newsSupportScore = 25;
    } else if (newsItems.length === 1) {
      newsSupportScore = 20;
    }

    // 2. Presence of official filings / exchange announcements (0 to 30 pts)
    const filingItems = evidence.filter((e) => e.sourceType === 'FILING' || e.sourceType === 'ANNOUNCEMENT');
    let filingsSupportScore = 0;
    const hasOfficialFiling = filingItems.some((f) => f.sourceType === 'FILING');
    const hasAnnouncement = filingItems.some((f) => f.sourceType === 'ANNOUNCEMENT');

    if (hasOfficialFiling && hasAnnouncement) {
      filingsSupportScore = 30;
    } else if (hasOfficialFiling) {
      filingsSupportScore = 26;
    } else if (hasAnnouncement) {
      filingsSupportScore = 20;
    }

    // 3. Volume confirmation (0 to 20 pts)
    let volumeConfirmationScore = 0;
    if (volumeRatio >= 2.5) {
      volumeConfirmationScore = 20;
    } else if (volumeRatio >= 2.0) {
      volumeConfirmationScore = 18;
    } else if (volumeRatio >= 1.5) {
      volumeConfirmationScore = 14;
    } else if (volumeRatio >= 1.2) {
      volumeConfirmationScore = 8;
    } else {
      volumeConfirmationScore = 3;
    }

    // 4. Price movement magnitude (0 to 15 pts)
    let priceMagnitudeScore = 0;
    if (changePercent >= 5.0) {
      priceMagnitudeScore = 15;
    } else if (changePercent >= 3.0) {
      priceMagnitudeScore = 12;
    } else if (changePercent >= 1.5) {
      priceMagnitudeScore = 8;
    } else {
      priceMagnitudeScore = 4;
    }

    // 5. Multiple independent sources (0 to 10 pts)
    const distinctSources = new Set(evidence.map((e) => e.source));
    let multiSourceScore = 0;
    if (distinctSources.size >= 3) {
      multiSourceScore = 10;
    } else if (distinctSources.size === 2) {
      multiSourceScore = 7;
    } else if (distinctSources.size === 1) {
      multiSourceScore = 3;
    }

    // If zero evidence exists at all, apply significant penalty
    let rawScore = newsSupportScore + filingsSupportScore + volumeConfirmationScore + priceMagnitudeScore + multiSourceScore;

    if (evidence.length === 0) {
      // Base confidence strictly reflects market metrics alone, without external catalyst confirmation
      rawScore = Math.min(28, Math.round(volumeConfirmationScore + priceMagnitudeScore));
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    return {
      score: finalScore,
      factors: {
        newsSupportScore,
        filingsSupportScore,
        volumeConfirmationScore,
        priceMagnitudeScore,
        multiSourceScore,
      },
    };
  }
}

export const confidenceScoringService = new ConfidenceScoringService();
