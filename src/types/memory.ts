import { EventPriority, EventType } from './event';
import { Insight } from './insight';
import { StockQuote } from './stock';

export type DateRangePreset =
  | 'ALL'
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_MONTH'
  | 'SINCE_LAST_LOGIN'
  | 'CUSTOM';

export type MemoryTypeFilter = 'ALL' | 'ARCHIVED' | 'SAVED';

export type StockScopeFilter = 'ALL' | 'WATCHLIST' | string;

export type MoodFilter = 'ALL' | 'BULLISH' | 'EXTREME_GREED' | 'NEUTRAL' | 'CHOPPY' | 'BEARISH';

export interface ArchivedMarketEvent {
  id: string;
  memoryType?: 'ARCHIVED' | 'SAVED';
  readId?: string;
  readAt?: string;
  saveId?: string;
  savedAt?: string;
  stockSymbol: string;
  companyName: string;
  eventType: EventType;
  priority: EventPriority;
  headline: string;
  whatHappened: string;
  price: number;
  changeAmount: number;
  changePercent: number;
  timestamp: string;
  read: boolean;
  acknowledged: boolean;
  inWatchlist: boolean;
  marketMood: string;
  stock: StockQuote | any;
  insights: (Insight & { possibleExplanation?: string })[];
  primaryInsight: (Insight & { possibleExplanation?: string }) | null;
}

export interface MemoryQueryParams {
  memoryType?: MemoryTypeFilter;
  dateRange?: DateRangePreset;
  startDate?: string;
  endDate?: string;
  symbol?: string;
  watchlistOnly?: boolean;
  eventType?: string;
  marketMood?: string;
  search?: string;
  limit?: number;
}

