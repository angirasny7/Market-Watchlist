export interface DigestForwardPerformance {
  day1?: string | null;   // e.g. "+1.8%"
  day5?: string | null;   // e.g. "+6.2%"
  day30?: string | null;  // e.g. "+14.5%"
  sampleSize?: number;
}

export interface CatalystItem {
  title: string;
  impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  affectedSectors: string[];
}

export interface HistoricalDigest {
  id: string;                       // e.g. 'digest_2026_09_15'
  digestDate: string;               // e.g. '2026-09-15'
  displayDate: string;              // e.g. 'September 15, 2026'
  title: string;
  executiveSummary: string;
  totalEventsCount: number;
  highPriorityCount: number;
  marketMood: 'EXTREME_GREED' | 'BULLISH' | 'NEUTRAL' | 'CHOPPY' | 'BEARISH';
  benchmarkIndices: {
    nifty: { close: number; changePercent: number } | null;
    sensex: { close: number; changePercent: number } | null;
    indiaVix?: { close: number; changePercent: number } | null;
  };
  catalysts: CatalystItem[];
  eventIds: string[];               // Normalized references to MarketEvent[]
  insightIds: string[];             // Normalized references to Insight[]
  isAcknowledged: boolean;
  forwardPerformanceMap?: Record<string, DigestForwardPerformance | null>; // Keyed by stockSymbol
  hasWatchlistEvents?: boolean;
  watchlistMatchedCount?: number;
}
