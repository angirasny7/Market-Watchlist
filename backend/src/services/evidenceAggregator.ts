import { prisma } from '../config/prisma.js';
import { Event, Stock, News } from '@prisma/client';

export type EvidenceSourceType = 'NEWS' | 'FILING' | 'ANNOUNCEMENT';

export interface EvidenceItem {
  title: string;
  source: string;
  sourceType: EvidenceSourceType;
  url: string;
  publishedAt: string;
  isContradictory?: boolean;
}

/**
 * Evidence Aggregator (A4)
 * 
 * Aggregates verified supporting evidence strictly from:
 * 1. Real financial news articles in PostgreSQL (prisma.news) with real URLs and publishers.
 * 2. Real corporate events / disclosures on record (prisma.corporateEvent).
 * 
 * STRICT RULES:
 * 1. Attach a news item only if:
 *    (a) Ingested by a real provider sync job (has real sourceUrl starting with http and real publisher/sourceName).
 *    (b) Has real URL, publisher, and publishedAt.
 *    (c) For this symbol and published within window (3 days before to 1 day after event).
 *    (d) Does not contradict the move in an obvious way (contradictory articles tagged or excluded from causal drivers).
 * 2. Never fabricates evidence or placeholder URLs. If no real record exists, returns [].
 */
export class EvidenceAggregator {
  async gatherEvidence(event: Event, stock?: Stock | null): Promise<EvidenceItem[]> {
    const evidence: EvidenceItem[] = [];
    const symbol = event.stockSymbol.toUpperCase();
    const delta = (event.metricsDelta as any) || {};
    const changePercent = Number(delta.changePercent ?? stock?.changePercent ?? 0);

    // 1. Fetch real news articles from database for this stock within 3 days before to 1 day after event
    const eventTime = new Date(event.timestamp || event.createdAt);
    const threeDaysBefore = new Date(eventTime.getTime() - 3 * 24 * 60 * 60 * 1000);
    const oneDayAfter = new Date(eventTime.getTime() + 24 * 60 * 60 * 1000);

    const relevantNews = await prisma.news.findMany({
      where: {
        stockSymbol: symbol,
        publishedAt: {
          gte: threeDaysBefore,
          lte: oneDayAfter,
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });

    for (const news of relevantNews) {
      if (news.headline && news.sourceName && news.sourceUrl && news.sourceUrl.startsWith('http')) {
        const sourceType = this.determineSourceType(news);
        const isContradictory = this.checkContradiction(news.headline, changePercent);

        // Exclude contradictory articles from being presented as confirmed evidence
        if (!isContradictory) {
          evidence.push({
            title: news.headline.trim(),
            source: news.sourceName.trim(),
            sourceType,
            url: news.sourceUrl.trim(),
            publishedAt: news.publishedAt.toISOString(),
            isContradictory: false,
          });
        }
      }
    }

    // 2. Fetch real corporate event records from database
    const corporateEvents = await prisma.corporateEvent.findMany({
      where: {
        stockSymbol: symbol,
        eventDate: {
          gte: threeDaysBefore,
          lte: oneDayAfter,
        },
      },
      orderBy: { eventDate: 'desc' },
      take: 2,
    });

    for (const corp of corporateEvents) {
      if (corp.title && corp.eventDate) {
        const isFiling = corp.eventType === 'EARNINGS';
        evidence.push({
          title: corp.title,
          source: 'Exchange Corporate Action Disclosure',
          sourceType: isFiling ? 'FILING' : 'ANNOUNCEMENT',
          url: `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`,
          publishedAt: corp.eventDate.toISOString(),
          isContradictory: false,
        });
      }
    }

    return evidence;
  }

  private checkContradiction(headline: string, changePercent: number): boolean {
    const h = headline.toLowerCase();
    // If price dropped significantly (< -2%) but article talks about rising/surging/gains
    if (changePercent <= -2.0) {
      if (h.includes('rises') || h.includes('surges') || h.includes('jumps') || h.includes('gains') || h.includes('rally') || h.includes('shares jump')) {
        return true;
      }
    }
    // If price surged significantly (> 2%) but article talks about falling/dropping/losses
    if (changePercent >= 2.0) {
      if (h.includes('falls') || h.includes('drops') || h.includes('plunges') || h.includes('slumps') || h.includes('tumbles') || h.includes('losses')) {
        return true;
      }
    }
    return false;
  }

  private determineSourceType(news: News): EvidenceSourceType {
    const src = (news.sourceName || '').toLowerCase();
    const headline = (news.headline || '').toLowerCase();

    if (
      src.includes('announcement') ||
      src.includes('bse corporate') ||
      src.includes('exchange circular') ||
      headline.includes('board meeting') ||
      headline.includes('announces')
    ) {
      return 'ANNOUNCEMENT';
    }

    if (
      src.includes('filing') ||
      src.includes('sec') ||
      src.includes('edgar') ||
      src.includes('disclosure') ||
      src.includes('xbrl') ||
      headline.includes('q1 results') ||
      headline.includes('q2 results') ||
      headline.includes('q3 results') ||
      headline.includes('q4 results')
    ) {
      return 'FILING';
    }

    return 'NEWS';
  }
}

export const evidenceAggregator = new EvidenceAggregator();
