import { prisma } from '../config/prisma.js';
import { Priority } from '@prisma/client';

export interface DataFreshness {
  lastSyncedAt: string | null;
  isStale: boolean;
}

export interface SinceLastVisitSummary {
  awayDuration: string;
  awayDurationMs: number;
  lastActivityAt: string;
  newEventsCount: number;
  criticalEventsCount: number;
  watchlistEventsCount: number;
  watchlistCriticalCount: number;
  watchlistSymbols: string[];
  newEvents: any[];
  criticalEvents: any[];
  newInsights: any[];
  latestDigest: any | null;
  dataFreshness: DataFreshness;
}

export function computeUserSinceTimestamp(userState?: {
  previousSessionAt?: Date | null;
  lastSeenAt?: Date | null;
  lastLoginAt?: Date | null;
} | null): Date {
  const defaultSince = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  return (
    userState?.previousSessionAt ||
    userState?.lastSeenAt ||
    userState?.lastLoginAt ||
    defaultSince
  );
}

export async function computeDataFreshness(overrideStale = false): Promise<DataFreshness> {
  const lastSyncRun = await prisma.systemJobRun.findFirst({
    where: { jobName: 'syncStocksJob', status: 'SUCCESS' },
    orderBy: { completedAt: 'desc' },
  });

  const lastStock = await prisma.stock.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  });

  const lastSyncedDate = lastSyncRun?.completedAt || lastStock?.updatedAt || null;
  const lastSyncedAt = lastSyncedDate ? lastSyncedDate.toISOString() : null;

  if (overrideStale) {
    return { lastSyncedAt, isStale: true };
  }

  if (!lastSyncedDate) {
    return { lastSyncedAt: null, isStale: true };
  }

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
  const isMarketDay = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
  const hoursSinceSync = (now.getTime() - lastSyncedDate.getTime()) / (1000 * 60 * 60);

  let isStale = false;
  if (isMarketDay) {
    isStale = hoursSinceSync > 6;
  } else {
    isStale = hoursSinceSync > 72;
  }

  return { lastSyncedAt, isStale };
}

export class SinceLastVisitService {
  /**
   * Generates intelligence deltas that occurred since the user was last active,
   * prioritizing the user's tracked watchlist stocks.
   */
  async getIntelligenceSinceLastVisit(userId: string, overrideStale = false): Promise<SinceLastVisitSummary> {
    const dataFreshness = await computeDataFreshness(overrideStale);

    // 1. Resolve UserState
    const userState = await prisma.userState.findUnique({
      where: { userId },
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastLoginAt: true },
    });

    // 2. Resolve User's Watchlist Stocks
    const watchlistStocks = await prisma.watchlistStock.findMany({
      where: { watchlist: { userId } },
      select: { stockSymbol: true, isPinned: true },
    });
    const watchlistSymbols = new Set(watchlistStocks.map((w) => w.stockSymbol));
    const watchlistArray = Array.from(watchlistSymbols);

    const lastActivity = computeUserSinceTimestamp({
      previousSessionAt: userState?.previousSessionAt,
      lastSeenAt: userState?.lastSeenAt,
      lastLoginAt: userState?.lastLoginAt || user?.lastLoginAt,
    });

    // 3. Format away duration
    const elapsedMs = Math.max(0, Date.now() - lastActivity.getTime());
    const awayDuration = this.formatDuration(elapsedMs);

    // If user has NO stocks in their watchlist, return strictly empty intelligence
    if (watchlistArray.length === 0) {
      return {
        awayDuration,
        awayDurationMs: elapsedMs,
        lastActivityAt: lastActivity.toISOString(),
        newEventsCount: 0,
        criticalEventsCount: 0,
        watchlistEventsCount: 0,
        watchlistCriticalCount: 0,
        watchlistSymbols: [],
        newEvents: [],
        criticalEvents: [],
        newInsights: [],
        latestDigest: null,
        dataFreshness,
      };
    }

    // 4. Find events created while away strictly for user's tracked watchlist stocks
    const allowDemo = process.env.NODE_ENV === 'development' && process.env.SEED_DEMO_EVENTS === 'true';

    const rawEvents = await prisma.event.findMany({
      where: {
        stockSymbol: { in: watchlistArray },
        ...(allowDemo
          ? {}
          : {
              NOT: [
                { id: { startsWith: 'demo_' } },
                { id: { in: ['evt_001', 'evt_002', 'evt_003', 'evt_004'] } },
              ],
            }),
        OR: [
          { timestamp: { gte: lastActivity } },
          { createdAt: { gte: lastActivity } },
        ],
      },
      include: {
        stock: true,
        insights: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 25,
    });

    // Fetch user reads for accurate isolation
    const reads = await prisma.userEventRead.findMany({
      where: { userId },
      select: { eventId: true },
    });
    const readEventIds = new Set(reads.map((r) => r.eventId));

    // Map and tag events with inWatchlist and isolated read metadata
    const newEvents = rawEvents
      .filter((e) => {
        if (!allowDemo) {
          const delta = (e.metricsDelta as any) || {};
          if (e.id.startsWith('demo_') || e.id.startsWith('evt_00') || delta.isDemo === true) {
            return false;
          }
        }
        return true;
      })
      .map((e) => ({
        ...e,
        read: readEventIds.has(e.id),
        inWatchlist: true,
        isPinnedWatchlist: watchlistStocks.some((w) => w.stockSymbol === e.stockSymbol && w.isPinned),
      }))
      .sort((a, b) => {
        if (a.isPinnedWatchlist && !b.isPinnedWatchlist) return -1;
        if (!a.isPinnedWatchlist && b.isPinnedWatchlist) return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

    const criticalEvents = newEvents.filter(
      (e) => e.priority === Priority.CRITICAL || e.priority === Priority.HIGH
    );

    const watchlistEvents = newEvents;
    const watchlistCritical = criticalEvents;

    // 5. Find insights generated strictly for user's tracked watchlist stocks
    const rawInsights = await prisma.insight.findMany({
      where: {
        stockSymbol: { in: watchlistArray },
        ...(allowDemo
          ? {}
          : {
              NOT: [
                { id: { in: ['ins_001', 'ins_002', 'ins_003', 'ins_004'] } },
                { relatedEventId: { in: ['evt_001', 'evt_002', 'evt_003', 'evt_004'] } },
                { relatedEventId: { startsWith: 'demo_' } },
              ],
            }),
        OR: [
          { createdAt: { gte: lastActivity } },
          { event: { timestamp: { gte: lastActivity } } },
        ],
      },
      include: {
        event: {
          include: { stock: true },
        },
      },
      orderBy: { confidenceScore: 'desc' },
      take: 20,
    });

    const priorityWeights: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    // Sort candidates
    const sortedInsights = [...rawInsights].sort((a, b) => {
      const pA = a.event?.priority ? priorityWeights[a.event.priority] || 1 : 1;
      const pB = b.event?.priority ? priorityWeights[b.event.priority] || 1 : 1;
      if (pB !== pA) return pB - pA;

      const scoreA = Number((a.event?.metricsDelta as any)?.attentionScore ?? 0);
      const scoreB = Number((b.event?.metricsDelta as any)?.attentionScore ?? 0);
      if (scoreB !== scoreA) return scoreB - scoreA;

      const confA = Number(a.confidenceScore ?? 0);
      const confB = Number(b.confidenceScore ?? 0);
      if (confB !== confA) return confB - confA;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Limit to strictly ONE insight per stock symbol
    const seenSymbols = new Set<string>();
    const uniqueInsights: typeof rawInsights = [];
    for (const ins of sortedInsights) {
      if (!seenSymbols.has(ins.stockSymbol)) {
        seenSymbols.add(ins.stockSymbol);
        uniqueInsights.push(ins);
      }
    }

    const newInsights = uniqueInsights
      .map((ins) => ({
        ...ins,
        inWatchlist: true,
      }))
      .slice(0, 5);

    // 6. Fetch latest Market Memory Digest containing user's watchlist events
    const rawLatestDigest = await prisma.digest.findFirst({
      where: {
        digestEvents: {
          some: {
            event: {
              stockSymbol: { in: watchlistArray },
            },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      include: {
        digestEvents: {
          where: {
            event: {
              stockSymbol: { in: watchlistArray },
            },
          },
          include: { event: { include: { stock: true } } },
        },
        digestInsights: {
          where: {
            insight: {
              stockSymbol: { in: watchlistArray },
            },
          },
          include: { insight: true },
        },
      },
    });

    let latestDigest = null;
    if (rawLatestDigest) {
      latestDigest = {
        ...rawLatestDigest,
        hasWatchlistEvents: true,
        watchlistMatchedCount: rawLatestDigest.digestEvents.length,
      };
    }

    return {
      awayDuration,
      awayDurationMs: elapsedMs,
      lastActivityAt: lastActivity.toISOString(),
      newEventsCount: newEvents.length,
      criticalEventsCount: criticalEvents.length,
      watchlistEventsCount: watchlistEvents.length,
      watchlistCriticalCount: watchlistCritical.length,
      watchlistSymbols: watchlistArray,
      newEvents,
      criticalEvents,
      newInsights,
      latestDigest,
      dataFreshness,
    };
  }

  private formatDuration(ms: number): string {
    const minutes = Math.floor(ms / (60 * 1000));
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));

    if (days >= 1) {
      return days === 1 ? '1 day' : `${days} days`;
    }
    if (hours >= 1) {
      return hours === 1 ? '1 hour' : `${hours} hours`;
    }
    if (minutes >= 1) {
      return minutes === 1 ? '1 minute' : `${minutes} minutes`;
    }
    return 'Just now';
  }
}

export const sinceLastVisitService = new SinceLastVisitService();
