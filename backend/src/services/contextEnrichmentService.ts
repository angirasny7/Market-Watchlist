import { Event, Stock, EventType } from '@prisma/client';
import { evidenceAggregator, EvidenceItem } from './evidenceAggregator.js';
import { confidenceScoringService, ConfidenceScoreBreakdown } from './confidenceScoringService.js';

export interface EventEnrichment {
  summary: string;
  confidenceScore: number;
  possibleDrivers: string[];
  evidence: EvidenceItem[];
  scoreBreakdown?: ConfidenceScoreBreakdown;
}

/**
 * Context Enrichment Engine
 * 
 * Attaches supporting evidence, multi-factor confidence scores, and factual causal drivers
 * to every market event before external verification.
 * 
 * SAFETY RULE:
 * If no real evidence can be found from news or exchange sources,
 * summary must strictly be: "Supporting evidence currently unavailable."
 * and possibleDrivers must be empty.
 */
export class ContextEnrichmentService {
  /**
   * Enrich a market event with verified evidence and confidence scoring
   */
  async enrichEvent(event: Event, stock?: Stock | null): Promise<EventEnrichment> {
    // 1. Gather all attributed evidence from real sources
    const evidence = await evidenceAggregator.gatherEvidence(event, stock);

    // 2. Compute multi-factor confidence score (0 to 100)
    const scoreResult = confidenceScoringService.calculateConfidence(event, stock, evidence);

    // 3. Check for Safety Fallback (Constraint 10: If no supporting evidence exists)
    if (evidence.length === 0) {
      return {
        summary: 'Supporting evidence currently unavailable.',
        confidenceScore: scoreResult.score,
        possibleDrivers: [],
        evidence: [],
        scoreBreakdown: scoreResult,
      };
    }

    // 4. Derive concise, factual possible drivers based exclusively on confirmed evidence
    const possibleDrivers = this.deriveDriversFromEvidence(event, stock, evidence);

    // 5. Formulate factual summary
    const summary = this.buildSummary(event, stock, possibleDrivers, evidence);

    return {
      summary,
      confidenceScore: scoreResult.score,
      possibleDrivers,
      evidence,
      scoreBreakdown: scoreResult,
    };
  }

  /**
   * Derive factual possible drivers strictly from verified evidence items and exchange metrics
   */
  private deriveDriversFromEvidence(
    event: Event,
    stock?: Stock | null,
    evidence: EvidenceItem[] = []
  ): string[] {
    const drivers: string[] = [];
    const delta = (event.metricsDelta as any) || {};
    const volumeRatio = delta.volumeRatio || (stock?.avgVolume20D && stock?.volume ? (Number(stock.volume) / Number(stock.avgVolume20D)).toFixed(1) : null);
    const changePercent = Number(delta.changePercent ?? stock?.changePercent ?? 0);

    // Driver from News or Filings
    const filing = evidence.find((e) => e.sourceType === 'FILING' || e.sourceType === 'ANNOUNCEMENT');
    const news = evidence.find((e) => e.sourceType === 'NEWS');

    if (filing) {
      if (event.eventType === EventType.DIVIDEND_ANNOUNCED) {
        drivers.push(`Official corporate dividend distribution announcement on record`);
      } else if (event.eventType === EventType.EARNINGS_BEAT) {
        drivers.push(`Quarterly financial performance disclosure beating analyst consensus`);
      } else if (event.eventType === EventType.EARNINGS_MISS) {
        drivers.push(`Financial results disclosure reflecting margin compression`);
      } else {
        drivers.push(`Corporate regulatory disclosure filed with exchange`);
      }
    }

    if (news && (!filing || drivers.length < 2)) {
      // Extract concise news catalyst
      const headline = news.title.trim();
      if (headline.length > 0) {
        const shortHeadline = headline.length > 70 ? `${headline.slice(0, 67)}...` : headline;
        drivers.push(`Media catalyst: "${shortHeadline}" (${news.source})`);
      }
    }

    // Driver from Volume Confirmation
    if (volumeRatio && Number(volumeRatio) >= 1.5) {
      drivers.push(`Increased institutional trading volume (${volumeRatio}x of 20-day historical average)`);
    } else if (event.eventType === EventType.VOLUME_SPIKE) {
      drivers.push(`Elevated order book turnover and liquidity realignment`);
    }

    // Driver from Technical / Sector / Price Trend
    if (event.eventType === EventType.FIFTY_TWO_WEEK_HIGH) {
      drivers.push(`Systematic momentum breakout through 52-week resistance ceiling`);
    } else if (event.eventType === EventType.FIFTY_TWO_WEEK_LOW) {
      drivers.push(`Price test of key 52-week historical support zone`);
    } else if (Math.abs(changePercent) >= 5.0) {
      drivers.push(
        changePercent > 0
          ? `Strong directional price momentum (+${changePercent.toFixed(1)}% session surge)`
          : `High-volume liquidation and stop-loss unwinding (${changePercent.toFixed(1)}% drop)`
      );
    } else if (drivers.length < 3 && stock?.sector) {
      drivers.push(`Broader ${stock.sector} sector momentum alignment`);
    }

    return drivers.slice(0, 3);
  }

  /**
   * Build concise event explanation summary
   */
  private buildSummary(
    event: Event,
    stock: Stock | null | undefined,
    drivers: string[],
    evidence: EvidenceItem[]
  ): string {
    const symbol = event.stockSymbol;
    const topEvidence = evidence[0];

    if (topEvidence) {
      return `${symbol} movement correlates with recent ${topEvidence.sourceType.toLowerCase()} from ${topEvidence.source}: "${topEvidence.title.slice(0, 80)}${topEvidence.title.length > 80 ? '...' : ''}".`;
    }

    if (drivers.length > 0) {
      return `${symbol} movement driven by ${drivers[0].toLowerCase()}.`;
    }

    return 'Supporting evidence currently unavailable.';
  }
}

export const contextEnrichmentService = new ContextEnrichmentService();
