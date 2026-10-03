import { PrismaClient, Priority, EventType, Stock, Event } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { isEventDemo } from './eventService.js';
import { contextEnrichmentService } from './contextEnrichmentService.js';
import { evidenceAggregator, EvidenceItem } from './evidenceAggregator.js';
import { ProviderFactory } from '../providers/providerFactory.js';

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
  isCumulative?: boolean;
  eventType?: EventType;
  priority: Priority;
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
  windowCounts?: {
    sinceLastVisit: number;
    '24h': number;
    '7d': number;
    '30d': number;
  };
  marketsClosed?: boolean;
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
    isCumulative: boolean
  ): string {
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
      default:
        return 'Market Event';
    }
  }

  /**
   * GET /feed: Light-weight clustered feed items with cursor pagination
   */
  async getFeed(
    userId: string,
    options?: {
      cursor?: string;
      limit?: number;
      window?: 'sinceLastVisit' | '24h' | '7d' | '30d';
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

    // 1. Fetch user monitored stocks
    let monitoredSymbols: string[] = [];
    if (options?.watchlistId && options.watchlistId !== 'all') {
      const ws = await prisma.watchlistStock.findMany({
        where: { watchlistId: options.watchlistId, watchlist: { userId } },
        select: { stockSymbol: true },
      });
      monitoredSymbols = ws.map((w) => w.stockSymbol);
    } else {
      const ws = await prisma.watchlistStock.findMany({
        where: { watchlist: { userId } },
        select: { stockSymbol: true },
      });
      monitoredSymbols = Array.from(new Set(ws.map((w) => w.stockSymbol)));
    }

    if (monitoredSymbols.length === 0) {
      return { items: [], nextCursor: null, hasMore: false, total: 0, unreadCount: 0 };
    }

    // Specific symbol filter check
    if (options?.symbol) {
      const sym = options.symbol.toUpperCase();
      if (!monitoredSymbols.includes(sym)) {
        return { items: [], nextCursor: null, hasMore: false, total: 0, unreadCount: 0 };
      }
      monitoredSymbols = [sym];
    }

    // 2. Resolve User State and Since Date
    const userState = await prisma.userState.findUnique({ where: { userId } });
    const hasPreviousSession = Boolean(
      userState?.previousSessionEndedAt ||
      userState?.previousSessionAt ||
      userState?.lastLogoutAt
    );

    // If user is brand new with no previous session, sinceLastVisit has 0 items
    if (options?.window === 'sinceLastVisit' && !hasPreviousSession) {
      return { items: [], nextCursor: null, hasMore: false, total: 0, unreadCount: 0 };
    }

    const lastSessionAt =
      userState?.previousSessionEndedAt ||
      userState?.previousSessionAt ||
      userState?.lastSeenAt ||
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

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
      default:
        windowStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // 3. User Read and Saved IDs
    const [userReads, userSaves, userAlerts] = await Promise.all([
      prisma.userEventRead.findMany({ where: { userId }, select: { eventId: true } }),
      prisma.userSavedEvent.findMany({ where: { userId }, select: { eventId: true } }),
      prisma.alert.findMany({ where: { userId, isActive: true }, select: { stockSymbol: true, alertType: true, targetValue: true } }),
    ]);

    const readEventIds = new Set(userReads.map((r) => r.eventId));
    const savedEventIds = new Set(userSaves.map((s) => s.eventId));
    const alertSymbols = new Set(userAlerts.map((a) => a.stockSymbol));

    // 4. Query Events for monitored symbols within window with multi-user isolation
    const whereClause: any = {
      stockSymbol: { in: monitoredSymbols },
      AND: [
        { OR: [{ userId: null }, { userId }] },
      ],
      OR: [
        { occurredAt: { gte: windowStartDate } },
        { AND: [{ occurredAt: null }, { occurredOn: { gte: windowStartDate } }] },
        { AND: [{ occurredAt: null }, { occurredOn: null }, { timestamp: { gte: windowStartDate } }] },
      ],
      ...(allowDemo
        ? {}
        : {
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

    const eligibleEvents = allowDemo ? dbEvents : dbEvents.filter((e) => !isEventDemo(e));

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

    // Priority ordering for picking top event
    const priorityWeight: Record<Priority, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    const feedItems: FeedItem[] = [];

    for (const [, memberEvents] of clusterMap.entries()) {
      // Sort member events: highest priority first, then most recent timestamp
      memberEvents.sort((a, b) => {
        const diff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        if (diff !== 0) return diff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      const topEv = memberEvents[0];
      const stock = topEv.stock;
      const delta = (topEv.metricsDelta as any) || {};

      const memberIds = memberEvents.map((m) => m.id);
      const isUnread = memberEvents.some((m) => !readEventIds.has(m.id));
      const isSaved = memberEvents.some((m) => savedEventIds.has(m.id));
      const isNew = new Date(topEv.timestamp).getTime() > lastSessionAt.getTime();
      const isAlertTriggered = alertSymbols.has(topEv.stockSymbol);

      const changePercent = typeof delta.changePercent === 'number' ? delta.changePercent : stock?.changePercent ? Number(stock.changePercent) : 0;
      const eventPrice = typeof delta.price === 'number' ? delta.price : typeof delta.eventPrice === 'number' ? delta.eventPrice : null;
      const currentPrice = stock?.currentPrice ? Number(stock.currentPrice) : eventPrice;
      const dayChangePercent = stock?.changePercent ? Number(stock.changePercent) : null;
      const volumeRatio = typeof delta.volumeRatio === 'number' ? delta.volumeRatio : 1.0;
      const isCumulative = Boolean(delta.isCumulativeReturnEvent);

      // Build unique signals for this daily cluster
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
        isCumulative
      );

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
        isCumulative,
        eventType: topEv.eventType,
        priority: topEv.priority,
        priorityLabel: this.mapPriorityToLabel(topEv.priority),
        isUnread,
        isSaved,
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

    // 6. Apply filters on clustered items
    let filtered = feedItems;

    if (options?.unreadOnly) {
      filtered = filtered.filter((i) => i.isUnread);
    }
    if (options?.savedOnly) {
      filtered = filtered.filter((i) => i.isSaved);
    }
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

    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = filtered.length;
    const unreadCount = feedItems.filter((i) => i.isUnread).length;

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

    // 1. Light item representation
    const userReads = await prisma.userEventRead.findMany({ where: { userId, eventId } });
    const userSaves = await prisma.userSavedEvent.findMany({ where: { userId, eventId } });
    const isUnread = userReads.length === 0;
    const isSaved = userSaves.length > 0;

    const userState = await prisma.userState.findUnique({ where: { userId } });
    const lastSessionAt = userState?.previousSessionAt || new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const isNew = new Date(event.timestamp).getTime() > lastSessionAt.getTime();

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
      headline: this.generateHeadline(stock?.companyName || symbol, event.eventType, changePercent, volumeRatio, Boolean(delta.isCumulativeReturnEvent)),
      memberEventIds: [event.id],
    };

    // 2. Tab "happened"
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

    // 3. Tab "why" & "sources"
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

    // 4. Tab "matters"
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

    // 5. Tab "price" series (Fetch from StockPriceHistory or MarketDataProvider)
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

    // 6. Tab "alert"
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
   * GET /feed/summary: High-level summary sentence, counts and freshness
   */
  async getSummary(
    userId: string,
    options?: { window?: 'sinceLastVisit' | '24h' | '7d' | '30d' }
  ): Promise<FeedSummary> {
    const selectedWindow = options?.window || 'sinceLastVisit';
    const userState = await prisma.userState.findUnique({ where: { userId } });
    const hasPreviousSession = Boolean(
      userState?.previousSessionEndedAt ||
      userState?.previousSessionAt ||
      userState?.lastLogoutAt
    );

    const lastSessionAt =
      userState?.previousSessionEndedAt ||
      userState?.previousSessionAt ||
      userState?.lastSeenAt ||
      userState?.lastLoginAt ||
      new Date();
    const daysSinceLastVisit = hasPreviousSession
      ? Math.max(1, Math.round((Date.now() - lastSessionAt.getTime()) / (24 * 60 * 60 * 1000)))
      : 0;

    // Fetch feed for the selected window as well as all windows
    const [selectedFeed, sinceFeed, feed24h, feed7d, feed30d] = await Promise.all([
      this.getFeed(userId, { window: selectedWindow, limit: 1000 }),
      this.getFeed(userId, { window: 'sinceLastVisit', limit: 1000 }),
      this.getFeed(userId, { window: '24h', limit: 1000 }),
      this.getFeed(userId, { window: '7d', limit: 1000 }),
      this.getFeed(userId, { window: '30d', limit: 1000 }),
    ]);

    const items = selectedFeed.items;
    const unreadClusters = items.filter((i) => i.isUnread).length;
    const totalInWindow = items.length;
    const criticalCount = items.filter((i) => i.priority === 'CRITICAL').length;
    const highCount = items.filter((i) => i.priority === 'HIGH').length;
    const mediumCount = items.filter((i) => i.priority === 'MEDIUM').length;
    const lowCount = items.filter((i) => i.priority === 'LOW').length;
    const needAttentionCount = criticalCount + highCount;

    const uniqueStocksCount = new Set(items.map((i) => i.stockSymbol)).size;

    // Check if markets were closed during this period (e.g. weekend with no trading price moves)
    const hasTradingMoves = items.some((i) =>
      i.signals.some((s) => s.type === 'PRICE_SURGE' || s.type === 'PRICE_DROP' || s.type === 'VOLUME_SPIKE')
    );
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
    const marketsClosed = items.length === 0 || (!hasTradingMoves && isWeekend);

    let headline = '';
    if (selectedWindow === 'sinceLastVisit') {
      headline = `Since your last visit: ${unreadClusters} updates across ${uniqueStocksCount} stocks · ${needAttentionCount} need attention`;
    } else if (selectedWindow === '24h') {
      headline = `Last 24 hours: ${totalInWindow} updates across ${uniqueStocksCount} stocks · ${needAttentionCount} need attention`;
    } else if (selectedWindow === '7d') {
      headline = `Last 7 days: ${totalInWindow} updates across ${uniqueStocksCount} stocks · ${needAttentionCount} need attention`;
    } else {
      headline = `Last 30 days: ${totalInWindow} updates across ${uniqueStocksCount} stocks · ${needAttentionCount} need attention`;
    }

    const lastStock = await prisma.stock.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    const lastSyncedAt = lastStock?.updatedAt?.toISOString() || new Date().toISOString();
    const minutesAgo = Math.round((Date.now() - new Date(lastSyncedAt).getTime()) / 60000);
    const dataFreshness = minutesAgo <= 1 ? 'Prices updated just now' : `Prices updated ${minutesAgo} min ago`;

    return {
      unreadClusters,
      totalInWindow,
      needAttentionCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      daysSinceLastVisit,
      lastVisitAt: lastSessionAt.toISOString(),
      headline,
      dataFreshness,
      lastSyncedAt,
      isDelayed: true,
      delayNotice: 'Delayed ~15 min (NSE)',
      windowCounts: {
        sinceLastVisit: sinceFeed.total,
        '24h': feed24h.total,
        '7d': feed7d.total,
        '30d': feed30d.total,
      },
      marketsClosed,
      previousSessionStartedAt: (userState as any)?.previousSessionStartedAt?.toISOString() || null,
      previousSessionEndReason: (userState as any)?.previousSessionEndReason || 'logout',
      serverNow: new Date().toISOString(),
    };
  }


  /**
   * POST /feed/mark-read: Mark item or all items read
   */
  async markRead(userId: string, eventIds?: string[]): Promise<{ count: number }> {
    let idsToMark = eventIds;

    if (!idsToMark || idsToMark.length === 0) {
      // Mark all monitored unread events in the 30-day window read
      const ws = await prisma.watchlistStock.findMany({
        where: { watchlist: { userId } },
        select: { stockSymbol: true },
      });
      const symbols = Array.from(new Set(ws.map((w) => w.stockSymbol)));
      const windowDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const unreadEvents = await prisma.event.findMany({
        where: {
          stockSymbol: { in: symbols },
          AND: [{ OR: [{ userId: null }, { userId }] }],
          timestamp: { gte: windowDate },
          userReads: { none: { userId } },
        },
        select: { id: true },
      });
      idsToMark = unreadEvents.map((e) => e.id);
    } else {
      // Expand cluster member events for the specified items (strictly accessible by user)
      const targetEvents = await prisma.event.findMany({
        where: {
          id: { in: idsToMark },
          AND: [{ OR: [{ userId: null }, { userId }] }],
        },
        select: { id: true, stockSymbol: true, timestamp: true },
      });

      const allIds = new Set<string>(targetEvents.map((t) => t.id));
      for (const ev of targetEvents) {
        const startOfDay = new Date(ev.timestamp);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(ev.timestamp);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const siblingEvents = await prisma.event.findMany({
          where: {
            stockSymbol: ev.stockSymbol,
            AND: [{ OR: [{ userId: null }, { userId }] }],
            timestamp: { gte: startOfDay, lte: endOfDay },
          },
          select: { id: true },
        });
        siblingEvents.forEach((s) => allIds.add(s.id));
      }
      idsToMark = Array.from(allIds);
    }

    if (idsToMark.length === 0) {
      return { count: 0 };
    }

    await prisma.userEventRead.createMany({
      data: idsToMark.map((id) => ({
        userId,
        eventId: id,
        readAt: new Date(),
      })),
      skipDuplicates: true,
    });

    return { count: idsToMark.length };
  }

  /**
   * POST /feed/caught-up: Update last session cursor and mark all current items read
   */
  async markCaughtUp(userId: string): Promise<{ success: boolean; unreadClusters: number }> {
    const now = new Date();

    // 1. Advance user state session timestamp
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

    // 2. Mark all current events read
    await this.markRead(userId);

    return { success: true, unreadClusters: 0 };
  }

  /**
   * POST /feed/items/:id/save: Toggle saved state
   */
  async toggleSave(userId: string, eventId: string): Promise<{ isSaved: boolean }> {
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        OR: [{ userId: null }, { userId }],
      },
    });

    if (!event) {
      const error: any = new Error('Event not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const existing = await prisma.userSavedEvent.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    if (existing) {
      await prisma.userSavedEvent.delete({
        where: {
          userId_eventId: { userId, eventId },
        },
      });
      return { isSaved: false };
    } else {
      await prisma.userSavedEvent.create({
        data: {
          userId,
          eventId,
          savedAt: new Date(),
        },
      });
      return { isSaved: true };
    }
  }
}

export const feedService = new FeedService();
