export type MarketStatus = 'PRE_MARKET' | 'REGULAR_OPEN' | 'POST_MARKET' | 'CLOSED' | 'HALTED';

export type StockSector =
  | 'Information Technology'
  | 'Automobile'
  | 'Energy & Petrochemicals'
  | 'Energy & Utilities'
  | 'Banking & Financial Services'
  | 'Consumer Goods'
  | 'Healthcare & Pharma'
  | 'Metals & Mining'
  | 'Infrastructure & Capital Goods'
  | 'Telecom & Media'
  | 'US Mega Caps'
  | 'Conglomerate'
  | 'E-Commerce / Cloud'
  | string;

export interface SparklinePoint {
  date: string;
  price: number;
}

export interface SnapshotVector {
  symbol: string;
  price: number;
  percentageChange: number;
  volume: number;
  vwap: number;
  high52w: number;
  low52w: number;
  marketStatus: MarketStatus;
  timestamp: string;
}

export interface StockQuote {
  symbol: string;
  name: string;
  currency: string;
  currentPrice: number;
  changeAmount: number;
  changePercent: number;
  dailyChangePercent?: number;
  exchange?: string;
  lastUpdated: string;
  sector: StockSector;
  volume: number;
  avgVolume20D: number;
  marketCap: string; // e.g. "₹14.2 Lakh Cr" or "$1.8 Trillion"
  peRatio: number;
  high52w: number;
  low52w: number;
  sparkline: SparklinePoint[];
  tags: string[];
  isPinned?: boolean;
  hasActiveEvent?: boolean;
  activeEventTitle?: string;
  activeEventPriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}
