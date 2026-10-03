import { Priority, EventType } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { contextEnrichmentService } from './contextEnrichmentService.js';

export function isEventDemo(event: { id: string; stockSymbol?: string; stock?: any; metricsDelta?: any }): boolean {
  if (event.id.startsWith('demo_') || event.id.startsWith('evt_00')) return true;
  const delta = (event.metricsDelta as any) || {};
  if (delta.isDemo === true) return true;
  if (
    typeof delta.detectionReason === 'string' &&
    (delta.detectionReason.includes('Demo') || delta.detectionReason.includes('Demonstration'))
  ) {
    return true;
  }
  // Exclude legacy unadjusted / simulated catalog seeds
  const price = delta.price ?? delta.eventPrice;
  if (price && event.stockSymbol) {
    const sym = event.stockSymbol.toUpperCase();
    if (sym === 'RELIANCE' && price > 2000) return true;
    if (sym === 'TATAMOTORS' && price > 700) return true;
    if (sym === 'INFY' && price > 1600 && typeof delta.detectionReason === 'string' && delta.detectionReason.includes('87.7%')) return true;
    if (sym === 'TCS' && price > 3500) return true;
    if (sym === 'ABB' && price > 8000) return true;
    if (sym === 'SIEMENS' && price > 6000) return true;
    if (sym === 'GOOGL' && price < 200) return true;
    if (sym === 'TSLA' && price < 250) return true;
    if (sym === 'AMD' && price < 170) return true;
  }
  return false;
}

export class EventService {
  /**
   * Fetch market events with per-user read derivation and watchlist affinity
   */
  async getEvents(options?: {
    symbol?: string;
    priority?: Priority;
    eventType?: EventType;
    sinceLastVisit?: boolean;
    userId?: string;
    unreadOnly?: boolean;
    watchlistOnly?: boolean;
    limit?: number;
  }) {
    const where: any = {};
    const allowDemo = process.env.NODE_ENV === 'development' && process.env.SEED_DEMO_EVENTS === 'true';

    // Filter out demo events if not explicitly allowed in development
    if (!allowDemo) {
      where.NOT = [
        { id: { startsWith: 'demo_' } },
        { id: { in: ['evt_001', 'evt_002', 'evt_003', 'evt_004'] } },
      ];
    }

    let userWatchlistSymbols = new Set<string>();
    let readEventIds = new Set<string>();

    if (options?.userId) {
      // 1. Fetch user's watchlist symbols
      const userStocks = await prisma.watchlistStock.findMany({
        where: { watchlist: { userId: options.userId } },
        select: { stockSymbol: true },
      });
      userWatchlistSymbols = new Set(userStocks.map((s) => s.stockSymbol));

      // 2. Fetch user's read event IDs for multi-user isolation
      const reads = await prisma.userEventRead.findMany({
        where: { userId: options.userId },
        select: { eventId: true },
      });
      readEventIds = new Set(reads.map((r) => r.eventId));
    }

    if (options?.userId) {
      if (userWatchlistSymbols.size === 0) {
        return []; // User has an empty watchlist, so no events exist
      }
      if (options?.symbol) {
        const reqSym = options.symbol.toUpperCase();
        if (!userWatchlistSymbols.has(reqSym)) {
          return []; // Symbol not in user's watchlist
        }
        where.stockSymbol = reqSym;
      } else {
        where.stockSymbol = { in: Array.from(userWatchlistSymbols) };
      }
    } else if (options?.symbol) {
      where.stockSymbol = options.symbol.toUpperCase();
    }

    if (options?.priority) {
      where.priority = options.priority;
    }
    if (options?.eventType) {
      where.eventType = options.eventType;
    }

    // If unreadOnly is requested, filter out events already read by the user
    if (options?.unreadOnly && options?.userId) {
      where.userReads = {
        none: { userId: options.userId },
      };
    }

    // Filter events: either by user's sinceLastVisit cursor or by standard 30-day rolling window
    if (options?.sinceLastVisit && options?.userId) {
      const userState = await prisma.userState.findUnique({
        where: { userId: options.userId },
      });
      const defaultSince = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const since =
        userState?.previousSessionAt ||
        userState?.lastSeenAt ||
        userState?.lastLoginAt ||
        defaultSince;
      where.timestamp = { gte: since };
    } else {
      // Standard 30-day rolling window matching attention and overview logic
      const windowDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      where.timestamp = { gte: windowDate };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options?.limit || 1000,
      include: {
        stock: true,
        insights: true,
      },
    });

    const eligibleEvents = allowDemo
      ? events
      : events.filter((e) => !isEventDemo(e));

    // Calendar-day clustering by stockSymbol + calendarDay
    const clusterMap = new Map<string, typeof eligibleEvents>();
    for (const e of eligibleEvents) {
      const dayStr = new Date(e.timestamp).toISOString().split('T')[0];
      const key = `${e.stockSymbol}|${dayStr}`;
      const list = clusterMap.get(key) || [];
      list.push(e);
      clusterMap.set(key, list);
    }

    const deduplicatedEvents: typeof eligibleEvents = [];
    const clusterReadMap = new Map<string, boolean>();

    for (const [, evts] of clusterMap.entries()) {
      // Pick highest priority / most recent event as representative of the daily cluster
      evts.sort((a, b) => {
        const pOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const pDiff = (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
        if (pDiff !== 0) return pDiff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      const topEvent = evts[0];
      // A cluster is marked read only if ALL events in that cluster have been read
      const isClusterRead = options?.userId
        ? evts.every((ev) => readEventIds.has(ev.id))
        : evts.every((ev) => Boolean(ev.read));

      deduplicatedEvents.push(topEvent);
      clusterReadMap.set(topEvent.id, isClusterRead);
    }

    const mapped = await Promise.all(
      deduplicatedEvents.map(async (e) => {
        const isRead = clusterReadMap.get(e.id) ?? false;
        const delta = (e.metricsDelta as any) || {};

        let enrichment = delta.enrichment;
        if (!enrichment) {
          enrichment = await contextEnrichmentService.enrichEvent(e, e.stock);
        }

        return {
          ...e,
          read: isRead,
          isDemo: isEventDemo(e),
          inWatchlist: userWatchlistSymbols.has(e.stockSymbol),
          enrichment,
          stock: {
            ...e.stock,
            currentPrice: Number(e.stock.currentPrice),
            changeAmount: Number(e.stock.changeAmount),
            changePercent: Number(e.stock.changePercent),
            volume: Number(e.stock.volume),
            avgVolume20D: Number(e.stock.avgVolume20D),
            peRatio: e.stock.peRatio ? Number(e.stock.peRatio) : null,
            high52w: Number(e.stock.high52w),
            low52w: Number(e.stock.low52w),
          },
          insights: e.insights.map((ins) => ({
            ...ins,
            confidenceScore: Number(ins.confidenceScore),
          })),
        };
      })
    );

    // Sort so watchlist events surface first while preserving chronological recency
    return mapped.sort((a, b) => {
      if (a.inWatchlist && !b.inWatchlist) return -1;
      if (!a.inWatchlist && b.inWatchlist) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  async getEventsBySymbol(symbol: string, userId?: string) {
    return this.getEvents({ symbol, userId });
  }

  /**
   * Save event for later for specific authenticated user
   */
  async saveEventForLater(id: string, userId: string) {
    return prisma.userSavedEvent.upsert({
      where: {
        userId_eventId: { userId, eventId: id },
      },
      create: {
        userId,
        eventId: id,
      },
      update: {
        savedAt: new Date(),
      },
    });
  }

  /**
   * Mark event as read for specific authenticated user
   */
  async markEventRead(id: string, userId?: string) {
    if (userId) {
      return prisma.userEventRead.upsert({
        where: {
          userId_eventId: { userId, eventId: id },
        },
        create: {
          userId,
          eventId: id,
        },
        update: {
          readAt: new Date(),
        },
      });
    }

    return prisma.event.update({
      where: { id },
      data: { read: true },
    });
  }

  /**
   * Mark all active feed events as read for specific authenticated user
   */
  async markAllRead(userId?: string) {
    if (userId) {
      // Find all active unread events in user's monitored watchlist
      const userStocks = await prisma.watchlistStock.findMany({
        where: { watchlist: { userId } },
        select: { stockSymbol: true },
      });
      const symbols = Array.from(new Set(userStocks.map((s) => s.stockSymbol)));

      const windowDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const allowDemo = process.env.NODE_ENV === 'development' && process.env.SEED_DEMO_EVENTS === 'true';

      const unreadEvents = await prisma.event.findMany({
        where: {
          stockSymbol: { in: symbols },
          timestamp: { gte: windowDate },
          userReads: {
            none: { userId },
          },
          ...(allowDemo
            ? {}
            : {
                NOT: [
                  { id: { startsWith: 'demo_' } },
                  { id: { in: ['evt_001', 'evt_002', 'evt_003', 'evt_004'] } },
                ],
              }),
        },
        select: { id: true },
      });

      if (unreadEvents.length > 0) {
        await prisma.userEventRead.createMany({
          data: unreadEvents.map((e) => ({
            userId,
            eventId: e.id,
          })),
          skipDuplicates: true,
        });
      }

      await prisma.userState.updateMany({
        where: { userId },
        data: {
          lastActivityAt: new Date(),
          lastSeenAt: new Date(),
        },
      });

      return { count: unreadEvents.length };
    }

    return prisma.event.updateMany({
      where: { read: false },
      data: { read: true },
    });
  }

  /**
   * Acknowledge an event for specific authenticated user
   */
  async acknowledgeEvent(id: string, userId?: string) {
    if (userId) {
      await prisma.userEventRead.upsert({
        where: {
          userId_eventId: { userId, eventId: id },
        },
        create: { userId, eventId: id },
        update: { readAt: new Date() },
      });

      await prisma.userState.updateMany({
        where: { userId },
        data: {
          lastActivityAt: new Date(),
          lastSeenAt: new Date(),
        },
      });
    }

    return prisma.event.update({
      where: { id },
      data: { acknowledged: true, read: true },
    });
  }

  /**
   * Single source of truth for user's unread feed events count
   * Filters strictly: user's monitored watchlist stocks, active 30-day window, real events only, unread.
   */
  async getUnreadFeedCount(userId: string): Promise<number> {
    const userStocks = await prisma.watchlistStock.findMany({
      where: { watchlist: { userId } },
      select: { stockSymbol: true },
    });
    const symbols = Array.from(new Set(userStocks.map((s) => s.stockSymbol)));
    if (symbols.length === 0) return 0;

    const windowDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const allowDemo = process.env.NODE_ENV === 'development' && process.env.SEED_DEMO_EVENTS === 'true';

    const events = await prisma.event.findMany({
      where: {
        stockSymbol: { in: symbols },
        timestamp: { gte: windowDate },
        userReads: { none: { userId } },
        ...(allowDemo
          ? {}
          : {
              NOT: [
                { id: { startsWith: 'demo_' } },
                { id: { in: ['evt_001', 'evt_002', 'evt_003', 'evt_004'] } },
              ],
            }),
      },
      select: {
        id: true,
        stockSymbol: true,
        eventType: true,
        timestamp: true,
        metricsDelta: true,
      },
      orderBy: { timestamp: 'desc' },
    });

    const eligibleEvents = allowDemo ? events : events.filter((e) => !isEventDemo(e));

    // Standard Unit: Unread clusters (one per stock per calendar day)
    const unreadClusters = new Set<string>();
    for (const ev of eligibleEvents) {
      const dayStr = new Date(ev.timestamp).toISOString().split('T')[0];
      unreadClusters.add(`${ev.stockSymbol}|${dayStr}`);
    }

    return unreadClusters.size;
  }
}

export const eventService = new EventService();
