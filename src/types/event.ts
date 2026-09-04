export type EventPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type EventType = 
  | '52_WEEK_HIGH'
  | 'FIFTY_TWO_WEEK_HIGH'
  | '52_WEEK_LOW'
  | 'FIFTY_TWO_WEEK_LOW'
  | 'PRICE_SPIKE'
  | 'PRICE_SURGE'
  | 'PRICE_DROP'
  | 'VOLUME_SPIKE'
  | 'EARNINGS_RELEASE'
  | 'EARNINGS_BEAT'
  | 'EARNINGS_MISS'
  | 'DIVIDEND_ANNOUNCED'
  | 'MACRO_POLICY';

export type EventImpact = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface ScoringBreakdown {
  eventTypeScore: number;          // Base weight (0-100)
  priceMagnitudeScore: number;     // Price delta weight (0-100)
  volumeSpikeScore: number;        // Volume surge weight (0-100)
  recencyScore: number;            // Time decay factor (0-100)
  marketImpactScore: number;       // Heavyweight market impact (0-100)
  userAffinityScore: number;       // In watchlist / pinned status (0-100)
  catalystConfidenceScore: number; // Confidence from Insight Engine (0-100)
  finalScore: number;              // Total normalized score (0-100)
}

export interface EventMetrics {
  volumeRatio?: number;            // e.g. 3.5x average
  dayHigh?: number;                // e.g. ₹1145.20
  dayLow?: number;                 // e.g. ₹1039.40
  revenueSurprisePercent?: number; // e.g. +8.2%
  dividendAmount?: number;         // e.g. ₹10.00
  recordDate?: string;             // e.g. 'September 22, 2026'
  contractValue?: string;          // e.g. '$1.2 Billion'
  dealDuration?: string;           // e.g. '7 Years'
  [key: string]: string | number | undefined;
}

export interface MarketEvent {
  id: string;                      // e.g. 'evt_tata_52w'
  stockSymbol: string;             // FK to Stock: e.g. 'TATAMOTORS'
  companyName: string;             // e.g. 'Tata Motors Ltd'
  eventType: EventType;
  priority: EventPriority;
  impact: EventImpact;
  headline: string;
  price: number;
  changeAmount: number;
  changePercent: number;
  timestamp: string;
  whatHappened: string;            // Direct state transition summary
  metrics: EventMetrics;           // Structured event metrics
  scoring: ScoringBreakdown;       // Quantitative attention scores
  read: boolean;
  acknowledged: boolean;
  inWatchlist?: boolean;
}
