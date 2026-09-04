import { Priority, EventType } from '@prisma/client';
import { prisma } from '../config/prisma.js';

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

    if (options?.watchlistOnly) {
      if (userWatchlistSymbols.size > 0) {
        where.stockSymbol = { in: Array.from(userWatchlistSymbols) };
      } else {
        return []; // User has an empty watchlist, so no watchlist events exist
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

    // If unreadOnly is requested with a known user, filter out events already read by this user
    if (options?.unreadOnly && options?.userId) {
      where.userReads = {
        none: { userId: options.userId },
      };
    }

    // Filter events that occurred since user's last activity cursor
    if (options?.sinceLastVisit && options?.userId) {
      const userState = await prisma.userState.findUnique({
        where: { userId: options.userId },
      });
      if (userState?.lastActivityAt) {
        where.timestamp = { gte: userState.lastActivityAt };
      }
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options?.limit || 50,
      include: {
        stock: true,
        insights: true,
      },
    });

    const mapped = events.map((e) => {
      const isRead = options?.userId ? readEventIds.has(e.id) : Boolean(e.read);
      return {
        ...e,
        read: isRead,
        inWatchlist: userWatchlistSymbols.has(e.stockSymbol),
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
    });

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
   * Mark all events as read for specific authenticated user
   */
  async markAllRead(userId?: string) {
    if (userId) {
      // Find all events not yet read by this user
      const unreadEvents = await prisma.event.findMany({
        where: {
          userReads: {
            none: { userId },
          },
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
        data: { lastActivityAt: new Date() },
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
    }

    return prisma.event.update({
      where: { id },
      data: { acknowledged: true, read: true },
    });
  }
}

export const eventService = new EventService();
