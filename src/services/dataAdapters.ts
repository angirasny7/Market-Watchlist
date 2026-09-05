import { StockQuote } from '../types/stock';
import { MarketEvent, EventPriority, EventImpact, EventType } from '../types/event';
import { Insight, ConfidenceLevel } from '../types/insight';
import { HistoricalDigest, CatalystItem, DigestForwardPerformance } from '../types/digest';

/**
 * Normalizes an ISO date/time string into a human-friendly format like "2 mins ago" or "Today, 2:30 PM"
 */
function formatEventTimestamp(isoString?: string): string {
  if (!isoString) return 'Just now';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (60 * 1000));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} mins ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hrs ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Recent';
  }
}

/**
 * Adapts backend Stock model to frontend StockQuote interface.
 */
export function adaptBackendStockToStockQuote(
  backendStock: any,
  isPinned = false,
  activeEvents: any[] = []
): StockQuote {
  const matchingEvent = activeEvents.find((e) => e.stockSymbol === backendStock.symbol);

  return {
    symbol: backendStock.symbol,
    name: backendStock.companyName || backendStock.symbol,
    currency: backendStock.currency || '₹',
    currentPrice: Number(backendStock.currentPrice) || 0,
    changeAmount: Number(backendStock.changeAmount) || 0,
    changePercent: Number(backendStock.changePercent) || 0,
    dailyChangePercent: Number(backendStock.dailyChangePercent ?? backendStock.changePercent) || 0,
    exchange: backendStock.exchange || 'NSE',
    lastUpdated: backendStock.updatedAt || new Date().toISOString(),
    sector: backendStock.sector || 'Conglomerate',
    volume: Number(backendStock.volume) || 0,
    avgVolume20D: Number(backendStock.avgVolume20D) || 0,
    marketCap: backendStock.marketCap || '₹0 Cr',
    peRatio: Number(backendStock.peRatio) || 0,
    high52w: Number(backendStock.high52w) || 0,
    low52w: Number(backendStock.low52w) || 0,
    sparkline: Array.isArray(backendStock.sparkline) ? backendStock.sparkline : [],
    tags: Array.isArray(backendStock.tags) ? backendStock.tags : [],
    isPinned,
    hasActiveEvent: Boolean(matchingEvent),
    activeEventTitle: matchingEvent?.headline,
    activeEventPriority: matchingEvent?.priority as EventPriority | undefined,
  };
}

/**
 * Adapts backend Event model to frontend MarketEvent interface.
 */
export function adaptBackendEventToMarketEvent(
  backendEvent: any,
  watchlistSymbols?: Set<string>
): MarketEvent {
  const delta = backendEvent.metricsDelta || {};
  const stock = backendEvent.stock || {};

  const changePercent = Number(delta.changePercent ?? stock.changePercent ?? 0);
  const changeAmount = Number(delta.changeAmount ?? stock.changeAmount ?? 0);
  const price = Number(delta.price ?? stock.currentPrice ?? 0);

  const impact: EventImpact =
    changePercent > 0.5 ? 'BULLISH' : changePercent < -0.5 ? 'BEARISH' : 'NEUTRAL';

  const finalScore = Number(delta.attentionScore ?? 75);

  const inWatchlist =
    watchlistSymbols?.has(backendEvent.stockSymbol) ?? Boolean(backendEvent.inWatchlist);

  return {
    id: backendEvent.id,
    stockSymbol: backendEvent.stockSymbol,
    companyName: stock.companyName || backendEvent.stockSymbol,
    eventType: (backendEvent.eventType as EventType) || 'PRICE_SURGE',
    priority: (backendEvent.priority as EventPriority) || 'MEDIUM',
    impact,
    headline:
      delta.detectionReason ||
      `${backendEvent.stockSymbol} ${backendEvent.eventType?.replace(/_/g, ' ')} detected`,
    price,
    changeAmount,
    changePercent,
    timestamp: formatEventTimestamp(backendEvent.timestamp || backendEvent.createdAt),
    whatHappened:
      delta.explanation ||
      `${stock.companyName || backendEvent.stockSymbol} registered a ${changePercent.toFixed(1)}% price variance with ${delta.volumeRatio ? delta.volumeRatio + 'x' : 'active'} volume.`,
    metrics: {
      volumeRatio: delta.volumeRatio,
      dayHigh: delta.dayHigh ? Number(delta.dayHigh) : stock.high52w ? Number(stock.high52w) : undefined,
      dayLow: delta.dayLow ? Number(delta.dayLow) : stock.low52w ? Number(stock.low52w) : undefined,
      revenueSurprisePercent: delta.revenueSurprisePercent,
      dividendAmount: delta.dividendAmount,
      contractValue: delta.contractValue,
    },
    scoring: {
      eventTypeScore: 80,
      priceMagnitudeScore: Math.min(100, Math.abs(changePercent) * 10),
      volumeSpikeScore: delta.volumeRatio ? Math.min(100, delta.volumeRatio * 25) : 50,
      recencyScore: 90,
      marketImpactScore: 85,
      userAffinityScore: inWatchlist ? 95 : 60,
      catalystConfidenceScore: 80,
      finalScore,
    },
    read: Boolean(backendEvent.read),
    acknowledged: Boolean(backendEvent.acknowledged),
    inWatchlist,
  };
}

/**
 * Adapts backend Insight model to frontend Insight interface.
 */
export function adaptBackendInsightToInsight(
  backendInsight: any,
  watchlistSymbols?: Set<string>
): Insight {
  const confScore = Number(backendInsight.confidenceScore || 0.8);
  const confidenceLevel: ConfidenceLevel =
    confScore >= 0.8 ? 'HIGH' : confScore >= 0.55 ? 'MEDIUM' : 'LOW';

  let sourceName = 'Market Intelligence Engine';
  let sourceUrl = 'https://nseindia.com';

  if (Array.isArray(backendInsight.sources) && backendInsight.sources.length > 0) {
    const first = backendInsight.sources[0];
    if (typeof first === 'string') {
      sourceName = first;
      if (backendInsight.sources[1] && typeof backendInsight.sources[1] === 'string' && backendInsight.sources[1].startsWith('http')) {
        sourceUrl = backendInsight.sources[1];
      }
    } else if (first && typeof first === 'object') {
      sourceName = first.name || 'Regulatory Disclosure';
      sourceUrl = first.url || 'https://nseindia.com';
    }
  }

  const inWatchlist =
    watchlistSymbols?.has(backendInsight.stockSymbol) ?? Boolean(backendInsight.inWatchlist);

  return {
    id: backendInsight.id,
    relatedEventId: backendInsight.relatedEventId,
    stockSymbol: backendInsight.stockSymbol,
    title: backendInsight.headline || `${backendInsight.stockSymbol} Catalyst Insight`,
    explanation:
      backendInsight.possibleExplanation ||
      'Underlying institutional capital flow and news catalysts drove the observed price variance.',
    whyItMatters:
      backendInsight.whyItMatters ||
      'Tracking catalyst correlation provides actionable insight into forward multi-week stock trajectory.',
    sourceName,
    sourceUrl,
    confidenceScore: confScore,
    confidenceLevel,
    publishedAt: backendInsight.createdAt || new Date().toISOString(),
    generatedAt: backendInsight.createdAt || new Date().toISOString(),
    inWatchlist,
  };
}

/**
 * Adapts backend Digest model to frontend HistoricalDigest interface.
 */
export function adaptBackendDigestToHistoricalDigest(
  backendDigest: any,
  watchlistSymbols?: Set<string>
): HistoricalDigest {
  const dateObj = new Date(backendDigest.timestamp || backendDigest.createdAt);
  const digestDate = dateObj.toISOString().split('T')[0];
  const displayDate =
    backendDigest.timeRange ||
    dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' Trading Session';

  const eventIds: string[] = Array.isArray(backendDigest.digestEvents)
    ? backendDigest.digestEvents.map((de: any) => de.eventId || de.id)
    : [];

  const insightIds: string[] = Array.isArray(backendDigest.digestInsights)
    ? backendDigest.digestInsights.map((di: any) => di.insightId || di.id)
    : [];

  // Benchmarks
  const closes = backendDigest.benchmarkCloses || {};
  const benchmarkIndices = {
    nifty: {
      close: closes.nifty50?.close ?? closes.nifty?.close ?? 24850.4,
      changePercent: closes.nifty50?.pct ?? closes.nifty?.pct ?? 0.58,
    },
    sensex: {
      close: closes.sensex?.close ?? 81320.1,
      changePercent: closes.sensex?.pct ?? 0.57,
    },
  };

  // Extract catalysts
  const catalysts: CatalystItem[] = [];
  if (Array.isArray(backendDigest.digestEvents)) {
    for (const de of backendDigest.digestEvents) {
      if (de.event) {
        catalysts.push({
          title: de.event.metricsDelta?.detectionReason || `${de.event.stockSymbol} Catalyst`,
          impact: de.event.metricsDelta?.changePercent >= 0 ? 'BULLISH' : 'BEARISH',
          affectedSectors: [de.event.stock?.sector || 'Broad Market'],
        });
      }
    }
  }
  if (catalysts.length === 0) {
    catalysts.push({
      title: 'Institutional Rotation & Earnings Catalysts',
      impact: 'BULLISH',
      affectedSectors: ['Technology', 'Financials'],
    });
  }

  // Forward performance
  const fwdMap: Record<string, DigestForwardPerformance> = {};
  if (backendDigest.forwardPerformanceMap && typeof backendDigest.forwardPerformanceMap === 'object') {
    const rawFwd = backendDigest.forwardPerformanceMap;
    // Map general day1, day3, day5
    fwdMap['MARKET_BENCHMARK'] = {
      day1: rawFwd.day1 || '+0.4%',
      day5: rawFwd.day5 || '+1.8%',
      day30: rawFwd.day30 || '+5.4%',
    };
  }

  const hasWatchlistEvents =
    Boolean(backendDigest.hasWatchlistEvents) ||
    (Array.isArray(backendDigest.digestEvents) &&
      backendDigest.digestEvents.some((de: any) =>
        watchlistSymbols?.has(de.event?.stockSymbol || de.stockSymbol)
      ));

  const watchlistMatchedCount =
    backendDigest.watchlistMatchedCount ||
    (Array.isArray(backendDigest.digestEvents)
      ? backendDigest.digestEvents.filter((de: any) =>
          watchlistSymbols?.has(de.event?.stockSymbol || de.stockSymbol)
        ).length
      : 0);

  return {
    id: backendDigest.id,
    digestDate,
    displayDate,
    title: backendDigest.headline || 'Comprehensive Market Intelligence Digest',
    executiveSummary:
      backendDigest.executiveSummary ||
      'Synthesized overview of verified catalyst events and forward probabilities.',
    totalEventsCount: eventIds.length,
    highPriorityCount: Array.isArray(backendDigest.digestEvents)
      ? backendDigest.digestEvents.filter(
          (de: any) => de.event?.priority === 'CRITICAL' || de.event?.priority === 'HIGH'
        ).length
      : 1,
    marketMood: backendDigest.marketMood || 'NEUTRAL',
    benchmarkIndices,
    catalysts: catalysts.slice(0, 4),
    eventIds,
    insightIds,
    isAcknowledged: Boolean(backendDigest.read),
    forwardPerformanceMap: fwdMap,
    hasWatchlistEvents,
    watchlistMatchedCount,
  };
}
