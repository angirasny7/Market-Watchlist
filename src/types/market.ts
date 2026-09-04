export interface IndexSnapshot {
  symbol: string;
  name: string;
  currentValue: number;
  changeAmount: number;
  changePercent: number;
  isPositive: boolean;
  dayHigh: number;
  dayLow: number;
}

export interface MacroAlert {
  id: string;
  title: string;
  category: 'MONETARY_POLICY' | 'COMMODITY' | 'GLOBAL_MACRO' | 'REGULATORY';
  impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  source: string;
  publishedAt: string;
  explanation: string;
  whyItMatters: string;
  affectedSectors: string[];
}

export interface SectorPerformance {
  sector: string;
  changePercent: number;
  leadStock: string;
  leadChange: string;
  momentum: 'ACCELERATING' | 'STABLE' | 'WEAKENING';
}

export interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volumeRatio: string;
  catalystSummary: string;
  inWatchlist: boolean;
}
