import { prisma } from '../config/prisma.js';
import { Priority } from '@prisma/client';

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
}

export class SinceLastVisitService {
  /**
   * Generates intelligence deltas that occurred since the user was last active,
   * prioritizing the user's tracked watchlist stocks.
   */
  async getIntelligenceSinceLastVisit(userId: string): Promise<SinceLastVisitSummary> {
    // 1. Resolve UserState
    const userState = await prisma.userState.findUnique({
      where: { userId },
    });

    // 2. Resolve User's Watchlist Stocks
    const watchlistStocks = await prisma.watchlistStock.findMany({
      where: { watchlist: { userId } },
      select: { stockSymbol: true, isPinned: true },
    });
    const watchlistSymbols = new Set(watchlistStocks.map((w) => w.stockSymbol));
    const watchlistArray = Array.from(watchlistSymbols);

    const defaultSince = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days default
    const lastActivity =
      userState?.previousSessionAt ||
      userState?.lastLogoutAt ||
      userState?.lastActivityAt ||
      defaultSince;

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
      };
    }

    // 4. Find events created while away strictly for user's tracked watchlist stocks
    let rawEvents = await prisma.event.findMany({
      where: {
        stockSymbol: { in: watchlistArray },
        createdAt: { gte: lastActivity },
      },
      include: {
        stock: true,
        insights: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 15,
    });

    if (rawEvents.length === 0) {
      rawEvents = await prisma.event.findMany({
        where: {
          stockSymbol: { in: watchlistArray },
        },
        include: {
          stock: true,
          insights: true,
        },
        orderBy: { timestamp: 'desc' },
        take: 8,
      });
    }

    // Fetch user reads for accurate isolation
    const reads = await prisma.userEventRead.findMany({
      where: { userId },
      select: { eventId: true },
    });
    const readEventIds = new Set(reads.map((r) => r.eventId));

    // Map and tag events with inWatchlist and isolated read metadata
    const newEvents = rawEvents
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
    let rawInsights = await prisma.insight.findMany({
      where: {
        stockSymbol: { in: watchlistArray },
        createdAt: { gte: lastActivity },
      },
      include: {
        event: {
          include: { stock: true },
        },
      },
      orderBy: { confidenceScore: 'desc' },
      take: 8,
    });

    if (rawInsights.length === 0) {
      rawInsights = await prisma.insight.findMany({
        where: {
          stockSymbol: { in: watchlistArray },
        },
        include: {
          event: {
            include: { stock: true },
          },
        },
        orderBy: { confidenceScore: 'desc' },
        take: 5,
      });
    }

    const newInsights = rawInsights
      .map((ins) => ({
        ...ins,
        inWatchlist: true,
      }))
      .sort((a, b) => Number(b.confidenceScore) - Number(a.confidenceScore));

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
