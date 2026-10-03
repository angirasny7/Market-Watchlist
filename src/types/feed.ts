export type FeedPriorityLabel = 'Urgent' | 'Important' | 'Worth a look' | 'FYI';
export type FeedPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface FeedSignal {
  type: string;
  label: string;
}

export interface FeedItem {
  id: string;
  stockSymbol: string;
  companyName: string;
  exchange: string;
  currency: string;
  date: string;
  priority: FeedPriority;
  priorityLabel: FeedPriorityLabel;
  isUnread: boolean;
  isSaved: boolean;
  isNew: boolean;
  isAlertTriggered: boolean;
  isDemo: boolean;
  changePercent: number;
  eventPrice: number | null;
  currentPrice: number | null;
  dayChangePercent: number | null;
  signals: FeedSignal[];
  extraSignalsCount: number;
  headline: string;
  memberEventIds: string[];
}

export interface FeedDetailsHappened {
  movePercent: number;
  priceAtEvent: number | null;
  currentPrice: number | null;
  priceDelta: number | null;
  dayOpen: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  dayClose: number | null;
  volume: number | null;
  avgVolume20D: number | null;
  volumeRatio: number;
  high52w: number | null;
  low52w: number | null;
  is52wHigh: boolean;
  is52wLow: boolean;
  eventTimestamp: string;
}

export interface FeedDetailsWhy {
  cause: string;
  confidenceScore: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  confidenceReason: string;
  possibleDrivers: string[];
}

export interface FeedDetailsMatters {
  summary: string;
  bulletPoints: string[];
}

export interface FeedDetailsSourceItem {
  publisher: string;
  title: string;
  publishedAt: string;
  url: string;
  sourceType: string;
}

export interface FeedDetailsPriceSeries {
  timestamp: string;
  price: number;
  volume: number;
}

export interface FeedDetailsPrice {
  series1D: FeedDetailsPriceSeries[];
  series1W: FeedDetailsPriceSeries[];
  series1M: FeedDetailsPriceSeries[];
  eventMarkerTimestamp: string;
}

export interface FeedDetailsAlert {
  hasUserAlert: boolean;
  alertType?: string;
  threshold?: number;
  triggeredAt?: string;
}

export interface FeedItemDetails {
  id: string;
  item: FeedItem;
  happened: FeedDetailsHappened;
  why: FeedDetailsWhy;
  matters: FeedDetailsMatters;
  sources: FeedDetailsSourceItem[];
  price: FeedDetailsPrice;
  alert: FeedDetailsAlert | null;
}

export interface FeedSummary {
  unreadClusters: number;
  totalInWindow: number;
  needAttentionCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  daysSinceLastVisit: number;
  lastVisitAt: string;
  headline: string;
  dataFreshness: string;
  lastSyncedAt: string;
  isDelayed: boolean;
  delayNotice: string;
}

export type FeedTimeWindow = 'sinceLastVisit' | '24h' | '7d' | '30d';
