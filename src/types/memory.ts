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

export type MemoryTypeFilter = 'ALL' | 'ARCHIVED' | 'SAVED' | 'DELETED' | 'READ';

export type MemoryTab = 'SAVED' | 'READ' | 'DELETED';

export type MemorySortOption =
  | 'recent_action'
  | 'event_date_desc'
  | 'event_date_asc'
  | 'stock_name'
  | 'priority'
  | 'change_since_saved';

export interface MemoryCounts {
  savedCount: number;
  readCount: number;
  deletedCount: number;
  totalCount: number;
}

export interface ArchivedMarketEvent {
  id: string;
  tab?: MemoryTab;
  memoryType?: 'ARCHIVED' | 'SAVED' | 'DELETED' | 'READ';
  readId?: string;
  readAt?: string | null;
  readSource?: 'user' | 'auto' | string;
  saveId?: string;
  savedAt?: string | null;
  deleteId?: string;
  deletedAt?: string | null;
  expiresAt?: string | null;
  stockSymbol: string;
  companyName: string;
  exchange?: string;
  currency?: string;
  eventType: EventType | string;
  priority: EventPriority | string;
  priorityLabel?: string;
  meaningfulnessScore?: number | null;
  headline: string;
  whatHappened: string;
  signals?: Array<{ type: string; label: string }>;
  currentPrice?: number | null;
  dayChangePercent?: number | null;
  eventPrice?: number | null;
  price?: number | null;
  changeAmount?: number;
  changePercent?: number;
  priceAtSave?: number | null;
  priceChangeSinceSaved?: number | null;
  note?: string | null;
  timestamp: string;
  occurredAt?: string;
  detectedAt?: string;
  source?: string | null;
  sourceUrl?: string | null;
  sourceTrustTier?: string | null;
  sources?: any[] | null;
  whyShown?: string | null;
  read?: boolean;
  acknowledged?: boolean;
  inWatchlist?: boolean;
  marketMood?: string;
  stock?: StockQuote | any;
  insights?: (Insight & { possibleExplanation?: string })[];
  primaryInsight?: (Insight & { possibleExplanation?: string }) | null;
}

export interface MemoryQueryParams {
  tab?: MemoryTab | 'ARCHIVED' | 'ALL';
  memoryType?: MemoryTypeFilter;
  search?: string;
  stock?: string;
  symbol?: string;
  watchlistId?: string;
  watchlistOnly?: boolean;
  priority?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  dateRange?: DateRangePreset;
  dateFilterType?: 'eventDate' | 'actionDate';
  hasNote?: boolean;
  sortBy?: MemorySortOption;
  cursor?: string;
  limit?: number;
}


