export interface MarketHighlightIndex {
  symbol: string;
  name: string;
  category: string;
  currentPrice: number;
  changeAmount: number;
  changePercent: number;
  dayHigh: number | null;
  dayLow: number | null;
  exchange: string | null;
  delayMinutes: number;
  sparkline: Array<{ date: string; price: number }>;
  lastSyncedAt: string;
}

export interface MarketBreadth {
  advancers: number;
  decliners: number;
  unchanged: number;
  total: number;
  advancerPercent: number;
  high52wCount: number;
  low52wCount: number;
}

export interface SectorSummary {
  sector: string;
  changePercent: number;
  stockCount: number;
  leadStock: string;
  leadStockChange: number;
  momentum: 'ACCELERATING' | 'STABLE' | 'WEAKENING';
}

export interface MarketMoverItem {
  symbol: string;
  companyName: string;
  currentPrice: number;
  changeAmount: number;
  changePercent: number;
  volume: number;
  avgVolume20D: number;
  volumeRatio: string;
  sector: string;
  exchange: string;
  isInWatchlist: boolean;
}

export interface MarketHighlightsData {
  pulse: {
    summarySentence: string;
    exchanges: Array<{
      exchange: string;
      region: 'India' | 'US';
      status: 'OPEN' | 'CLOSED';
      tradingHours: string;
    }>;
  };
  indices: MarketHighlightIndex[];
  breadth: MarketBreadth;
  sectors: SectorSummary[];
  movers: {
    india: {
      gainers: MarketMoverItem[];
      losers: MarketMoverItem[];
      mostActive: MarketMoverItem[];
    };
    us: {
      gainers: MarketMoverItem[];
      losers: MarketMoverItem[];
      mostActive: MarketMoverItem[];
    };
  };
  volatility: {
    symbol: string;
    name: string;
    currentValue: number;
    changeAmount: number;
    changePercent: number;
    level: 'CALM' | 'NORMAL' | 'ELEVATED';
    levelDescription: string;
    delayMinutes: number;
  };
  globalCues: MarketHighlightIndex[];
  upcomingEvents: Array<{
    id: string;
    stockSymbol: string;
    eventType: string;
    eventDate: string;
    title: string;
    details: string | null;
  }>;
  headlines: Array<{
    headline: string;
    publisher: string;
    url: string;
    publishedAt: string;
  }>;
  exposure: {
    watchedMoversCount: number;
    topSector: string | null;
    topSectorWeight: number;
    topSectorDayChange: number | null;
    summarySentence: string;
  } | null;
  freshness: {
    lastSyncedAt: string;
    delayMinutes: number;
    isStale: boolean;
    provider: string;
  };
}

// Legacy aliases for backward compatibility
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
  leadChange?: string;
  momentum: 'ACCELERATING' | 'STABLE' | 'WEAKENING';
}

export interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volumeRatio: string;
  catalystSummary?: string;
  inWatchlist?: boolean;
}
