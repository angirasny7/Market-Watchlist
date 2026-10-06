import { PrismaClient, Priority, EventType, Stock, Event } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { isEventDemo } from './eventService.js';
import { contextEnrichmentService } from './contextEnrichmentService.js';
import { evidenceAggregator, EvidenceItem } from './evidenceAggregator.js';
import { ProviderFactory } from '../providers/providerFactory.js';
import { undoStore } from '../utils/undoStore.js';

import { userVisitService, UserVisitInfo } from './userVisitService.js';

export type FeedPriorityLabel = 'Urgent' | 'Important' | 'Worth a look' | 'FYI';

export interface FeedSignal {
  type: EventType;
  label: string;
}

export interface FeedItem {
  id: string;
  stockSymbol: string;
  companyName: string;
  exchange: string;
  currency: string;
  date: string;
  occurredOn?: string | null;
  occurredAt?: string | null;
  periodStart?: string | null;
  detectedAt?: string | null;
  publishedAt?: string | null;
  receivedAt?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  sourceTrustTier?: string | null;
  meaningfulnessScore?: number | null;
  whyShown?: string | null;
  sources?: any[] | null;
  confirmedCount?: number;
  isIntraday?: boolean;
  isCumulative?: boolean;
  eventType?: EventType;
  priority: Priority;
  priorityLabel: FeedPriorityLabel;
  isUnread: boolean;
  isSaved: boolean;
  isNew: boolean;
  isUpdated?: boolean;
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
  occurredOn?: string | null;
  occurredAt?: string | null;
  periodStart?: string | null;
  detectedAt?: string | null;
  isCumulative?: boolean;
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

export interface FeedCountsResponse {
  sinceLastVisit: number;
  toReview?: number;
  newSinceLastVisit: number;
  savedCount: number;
  readCount: number;
  expiredCount: number;
  deletedCount: number;
  windowCounts: {
    sinceLastVisit: number;
    toReview?: number;
    '24h': number;
    '7d': number;
    '30d': number;
  };
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
  lastVisitAt: string | null;
  headline: string;
  dataFreshness: string;
  lastSyncedAt: string;
  isDelayed: boolean;
  delayNotice: string;
  windowCounts: {
    sinceLastVisit: number;
    toReview?: number;
    '24h': number;
    '7d': number;
    '30d': number;
  };
  marketsClosed?: boolean;
  marketsClosedInWindow?: boolean;
  exchangeStatus?: string;
  hasBoundary?: boolean;
  feedBoundaryAt?: string | null;
  lastVisitEndedAt?: string | null;
  endReason?: string;
  endReasonExplanation?: string;
  timeAwayFormatted?: string;
  isFirstSession?: boolean;
  awayBriefing?: string[];
  newsCountInWindow?: number;
  previousSessionStartedAt?: string | null;
  previousSessionEndReason?: 'logout' | 'inactivity' | 'tab_closed' | string | null;
  serverNow?: string;
}

export class FeedService {
  /**
   * Helper mapping Priority enum to human label
   */
  public mapPriorityToLabel(p: Priority): FeedPriorityLabel {
    switch (p) {
      case 'CRITICAL':
        return 'Urgent';
      case 'HIGH':
        return 'Important';
      case 'MEDIUM':
        return 'Worth a look';
      case 'LOW':
      default:
        return 'FYI';
    }
  }

  /**
   * Helper mapping label back to Priority enum
   */
  public mapLabelToPriority(label: string): Priority | undefined {
    const l = label.trim().toLowerCase();
    if (l === 'urgent' || l === 'critical') return 'CRITICAL';
    if (l === 'important' || l === 'high') return 'HIGH';
    if (l === 'worth a look' || l === 'medium') return 'MEDIUM';
    if (l === 'fyi' || l === 'low') return 'LOW';
    return undefined;
  }

  /**
   * Helper generating dynamic headline from structured data (NEVER baked strings)
   */
  public generateHeadline(
    companyName: string,
    topEventType: EventType,
    changePercent: number,
    volumeRatio: number,
    isCumulative: boolean,
    metricsDelta?: any
  ): string {
    if (topEventType === 'NEWS' || topEventType === 'FILING') {
      const customHeadline = metricsDelta?.headline || metricsDelta?.title;
      if (customHeadline) return customHeadline;
      return topEventType === 'NEWS' ? `${companyName} featured in new market coverage` : `${companyName} submitted regulatory disclosure`;
    }

    const dir = changePercent >= 0 ? '+' : '';
    const pctStr = `${dir}${changePercent.toFixed(1)}%`;

    if (isCumulative) {
      return changePercent >= 0
        ? `${companyName} is ${pctStr} since your last visit`
        : `${companyName} dropped ${pctStr} since your last visit`;
    }

    switch (topEventType) {
      case 'PRICE_SURGE':
        return volumeRatio >= 1.5
          ? `${companyName} surged ${pctStr} on ${volumeRatio.toFixed(1)}x volume`
          : `${companyName} gained ${pctStr}`;
      case 'PRICE_DROP':
        return volumeRatio >= 1.5
          ? `${companyName} dropped ${pctStr} on elevated volume`
          : `${companyName} fell ${pctStr}`;
      case 'VOLUME_SPIKE':
        return `${companyName} trading volume reached ${volumeRatio.toFixed(1)}x average`;
      case 'FIFTY_TWO_WEEK_HIGH':
        return `${companyName} reached near 52-week high`;
      case 'FIFTY_TWO_WEEK_LOW':
        return `${companyName} tested 52-week support low`;
      case 'EARNINGS_BEAT':
        return `${companyName} reported quarterly earnings beat`;
      case 'EARNINGS_MISS':
        return `${companyName} reported quarterly earnings miss`;
      case 'DIVIDEND_ANNOUNCED':
        return `${companyName} announced corporate dividend action`;
      case 'ANALYST_UPGRADE':
        return `${companyName} received analyst rating upgrade`;
      case 'MANAGEMENT_CHANGE':
        return `${companyName} announced leadership update`;
      default:
        return `${companyName} ${pctStr} anomalous movement`;
    }
  }

  /**
   * Helper mapping eventType to short readable chip label
   */
  public getSignalLabel(eventType: EventType, changePercent?: number, volumeRatio?: number): string {
    switch (eventType) {
      case 'PRICE_SURGE':
        return changePercent ? `Surge +${changePercent.toFixed(1)}%` : 'Price Surge';
      case 'PRICE_DROP':
        return changePercent ? `Drop ${changePercent.toFixed(1)}%` : 'Price Drop';
      case 'VOLUME_SPIKE':
        return volumeRatio ? `${volumeRatio.toFixed(1)}x Volume` : 'Volume Spike';
      case 'FIFTY_TWO_WEEK_HIGH':
        return '52W High';
      case 'FIFTY_TWO_WEEK_LOW':
        return '52W Low';
      case 'EARNINGS_BEAT':
        return 'Earnings Beat';
      case 'EARNINGS_MISS':
        return 'Earnings Miss';
      case 'DIVIDEND_ANNOUNCED':
        return 'Dividend';
      case 'ANALYST_UPGRADE':
        return 'Upgrade';
      case 'MANAGEMENT_CHANGE':
        return 'Management';
      case 'NEWS':
        return 'News';
      case 'FILING':
        return 'Filing';
      default:
        return 'Market Event';
    }
  }

  /**
   * Helper resolving user's watched symbols and per-symbol watchedSince
   */
  private async resolveUserWatchlistScope(userId: string, watchlistId?: string): Promise<{
    monitoredSymbols: string[];
    watchedSinceMap: Map<string, Date>;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    const userCreatedAt = user?.createdAt || new Date(0);

    const ws = await prisma.watchlistStock.findMany({
      where: watchlistId && watchlistId !== 'all'
        ? { watchlistId, watchlist: { userId } }
        : { watchlist: { userId } },
      select: { stockSymbol: true, addedAt: true },
    });

    const watchedSinceMap = new Map<string, Date>();
    for (const w of ws) {
      const existing = watchedSinceMap.get(w.stockSymbol);
      const effectiveAddedAt = w.addedAt;
      if (!existing || effectiveAddedAt < existing) {
        watchedSinceMap.set(w.stockSymbol, effectiveAddedAt);
      }
    }

    return {
      monitoredSymbols: Array.from(watchedSinceMap.keys()),
      watchedSinceMap,
    };
  }

  /**
   * Helper resolving user's session boundary using UserVisitService
   */
  private async resolveUserSessionBoundary(userId: string): Promise<{
    hasPreviousSession: boolean;
    lastSessionAt: Date;
    userState: any;
    visitInfo: UserVisitInfo;
  }> {
    const visitInfo = await userVisitService.resolveVisitBoundary(userId);
    const userState = await prisma.userState.findUnique({ where: { userId } });
    const hasPreviousSession = visitInfo.hasBoundary;
    const lastSessionAt = visitInfo.feedBoundaryAt || new Date(0);

    return { hasPreviousSession, lastSessionAt, userState, visitInfo };
  }

  /**
   * Single source of truth for all feed, badge, overview, and memory counts
   */
  async getFeedCounts(userId: string): Promise<FeedCountsResponse> {
    const { monitoredSymbols, watchedSinceMap } = await this.resolveUserWatchlistScope(userId);
    const { hasPreviousSession, lastSessionAt } = await this.resolveUserSessionBoundary(userId);

    const allowDemo = process.env.NODE_ENV === 'development' && process.env.SEED_DEMO_EVENTS === 'true';
    const eventFilter = {
      isHidden: false,
      isDuplicate: false,
      isInvalidated: false,
      isSimulated: false,
      ...(allowDemo
        ? {}
        : {
            isDemo: false,
            NOT: [
              { id: { startsWith: 'demo_' } },
              { id: { in: ['evt_001', 'evt_002', 'evt_003', 'evt_004'] } },
            ],
          }),
    };

    const [savedCount, readCount, expiredCount, deletedCount] = await Promise.all([
      prisma.userSavedEvent.count({ where: { userId, event: eventFilter } }),
      prisma.userEventRead.count({ where: { userId, readSource: { not: 'auto' }, event: eventFilter } }),
      prisma.userEventRead.count({ where: { userId, readSource: 'auto', event: eventFilter } }),
      prisma.userEventDelete.count({ where: { userId, event: eventFilter } }),
    ]);

    if (monitoredSymbols.length === 0) {
      return {
        sinceLastVisit: 0,
        toReview: 0,
        newSinceLastVisit: 0,
        savedCount,
        readCount,
        expiredCount,
        deletedCount,
        windowCounts: {
          sinceLastVisit: 0,
          toReview: 0,
          '24h': 0,
          '7d': 0,
          '30d': 0,
        },
      };
    }

    const retentionStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const date24hAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const date7dAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Fetch user reads, saves, and deletes
    const [userReads, userSaves, userDeletes] = await Promise.all([
      prisma.userEventRead.findMany({ where: { userId }, select: { eventId: true } }),
      prisma.userSavedEvent.findMany({ where: { userId }, select: { eventId: true } }),
      prisma.userEventDelete.findMany({ where: { userId }, select: { eventId: true } }),
    ]);
    const readEventIds = new Set(userReads.map((r) => r.eventId));
    const savedEventIds = new Set(userSaves.map((s) => s.eventId));
    const deletedEventIds = new Set(userDeletes.map((d) => d.eventId));

    // Query unhandled candidate events
    const rawEvents = await prisma.event.findMany({
      where: {
        stockSymbol: { in: monitoredSymbols },
        AND: [{ OR: [{ userId: null }, { userId }] }],
        isHidden: false,
        isDuplicate: false,
        isInvalidated: false,
        ...(allowDemo
          ? {}
          : {
              isDemo: false,
              NOT: [
                { id: { startsWith: 'demo_' } },
                { id: { in: ['evt_001', 'evt_002', 'evt_003', 'evt_004'] } },
              ],
            }),
        OR: [
          { occurredAt: { gte: retentionStartDate } },
          { AND: [{ occurredAt: null }, { occurredOn: { gte: retentionStartDate } }] },
          { AND: [{ occurredAt: null }, { occurredOn: null }, { timestamp: { gte: retentionStartDate } }] },
        ],
      },
      select: {
        id: true,
        stockSymbol: true,
        timestamp: true,
        occurredAt: true,
        occurredOn: true,
        metricsDelta: true,
      },
      orderBy: { timestamp: 'desc' },
    });

    // Filter unhandled & watchedSince
    const unhandledEvents = rawEvents.filter((ev) => {
      if (readEventIds.has(ev.id) || savedEventIds.has(ev.id) || deletedEventIds.has(ev.id)) return false;
      if (!allowDemo && isEventDemo(ev)) return false;

      const watchedSince = watchedSinceMap.get(ev.stockSymbol);
      if (!watchedSince) return false;
      const evDate = new Date(ev.occurredAt || ev.occurredOn || ev.timestamp);
      return evDate.getTime() >= watchedSince.getTime();
    });

    // Group into clusters by stockSymbol + calendarDay
    const clusterMap = new Map<string, typeof unhandledEvents>();
    for (const ev of unhandledEvents) {
      const evDate = new Date(ev.occurredAt || ev.occurredOn || ev.timestamp);
      const dayStr = evDate.toISOString().split('T')[0];
      const key = `${ev.stockSymbol}|${dayStr}`;
      const list = clusterMap.get(key) || [];
      list.push(ev);
      clusterMap.set(key, list);
    }

    let toReviewClusters = 0;
    let newSinceLastVisitClusters = 0;
    let sinceLastVisitClusters = 0;
    let clusters24h = 0;
    let clusters7d = 0;
    let clusters30d = 0;

    for (const [, memberEvts] of clusterMap.entries()) {
      // Top timestamp for cluster
      const maxTime = Math.max(...memberEvts.map((e) => new Date(e.occurredAt || e.occurredOn || e.timestamp).getTime()));

      if (hasPreviousSession && maxTime >= lastSessionAt.getTime()) {
        sinceLastVisitClusters++;
        newSinceLastVisitClusters++;
      }
      if (maxTime >= date24hAgo.getTime()) {
        clusters24h++;
      }
      if (maxTime >= date7dAgo.getTime()) {
        clusters7d++;
      }
      if (maxTime >= retentionStartDate.getTime()) {
        clusters30d++;
        toReviewClusters++;
      }
    }

    return {
      sinceLastVisit: sinceLastVisitClusters,
      toReview: toReviewClusters,
      newSinceLastVisit: newSinceLastVisitClusters,
      savedCount,
      readCount,
      expiredCount,
      deletedCount,
      windowCounts: {
        toReview: toReviewClusters,
        sinceLastVisit: sinceLastVisitClusters,
        '24h': clusters24h,
        '7d': clusters7d,
        '30d': clusters30d,
      },
    };
  }

  /**
   * GET /feed: Unhandled Attention Feed inbox with filtering and pagination
   */
  async getFeed(
    userId: string,
    options?: {
      cursor?: string;
      limit?: number;
      window?: 'toReview' | 'sinceLastVisit' | '24h' | '7d' | '30d' | 'all';
      watchlistId?: string;
      symbol?: string;
      priority?: string;
      type?: EventType;
      unreadOnly?: boolean;
      savedOnly?: boolean;
      q?: string;
    }
  ): Promise<{ items: FeedItem[]; nextCursor: string | null; hasMore: boolean; total: number; unreadCount: number }> {
    const limit = Math.min(1000, Math.max(1, options?.limit || 20));
    const allowDemo = process.env.NODE_ENV === 'development' && process.env.SEED_DEMO_EVENTS === 'true';

    // 1. Resolve watched symbols & watchedSince
    const { monitoredSymbols: allUserSymbols, watchedSinceMap } = await this.resolveUserWatchlistScope(userId, options?.watchlistId);
    let monitoredSymbols = allUserSymbols;

    if (monitoredSymbols.length === 0) {
      return { items: [], nextCursor: null, hasMore: false, total: 0, unreadCount: 0 };
    }

    if (options?.symbol) {
      const sym = options.symbol.toUpperCase();
      if (!monitoredSymbols.includes(sym)) {
        return { items: [], nextCursor: null, hasMore: false, total: 0, unreadCount: 0 };
      }
      monitoredSymbols = [sym];
    }

    // 2. Resolve User Session Boundary
    const { hasPreviousSession, lastSessionAt } = await this.resolveUserSessionBoundary(userId);

    // If user is brand new with no previous session and requested sinceLastVisit, returns 0 items
    if (options?.window === 'sinceLastVisit' && !hasPreviousSession) {
      return { items: [], nextCursor: null, hasMore: false, total: 0, unreadCount: 0 };
    }

    let windowStartDate: Date;
    switch (options?.window) {
      case 'sinceLastVisit':
        windowStartDate = lastSessionAt;
        break;
      case '24h':
        windowStartDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        windowStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      case 'toReview':
      case 'all':
      default:
        windowStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // 3. User Read, Saved, Delete, and Alert state
    const [userReads, userSaves, userDeletes, userAlerts] = await Promise.all([
      prisma.userEventRead.findMany({ where: { userId }, select: { eventId: true } }),
      prisma.userSavedEvent.findMany({ where: { userId }, select: { eventId: true } }),
      prisma.userEventDelete.findMany({ where: { userId }, select: { eventId: true } }),
      prisma.alert.findMany({ where: { userId, isActive: true }, select: { stockSymbol: true } }),
    ]);

    const readEventIds = new Set(userReads.map((r) => r.eventId));
    const savedEventIds = new Set(userSaves.map((s) => s.eventId));
    const deleteEventIds = new Set(userDeletes.map((d) => d.eventId));
    const alertSymbols = new Set(userAlerts.map((a) => a.stockSymbol));

    // 4. Query DB Events
    const whereClause: any = {
      stockSymbol: { in: monitoredSymbols },
      AND: [{ OR: [{ userId: null }, { userId }] }],
      isHidden: false,
      isDuplicate: false,
      isInvalidated: false,
      OR: [
        { occurredAt: { gte: windowStartDate } },
        { AND: [{ occurredAt: null }, { occurredOn: { gte: windowStartDate } }] },
        { AND: [{ occurredAt: null }, { occurredOn: null }, { timestamp: { gte: windowStartDate } }] },
      ],
      ...(allowDemo
        ? {}
        : {
            isDemo: false,
            NOT: [
              { id: { startsWith: 'demo_' } },
              { id: { in: ['evt_001', 'evt_002', 'evt_003', 'evt_004'] } },
            ],
          }),
    };

    if (options?.type) {
      whereClause.eventType = options.type;
    }

    const priorityFilter = options?.priority ? this.mapLabelToPriority(options.priority) || (options.priority as Priority) : undefined;
    if (priorityFilter) {
      whereClause.priority = priorityFilter;
    }

    const dbEvents = await prisma.event.findMany({
      where: whereClause,
      include: {
        stock: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 2000,
    });

    const eligibleEvents = (allowDemo ? dbEvents : dbEvents.filter((e) => !isEventDemo(e)))
      .filter((ev) => {
        // Enforce watchedSince strictly:
        const watchedSince = watchedSinceMap.get(ev.stockSymbol);
        if (!watchedSince) return false;
        const evDate = new Date(ev.occurredAt || ev.occurredOn || ev.timestamp);
        if (evDate.getTime() < watchedSince.getTime()) return false;

        // Exclude soft-deleted events
        if (deleteEventIds.has(ev.id)) return false;

        // An item is in the Attention Feed ONLY IF it is unhandled (not read AND not saved)
        // unless explicitly querying savedOnly
        if (options?.savedOnly) {
          return savedEventIds.has(ev.id);
        }
        return !readEventIds.has(ev.id) && !savedEventIds.has(ev.id);
      });

    // 5. Cluster by stockSymbol + calendarDay
    const clusterMap = new Map<string, typeof eligibleEvents>();
    for (const ev of eligibleEvents) {
      const evDate = ev.occurredAt || ev.occurredOn || ev.timestamp;
      const dayStr = new Date(evDate).toISOString().split('T')[0];
      const key = `${ev.stockSymbol}|${dayStr}`;
      const list = clusterMap.get(key) || [];
      list.push(ev);
      clusterMap.set(key, list);
    }

    const priorityWeight: Record<Priority, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    const feedItems: FeedItem[] = [];

    for (const [, memberEvents] of clusterMap.entries()) {
      memberEvents.sort((a, b) => {
        const diff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        if (diff !== 0) return diff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      const topEv = memberEvents[0];
      const stock = topEv.stock;
      const delta = (topEv.metricsDelta as any) || {};
      const memberIds = memberEvents.map((m) => m.id);
      const topEvDate = new Date(topEv.occurredAt || topEv.occurredOn || topEv.timestamp);

      const isNew = hasPreviousSession && topEvDate.getTime() > lastSessionAt.getTime();
      const isAlertTriggered = alertSymbols.has(topEv.stockSymbol);

      const changePercent = typeof delta.changePercent === 'number' ? delta.changePercent : stock?.changePercent ? Number(stock.changePercent) : 0;
      const eventPrice = typeof delta.price === 'number' ? delta.price : typeof delta.eventPrice === 'number' ? delta.eventPrice : null;
      const currentPrice = stock?.currentPrice ? Number(stock.currentPrice) : eventPrice;
      const dayChangePercent = stock?.changePercent ? Number(stock.changePercent) : null;
      const volumeRatio = typeof delta.volumeRatio === 'number' ? delta.volumeRatio : 1.0;
      const isCumulative = Boolean(delta.isCumulativeReturnEvent);

      const distinctSignalTypes = new Set<EventType>();
      const allSignals: FeedSignal[] = [];
      for (const m of memberEvents) {
        if (!distinctSignalTypes.has(m.eventType)) {
          distinctSignalTypes.add(m.eventType);
          const mDelta = (m.metricsDelta as any) || {};
          const mChange = typeof mDelta.changePercent === 'number' ? mDelta.changePercent : changePercent;
          const mRatio = typeof mDelta.volumeRatio === 'number' ? mDelta.volumeRatio : volumeRatio;
          allSignals.push({
            type: m.eventType,
            label: this.getSignalLabel(m.eventType, mChange, mRatio),
          });
        }
      }

      const displaySignals = allSignals.slice(0, 3);
      const extraSignalsCount = Math.max(0, allSignals.length - 3);

      const headline = this.generateHeadline(
        stock?.companyName || topEv.stockSymbol,
        topEv.eventType,
        changePercent,
        volumeRatio,
        isCumulative,
        delta
      );

      const publishedAtStr = topEv.publishedAt ? topEv.publishedAt.toISOString() : (topEv.occurredAt ? topEv.occurredAt.toISOString() : topEv.timestamp.toISOString());
      const receivedAtStr = topEv.receivedAt ? topEv.receivedAt.toISOString() : topEv.createdAt.toISOString();
      const sourceStr = topEv.source || (stock?.exchange ? `${stock.exchange} Market Data` : 'NSE Market Data');
      const meaningfulnessScore = topEv.meaningfulnessScore ?? (delta.meaningfulnessScore || delta.attentionScore || 45);
      const whyShown = topEv.whyShown || delta.whyShown || this.getSignalLabel(topEv.eventType, changePercent, volumeRatio);

      feedItems.push({
        id: topEv.id,
        stockSymbol: topEv.stockSymbol,
        companyName: stock?.companyName || topEv.stockSymbol,
        exchange: stock?.exchange || 'NSE',
        currency: stock?.currency || '₹',
        date: topEv.timestamp.toISOString(),
        occurredOn: topEv.occurredOn ? topEv.occurredOn.toISOString() : null,
        occurredAt: topEv.occurredAt ? topEv.occurredAt.toISOString() : (topEv.occurredOn ? topEv.occurredOn.toISOString() : topEv.timestamp.toISOString()),
        periodStart: topEv.periodStart ? topEv.periodStart.toISOString() : null,
        detectedAt: topEv.detectedAt ? topEv.detectedAt.toISOString() : topEv.timestamp.toISOString(),
        publishedAt: publishedAtStr,
        receivedAt: receivedAtStr,
        source: sourceStr,
        sourceUrl: topEv.sourceUrl || null,
        sourceTrustTier: topEv.sourceTrustTier || 'OFFICIAL_EXCHANGE',
        meaningfulnessScore,
        whyShown,
        sources: (topEv.sources as any) || (delta.enrichment?.evidence || null),
        confirmedCount: Array.isArray(topEv.sources) ? topEv.sources.length : (delta.enrichment?.evidence?.length || 1),
        isIntraday: Boolean(delta.isIntraday),
        isCumulative,
        eventType: topEv.eventType,
        priority: topEv.priority,
        priorityLabel: this.mapPriorityToLabel(topEv.priority),
        isUnread: true,
        isSaved: false,
        isNew,
        isAlertTriggered,
        isDemo: isEventDemo(topEv),
        changePercent,
        eventPrice,
        currentPrice,
        dayChangePercent,
        signals: displaySignals,
        extraSignalsCount,
        headline,
        memberEventIds: memberIds,
      });
    }

    // 6. Apply search filter
    let filtered = feedItems;
    if (options?.q) {
      const q = options.q.trim().toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.stockSymbol.toLowerCase().includes(q) ||
          i.companyName.toLowerCase().includes(q) ||
          i.headline.toLowerCase().includes(q) ||
          i.signals.some((s) => s.label.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = filtered.length;
    const unreadCount = total;

    // 7. Cursor Pagination
    let startIndex = 0;
    if (options?.cursor) {
      const cursorIndex = filtered.findIndex((i) => i.id === options.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const pagedItems = filtered.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < filtered.length;
    const nextCursor = hasMore && pagedItems.length > 0 ? pagedItems[pagedItems.length - 1].id : null;

    return {
      items: pagedItems,
      nextCursor,
      hasMore,
      total,
      unreadCount,
    };
  }

  /**
   * GET /feed/items/:id/details: Lazy-computed tab content
   */
  async getItemDetails(
    userId: string,
    eventId: string,
    tab?: 'happened' | 'why' | 'matters' | 'sources' | 'price' | 'alert' | 'all'
  ): Promise<FeedItemDetails | null> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { stock: true },
    });

    if (!event) return null;
    if (event.userId && event.userId !== userId) return null;

    const stock = event.stock;
    const delta = (event.metricsDelta as any) || {};
    const symbol = event.stockSymbol.toUpperCase();

    const [userReads, userSaves, watchlistEntries, userState] = await Promise.all([
      prisma.userEventRead.findMany({ where: { userId, eventId } }),
      prisma.userSavedEvent.findMany({ where: { userId, eventId } }),
      prisma.watchlistStock.findMany({
        where: { watchlist: { userId }, stockSymbol: symbol },
        select: { addedAt: true },
        orderBy: { addedAt: 'asc' },
        take: 1,
      }),
      prisma.userState.findUnique({ where: { userId } }),
    ]);

    const isUnread = userReads.length === 0;
    const isSaved = userSaves.length > 0;
    const lastSessionAt = userState?.previousSessionEndedAt || userState?.previousSessionAt || new Date(0);
    const isNew = new Date(event.occurredAt || event.occurredOn || event.timestamp).getTime() > lastSessionAt.getTime();

    const changePercent = typeof delta.changePercent === 'number' ? delta.changePercent : stock?.changePercent ? Number(stock.changePercent) : 0;
    const eventPrice = typeof delta.price === 'number' ? delta.price : typeof delta.eventPrice === 'number' ? delta.eventPrice : null;
    const currentPrice = stock?.currentPrice ? Number(stock.currentPrice) : eventPrice;
    const volumeRatio = typeof delta.volumeRatio === 'number' ? delta.volumeRatio : 1.0;

    const item: FeedItem = {
      id: event.id,
      stockSymbol: symbol,
      companyName: stock?.companyName || symbol,
      exchange: stock?.exchange || 'NSE',
      currency: stock?.currency || '₹',
      date: event.timestamp.toISOString(),
      occurredOn: event.occurredOn ? event.occurredOn.toISOString() : null,
      occurredAt: event.occurredAt ? event.occurredAt.toISOString() : (event.occurredOn ? event.occurredOn.toISOString() : event.timestamp.toISOString()),
      periodStart: event.periodStart ? event.periodStart.toISOString() : null,
      detectedAt: event.detectedAt ? event.detectedAt.toISOString() : event.timestamp.toISOString(),
      isCumulative: Boolean(delta.isCumulativeReturnEvent),
      eventType: event.eventType,
      priority: event.priority,
      priorityLabel: this.mapPriorityToLabel(event.priority),
      isUnread,
      isSaved,
      isNew,
      isAlertTriggered: false,
      isDemo: isEventDemo(event),
      changePercent,
      eventPrice,
      currentPrice,
      dayChangePercent: stock?.changePercent ? Number(stock.changePercent) : null,
      signals: [{ type: event.eventType, label: this.getSignalLabel(event.eventType, changePercent, volumeRatio) }],
      extraSignalsCount: 0,
      headline: this.generateHeadline(stock?.companyName || symbol, event.eventType, changePercent, volumeRatio, Boolean(delta.isCumulativeReturnEvent), delta),
      memberEventIds: [event.id],
    };

    const high52w = stock?.high52w ? Number(stock.high52w) : null;
    const low52w = stock?.low52w ? Number(stock.low52w) : null;
    const happened: FeedDetailsHappened = {
      movePercent: changePercent,
      priceAtEvent: eventPrice,
      currentPrice,
      priceDelta: eventPrice && currentPrice ? parseFloat((currentPrice - eventPrice).toFixed(2)) : 0,
      dayOpen: delta.dayOpen ? Number(delta.dayOpen) : null,
      dayHigh: delta.dayHigh ? Number(delta.dayHigh) : null,
      dayLow: delta.dayLow ? Number(delta.dayLow) : null,
      dayClose: delta.dayClose ? Number(delta.dayClose) : eventPrice,
      volume: delta.volume ? Number(delta.volume) : stock?.volume ? Number(stock.volume) : null,
      avgVolume20D: delta.avgVolume20D ? Number(delta.avgVolume20D) : stock?.avgVolume20D ? Number(stock.avgVolume20D) : null,
      volumeRatio,
      high52w,
      low52w,
      is52wHigh: Boolean(event.eventType === 'FIFTY_TWO_WEEK_HIGH' || (high52w && currentPrice && currentPrice >= high52w * 0.995)),
      is52wLow: Boolean(event.eventType === 'FIFTY_TWO_WEEK_LOW' || (low52w && currentPrice && currentPrice <= low52w * 1.005)),
      eventTimestamp: event.timestamp.toISOString(),
      occurredOn: event.occurredOn ? event.occurredOn.toISOString() : null,
      occurredAt: event.occurredAt ? event.occurredAt.toISOString() : (event.occurredOn ? event.occurredOn.toISOString() : event.timestamp.toISOString()),
      periodStart: event.periodStart ? event.periodStart.toISOString() : null,
      detectedAt: event.detectedAt ? event.detectedAt.toISOString() : event.timestamp.toISOString(),
      isCumulative: Boolean(delta.isCumulativeReturnEvent),
    };

    const evidenceList: EvidenceItem[] = await evidenceAggregator.gatherEvidence(event, stock);
    const enrichment = delta.enrichment || (await contextEnrichmentService.enrichEvent(event, stock));

    const sources: FeedDetailsSourceItem[] = evidenceList.map((e) => ({
      publisher: e.source,
      title: e.title,
      publishedAt: e.publishedAt,
      url: e.url,
      sourceType: e.sourceType,
    }));

    const hasEvidence = evidenceList.length > 0;
    let confidenceLevel: 'High' | 'Medium' | 'Low' = 'Low';
    const confScore = hasEvidence ? (enrichment.confidenceScore || 40) : 20;
    if (confScore >= 70 && hasEvidence) confidenceLevel = 'High';
    else if (confScore >= 40 && hasEvidence) confidenceLevel = 'Medium';
    else confidenceLevel = 'Low';

    const why: FeedDetailsWhy = {
      cause: hasEvidence ? enrichment.summary : 'No confirmed cause found',
      confidenceScore: confScore,
      confidenceLevel,
      confidenceReason:
        hasEvidence
          ? `Backed by ${evidenceList.length} verified news & regulatory disclosures within the event window.`
          : 'Low confidence: No qualifying external corporate filings or confirmed news reports found for this move.',
      possibleDrivers: enrichment.possibleDrivers || [],
    };

    const dirWord = changePercent >= 0 ? 'gain' : 'decline';
    const mattersSummary = `${stock?.companyName || symbol} recorded a ${Math.abs(changePercent).toFixed(1)}% ${dirWord} with ${volumeRatio.toFixed(1)}x typical 20-day volume.`;
    const bulletPoints = [
      `Volume confirmation: ${volumeRatio >= 1.5 ? 'Significant institutional activity detected' : 'Within normal trading volume variance'}.`,
      high52w && low52w ? `Current price (${stock?.currency || '₹'}${currentPrice?.toFixed(2)}) is positioned within the 52-week channel [${low52w.toFixed(2)} - ${high52w.toFixed(2)}].` : 'Historical 52-week channel is stable.',
    ];
    if (evidenceList.length > 0) {
      bulletPoints.push(`Catalyst attribution: ${evidenceList[0].source} reported "${evidenceList[0].title.slice(0, 80)}".`);
    }

    const matters: FeedDetailsMatters = {
      summary: mattersSummary,
      bulletPoints,
    };

    const marketProvider = ProviderFactory.getMarketDataProvider();
    const bars = await marketProvider.getHistoricalBars(symbol, 30);
    const series1M: FeedDetailsPriceSeries[] = bars.map((b) => ({
      timestamp: b.timestamp.toISOString(),
      price: b.close,
      volume: b.volume,
    }));
    const series1W = series1M.slice(-7);
    const series1D = series1M.slice(-2);

    const price: FeedDetailsPrice = {
      series1D,
      series1W,
      series1M,
      eventMarkerTimestamp: event.timestamp.toISOString(),
    };

    const alert = await prisma.alert.findFirst({
      where: {
        userId,
        stockSymbol: symbol,
        isActive: true,
      },
    });

    const alertPayload: FeedDetailsAlert | null = alert
      ? {
          hasUserAlert: true,
          alertType: alert.alertType,
          threshold: alert.targetValue ? Number(alert.targetValue) : undefined,
          triggeredAt: alert.updatedAt.toISOString(),
        }
      : null;

    return {
      id: event.id,
      item,
      happened,
      why,
      matters,
      sources,
      price,
      alert: alertPayload,
    };
  }

  /**
   * GET /feed/summary: High-level summary sentence, unified counts, and freshness
   */
  async getSummary(
    userId: string,
    options?: { window?: 'toReview' | 'sinceLastVisit' | '24h' | '7d' | '30d' }
  ): Promise<FeedSummary> {
    const selectedWindow = options?.window || 'toReview';
    const { hasPreviousSession, lastSessionAt, userState, visitInfo } = await this.resolveUserSessionBoundary(userId);

    const daysSinceLastVisit = hasPreviousSession
      ? Math.max(1, Math.round((Date.now() - lastSessionAt.getTime()) / (24 * 60 * 60 * 1000)))
      : 0;

    const [counts, selectedFeed] = await Promise.all([
      this.getFeedCounts(userId),
      this.getFeed(userId, { window: selectedWindow as any, limit: 1000 }),
    ]);

    const items = selectedFeed.items;
    const criticalCount = items.filter((i) => i.priority === 'CRITICAL').length;
    const highCount = items.filter((i) => i.priority === 'HIGH').length;
    const mediumCount = items.filter((i) => i.priority === 'MEDIUM').length;
    const lowCount = items.filter((i) => i.priority === 'LOW').length;
    const needAttentionCount = criticalCount + highCount;

    const uniqueStocksCount = new Set(items.map((i) => i.stockSymbol)).size;

    let headline = '';
    if (selectedWindow === 'sinceLastVisit') {
      headline = `Since your last visit: ${items.length} unhandled updates across ${uniqueStocksCount} stocks · ${needAttentionCount} need attention`;
    } else if (selectedWindow === '24h') {
      headline = `Last 24 hours: ${items.length} unhandled updates across ${uniqueStocksCount} stocks · ${needAttentionCount} need attention`;
    } else if (selectedWindow === '7d') {
      headline = `Last 7 days: ${items.length} unhandled updates across ${uniqueStocksCount} stocks · ${needAttentionCount} need attention`;
    } else {
      headline = `To review: ${counts.toReview} unhandled updates across ${uniqueStocksCount} stocks · ${needAttentionCount} need attention`;
    }

    const lastStock = await prisma.stock.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    const lastSyncedAt = lastStock?.updatedAt?.toISOString() || new Date().toISOString();
    const minutesAgo = Math.round((Date.now() - new Date(lastSyncedAt).getTime()) / 60000);
    const dataFreshness = minutesAgo <= 1 ? 'Prices updated just now' : `Prices updated ${minutesAgo} min ago`;

    return {
      unreadClusters: items.length,
      totalInWindow: items.length,
      needAttentionCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      daysSinceLastVisit,
      lastVisitAt: visitInfo?.hasBoundary && visitInfo.feedBoundaryAt ? visitInfo.feedBoundaryAt.toISOString() : null,
      headline,
      dataFreshness,
      lastSyncedAt,
      isDelayed: true,
      delayNotice: 'Delayed ~15 min (NSE)',
      windowCounts: counts.windowCounts,
      marketsClosed: items.length === 0,
      marketsClosedInWindow: visitInfo?.marketsClosedInWindow ?? false,
      exchangeStatus: visitInfo?.exchangeStatus,
      hasBoundary: visitInfo?.hasBoundary ?? false,
      feedBoundaryAt: visitInfo?.feedBoundaryAt ? visitInfo.feedBoundaryAt.toISOString() : null,
      lastVisitEndedAt: visitInfo?.lastVisitEndedAt ? visitInfo.lastVisitEndedAt.toISOString() : null,
      endReason: visitInfo?.endReason,
      endReasonExplanation: visitInfo?.endReasonExplanation,
      timeAwayFormatted: visitInfo?.timeAwayFormatted,
      isFirstSession: visitInfo?.isFirstSession ?? false,
      previousSessionStartedAt: userState?.previousSessionStartedAt?.toISOString() || null,
      previousSessionEndReason: userState?.previousSessionEndReason || 'logout',
      serverNow: new Date().toISOString(),
    };
  }

  /**
   * POST /feed/mark-read: Mark item(s) or window as read with count safety check and undoToken
   */
  async markRead(
    userId: string,
    options?:
      | string[]
      | {
          eventIds?: string[];
          filter?: string;
          expectedCount?: number;
          readSource?: string;
        }
  ): Promise<{ success: boolean; count: number; undoToken: string }> {
    const { monitoredSymbols, watchedSinceMap } = await this.resolveUserWatchlistScope(userId);
    if (monitoredSymbols.length === 0) {
      return { success: true, count: 0, undoToken: '' };
    }

    const opts = Array.isArray(options) ? { eventIds: options } : options;
    let idsToMark: string[] = [];

    if (opts?.eventIds && opts.eventIds.length > 0) {
      // Expand cluster member events for the requested event IDs
      const targetEvents = await prisma.event.findMany({
        where: {
          id: { in: opts.eventIds },
          stockSymbol: { in: monitoredSymbols },
          AND: [{ OR: [{ userId: null }, { userId }] }],
        },
        select: { id: true, stockSymbol: true, timestamp: true, occurredAt: true, occurredOn: true },
      });

      const allIds = new Set<string>(targetEvents.map((t) => t.id));
      for (const ev of targetEvents) {
        const evDate = new Date(ev.occurredAt || ev.occurredOn || ev.timestamp);
        const startOfDay = new Date(evDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(evDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const siblingEvents = await prisma.event.findMany({
          where: {
            stockSymbol: ev.stockSymbol,
            AND: [{ OR: [{ userId: null }, { userId }] }],
            OR: [
              { occurredAt: { gte: startOfDay, lte: endOfDay } },
              { AND: [{ occurredAt: null }, { occurredOn: { gte: startOfDay, lte: endOfDay } }] },
              { AND: [{ occurredAt: null }, { occurredOn: null }, { timestamp: { gte: startOfDay, lte: endOfDay } }] },
            ],
          },
          select: { id: true },
        });
        siblingEvents.forEach((s) => allIds.add(s.id));
      }
      idsToMark = Array.from(allIds);
    } else {
      // Mark all unhandled events matching the window / filter
      const feedResult = await this.getFeed(userId, { window: (opts?.filter as any) || 'toReview', limit: 1000 });
      const allClusterMemberIds: string[] = [];
      feedResult.items.forEach((item) => {
        allClusterMemberIds.push(...item.memberEventIds);
      });
      idsToMark = Array.from(new Set(allClusterMemberIds));
    }

    // Safety guard: if expectedCount provided, enforce +/- 2 tolerance
    if (typeof opts?.expectedCount === 'number') {
      const diff = Math.abs(idsToMark.length - opts.expectedCount);
      if (diff > 2) {
        const error: any = new Error(
          `Count mismatch: Expected ~${opts.expectedCount} events to mark read, but found ${idsToMark.length}. Action rejected for data safety.`
        );
        error.statusCode = 400;
        error.code = 'COUNT_MISMATCH';
        error.currentCount = idsToMark.length;
        throw error;
      }
    }

    if (idsToMark.length === 0) {
      return { success: true, count: 0, undoToken: '' };
    }

    const readSource = opts?.readSource || (opts?.eventIds ? 'manual' : 'bulk');

    await prisma.userEventRead.createMany({
      data: idsToMark.map((id) => ({
        userId,
        eventId: id,
        readAt: new Date(),
        readSource,
      })),
      skipDuplicates: true,
    });

    const undoToken = undoStore.createUndoToken(userId, 'mark_read', idsToMark);

    return { success: true, count: idsToMark.length, undoToken };
  }

  /**
   * POST /feed/items/:id/save: Idempotent save event (leaves feed -> Memory Saved)
   */
  async saveItem(userId: string, eventId: string): Promise<{ isSaved: boolean; undoToken: string }> {
    const { monitoredSymbols } = await this.resolveUserWatchlistScope(userId);
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        AND: [{ OR: [{ userId: null }, { userId }] }],
      },
      include: { stock: true },
    });

    if (!event || !monitoredSymbols.includes(event.stockSymbol)) {
      const error: any = new Error('Event not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    await prisma.userSavedEvent.upsert({
      where: {
        userId_eventId: { userId, eventId },
      },
      create: {
        userId,
        eventId,
        savedAt: new Date(),
        priceAtSave: event.stock?.currentPrice || null,
      },
      update: {
        savedAt: new Date(),
      },
    });

    const undoToken = undoStore.createUndoToken(userId, 'save', [eventId]);
    return { isSaved: true, undoToken };
  }

  /**
   * Toggle save status (backward compatibility alias)
   */
  async toggleSave(userId: string, eventId: string): Promise<{ isSaved: boolean; undoToken?: string }> {
    const existing = await prisma.userSavedEvent.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (existing) {
      const res = await this.unsaveItem(userId, eventId);
      return { isSaved: res.isSaved, undoToken: res.undoToken };
    } else {
      const res = await this.saveItem(userId, eventId);
      return { isSaved: res.isSaved, undoToken: res.undoToken };
    }
  }

  /**
   * POST /feed/items/:id/unsave: Remove from saved
   */
  async unsaveItem(userId: string, eventId: string): Promise<{ isSaved: boolean; isInFeed: boolean; undoToken: string }> {
    await prisma.userSavedEvent.deleteMany({
      where: { userId, eventId },
    });

    const isRead = await prisma.userEventRead.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    const undoToken = undoStore.createUndoToken(userId, 'unsave', [eventId]);
    return { isSaved: false, isInFeed: !isRead, undoToken };
  }

  /**
   * POST /feed/items/:id/delete: Soft delete item into user_event_deletes with 30d expiry
   */
  async deleteItem(userId: string, eventId: string): Promise<{ deleted: boolean; count: number; undoToken: string }> {
    const { monitoredSymbols } = await this.resolveUserWatchlistScope(userId);
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        AND: [{ OR: [{ userId: null }, { userId }] }],
      },
    });

    if (!event) {
      const error: any = new Error('Event not found');
      error.statusCode = 404;
      throw error;
    }

    const isMonitored = monitoredSymbols.includes(event.stockSymbol);
    if (!isMonitored) {
      const [hasRead, hasSaved] = await Promise.all([
        prisma.userEventRead.findFirst({ where: { userId, eventId } }),
        prisma.userSavedEvent.findFirst({ where: { userId, eventId } }),
      ]);
      if (!hasRead && !hasSaved) {
        const error: any = new Error('Unauthorized');
        error.statusCode = 403;
        throw error;
      }
    }

    // Expand cluster member events for the requested event ID
    const evDate = new Date(event.occurredAt || event.occurredOn || event.timestamp);
    const startOfDay = new Date(evDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(evDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const siblingEvents = await prisma.event.findMany({
      where: {
        stockSymbol: event.stockSymbol,
        AND: [{ OR: [{ userId: null }, { userId }] }],
        OR: [
          { occurredAt: { gte: startOfDay, lte: endOfDay } },
          { AND: [{ occurredAt: null }, { occurredOn: { gte: startOfDay, lte: endOfDay } }] },
          { AND: [{ occurredAt: null }, { occurredOn: null }, { timestamp: { gte: startOfDay, lte: endOfDay } }] },
        ],
      },
      select: { id: true },
    });

    const targetIds = Array.from(new Set([eventId, ...siblingEvents.map((s) => s.id)]));
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [existingReads, existingSaves] = await Promise.all([
      prisma.userEventRead.findMany({ where: { userId, eventId: { in: targetIds } }, select: { eventId: true } }),
      prisma.userSavedEvent.findMany({ where: { userId, eventId: { in: targetIds } }, select: { eventId: true } }),
    ]);

    await Promise.all([
      prisma.userEventRead.deleteMany({ where: { userId, eventId: { in: targetIds } } }),
      prisma.userSavedEvent.deleteMany({ where: { userId, eventId: { in: targetIds } } }),
      prisma.userEventDelete.createMany({
        data: targetIds.map((id) => ({
          userId,
          eventId: id,
          expiresAt,
        })),
        skipDuplicates: true,
      }),
    ]);

    const undoToken = undoStore.createUndoToken(userId, 'delete', targetIds, {
      wasReadIds: existingReads.map((r) => r.eventId),
      wasSavedIds: existingSaves.map((s) => s.eventId),
    });

    return { deleted: true, count: targetIds.length, undoToken };
  }

  /**
   * POST /feed/items/:id/restore: Restores event to unhandled Attention Feed
   */
  async restoreItem(userId: string, eventId: string): Promise<{ restored: boolean; undoToken: string }> {
    const [existingRead, existingSaved, existingDelete] = await Promise.all([
      prisma.userEventRead.findUnique({ where: { userId_eventId: { userId, eventId } } }),
      prisma.userSavedEvent.findUnique({ where: { userId_eventId: { userId, eventId } } }),
      prisma.userEventDelete.findUnique({ where: { userId_eventId: { userId, eventId } } }),
    ]);

    await Promise.all([
      prisma.userEventRead.deleteMany({ where: { userId, eventId } }),
      prisma.userSavedEvent.deleteMany({ where: { userId, eventId } }),
      prisma.userEventDelete.deleteMany({ where: { userId, eventId } }),
    ]);

    const undoToken = undoStore.createUndoToken(userId, 'restore', [eventId], {
      wasReadIds: existingRead ? [eventId] : [],
      wasSavedIds: existingSaved ? [eventId] : [],
      wasDeletedIds: existingDelete ? [eventId] : [],
    });

    return { restored: true, undoToken };
  }

  /**
   * POST /feed/undo: Reverses a recent action using valid undoToken
   */
  async undoAction(userId: string, undoToken: string): Promise<{ undone: boolean; action: string; count: number }> {
    const entry = undoStore.consumeUndoToken(undoToken, userId);
    if (!entry) {
      const error: any = new Error('Undo token expired or invalid');
      error.statusCode = 400;
      throw error;
    }

    switch (entry.action) {
      case 'mark_read':
      case 'caught_up': {
        await prisma.userEventRead.deleteMany({
          where: {
            userId,
            eventId: { in: entry.eventIds },
          },
        });
        if (entry.previousState?.previousLastSeenAt) {
          await prisma.userState.updateMany({
            where: { userId },
            data: {
              lastSeenAt: entry.previousState.previousLastSeenAt,
              previousSessionAt: entry.previousState.previousSessionAt,
            },
          });
        }
        break;
      }
      case 'save': {
        await prisma.userSavedEvent.deleteMany({
          where: {
            userId,
            eventId: { in: entry.eventIds },
          },
        });
        break;
      }
      case 'unsave': {
        await prisma.userSavedEvent.createMany({
          data: entry.eventIds.map((eventId) => ({
            userId,
            eventId,
            savedAt: new Date(),
          })),
          skipDuplicates: true,
        });
        break;
      }
      case 'delete': {
        await prisma.userEventDelete.deleteMany({
          where: {
            userId,
            eventId: { in: entry.eventIds },
          },
        });
        if (entry.previousState?.wasReadIds && entry.previousState.wasReadIds.length > 0) {
          await prisma.userEventRead.createMany({
            data: entry.previousState.wasReadIds.map((eventId) => ({
              userId,
              eventId,
              readAt: new Date(),
            })),
            skipDuplicates: true,
          });
        }
        if (entry.previousState?.wasSavedIds && entry.previousState.wasSavedIds.length > 0) {
          await prisma.userSavedEvent.createMany({
            data: entry.previousState.wasSavedIds.map((eventId) => ({
              userId,
              eventId,
              savedAt: new Date(),
            })),
            skipDuplicates: true,
          });
        }
        break;
      }
      case 'restore': {
        if (entry.previousState?.wasReadIds && entry.previousState.wasReadIds.length > 0) {
          await prisma.userEventRead.createMany({
            data: entry.previousState.wasReadIds.map((eventId) => ({
              userId,
              eventId,
              readAt: new Date(),
            })),
            skipDuplicates: true,
          });
        }
        if (entry.previousState?.wasSavedIds && entry.previousState.wasSavedIds.length > 0) {
          await prisma.userSavedEvent.createMany({
            data: entry.previousState.wasSavedIds.map((eventId) => ({
              userId,
              eventId,
              savedAt: new Date(),
            })),
            skipDuplicates: true,
          });
        }
        if (entry.previousState?.wasDeletedIds && entry.previousState.wasDeletedIds.length > 0) {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await prisma.userEventDelete.createMany({
            data: entry.previousState.wasDeletedIds.map((eventId) => ({
              userId,
              eventId,
              expiresAt,
            })),
            skipDuplicates: true,
          });
        }
        break;
      }
    }

    return { undone: true, action: entry.action, count: entry.eventIds.length };
  }

  /**
   * POST /feed/caught-up: Advances session cursor and marks all unhandled items read with undoToken
   */
  async markCaughtUp(userId: string, expectedCount?: number): Promise<{ success: boolean; count: number; undoToken: string }> {
    const userState = await prisma.userState.findUnique({ where: { userId } });
    const prevLastSeen = userState?.lastSeenAt;
    const prevSessionAt = userState?.previousSessionAt;

    const readResult = await this.markRead(userId, {
      filter: 'toReview',
      expectedCount,
      readSource: 'caught_up',
    });

    const now = new Date();
    await prisma.userState.upsert({
      where: { userId },
      create: {
        userId,
        previousSessionAt: now,
        lastSeenAt: now,
        lastActivityAt: now,
      },
      update: {
        previousSessionAt: now,
        lastSeenAt: now,
        lastActivityAt: now,
      },
    });

    const undoToken = undoStore.createUndoToken(
      userId,
      'caught_up',
      readResult.undoToken ? (undoStore.getUndoEntry(readResult.undoToken, userId)?.eventIds || []) : [],
      {
        previousLastSeenAt: prevLastSeen,
        previousSessionAt: prevSessionAt,
      }
    );

    return { success: true, count: readResult.count, undoToken };
  }
}

export const feedService = new FeedService();
