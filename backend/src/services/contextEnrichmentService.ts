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
 * Attaches verified supporting evidence and factual causal drivers to market events.
 * 
 * STRICT RULES:
 * 1. The words "Confirmed" or a named publisher may appear ONLY if backed by a real stored news/filing record with url, publisher, and date.
 * 2. If no real evidence exists, summary must strictly state: "No confirmed cause found" describing only measurable price and volume data.
 * 3. Confidence must reflect real evidence (no evidence = Low, score <= 25).
 */
export class ContextEnrichmentService {
  async enrichEvent(event: Event, stock?: Stock | null): Promise<EventEnrichment> {
    const delta = (event.metricsDelta as any) || {};
    const changePercent = Number(delta.changePercent ?? stock?.changePercent ?? 0);
    const volumeRatio = delta.volumeRatio || (stock?.avgVolume20D && stock?.volume ? (Number(stock.volume) / Number(stock.avgVolume20D)).toFixed(1) : '1.0');
    const dir = changePercent >= 0 ? '+' : '';

    // 1. Gather real attributed evidence strictly from database
    const evidence = await evidenceAggregator.gatherEvidence(event, stock);

    // 2. Compute multi-factor confidence score (0 to 100)
    const scoreResult = confidenceScoringService.calculateConfidence(event, stock, evidence);

    // 3. Fallback when no real evidence exists: No fabricated drivers or fake publishers
    if (evidence.length === 0) {
      return {
        summary: `No confirmed cause found. Recorded ${dir}${changePercent.toFixed(1)}% price move with ${volumeRatio}x 20-day average volume.`,
        confidenceScore: Math.min(25, scoreResult.score),
        possibleDrivers: [],
        evidence: [],
        scoreBreakdown: scoreResult,
      };
    }

    // 4. Derive factual drivers backed strictly by verified news/filings
    const possibleDrivers = this.deriveDriversFromEvidence(event, stock, evidence);

    // 5. Formulate factual summary referencing verified sources
    const summary = this.buildSummary(event, stock, possibleDrivers, evidence);

    return {
      summary,
      confidenceScore: scoreResult.score,
      possibleDrivers,
      evidence,
      scoreBreakdown: scoreResult,
    };
  }

  private deriveDriversFromEvidence(
    event: Event,
    stock?: Stock | null,
    evidence: EvidenceItem[] = []
  ): string[] {
    const drivers: string[] = [];

    const filing = evidence.find((e) => e.sourceType === 'FILING' || e.sourceType === 'ANNOUNCEMENT');
    const news = evidence.find((e) => e.sourceType === 'NEWS');

    if (filing) {
      drivers.push(`Official corporate disclosure on record: "${filing.title}"`);
    }

    if (news) {
      const headline = news.title.trim();
      const shortHeadline = headline.length > 80 ? `${headline.slice(0, 77)}...` : headline;
      drivers.push(`Reported media catalyst: "${shortHeadline}" (${news.source})`);
    }

    return drivers;
  }

  private buildSummary(
    event: Event,
    stock: Stock | null | undefined,
    drivers: string[],
    evidence: EvidenceItem[]
  ): string {
    const symbol = event.stockSymbol;
    const topEvidence = evidence[0];

    if (topEvidence) {
      return `${symbol} movement correlates with reported ${topEvidence.sourceType.toLowerCase()} from ${topEvidence.source}: "${topEvidence.title.slice(0, 90)}${topEvidence.title.length > 90 ? '...' : ''}".`;
    }

    return drivers[0] || 'No confirmed cause found.';
  }
}

export const contextEnrichmentService = new ContextEnrichmentService();
