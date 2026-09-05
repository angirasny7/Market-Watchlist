import { prisma } from '../config/prisma.js';
import { EventType, MarketMood } from '@prisma/client';
import { getUserWatchlistSymbols } from '../utils/userOnboarding.js';

export interface MemoryQueryOptions {
  userId: string;
  memoryType?: 'ALL' | 'ARCHIVED' | 'SAVED' | string;
  dateRange?: string; // 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'SINCE_LAST_LOGIN' | 'CUSTOM'
  startDate?: string;
  endDate?: string;
  symbol?: string;
  watchlistOnly?: boolean;
  eventType?: string;
  marketMood?: string;
  search?: string;
  limit?: number;
}

export class MemoryService {
  /**
   * Retrieves events from the user's personal memory vault (Archived and/or Saved).
   * Unread, unhandled events are never returned here.
   */
  async getArchivedEvents(options: MemoryQueryOptions) {
    const { userId } = options;
    if (!userId) {
      throw new Error('User ID is required for accessing Market Memory');
    }

    const memoryType = (options.memoryType || 'ALL').toUpperCase();

    // 1. Date Range Filtering computation
    let start: Date | undefined;
    let end: Date | undefined;

    if (options.dateRange && options.dateRange !== 'ALL') {
      const now = new Date();

      switch (options.dateRange.toUpperCase()) {
        case 'TODAY':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
        case 'YESTERDAY':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
          break;
        case 'LAST_7_DAYS':
        case '7D':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'LAST_30_DAYS':
        case '30D':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'THIS_MONTH':
          start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          end = now;
          break;
        case 'SINCE_LAST_LOGIN': {
          const userState = await prisma.userState.findUnique({ where: { userId } });
          if (userState?.lastLoginAt) {
            start = userState.lastLoginAt;
            end = now;
          }
          break;
        }
        case 'CUSTOM':
          if (options.startDate) {
            start = new Date(options.startDate);
          }
          if (options.endDate) {
            end = new Date(options.endDate);
            if (options.endDate.length <= 10) {
              end.setHours(23, 59, 59, 999);
            }
          }
          break;
      }
    }

    // 2. Stock and Watchlist Filtering
    const eventFilter: any = {};

    if (options.watchlistOnly) {
      const watchlistSymbols = await getUserWatchlistSymbols(userId);
      if (watchlistSymbols.length === 0) {
        return [];
      }
      eventFilter.stockSymbol = { in: watchlistSymbols };
    }

    if (options.symbol && options.symbol.toUpperCase() !== 'ALL') {
      const sym = options.symbol.toUpperCase().trim();
      if (options.watchlistOnly && eventFilter.stockSymbol?.in) {
        if (!eventFilter.stockSymbol.in.includes(sym)) {
          return [];
        }
      }
      eventFilter.stockSymbol = sym;
    }

    // 3. Catalyst / Event Type Filtering
    if (options.eventType && options.eventType.toUpperCase() !== 'ALL') {
      let mappedType = options.eventType.toUpperCase();
      if (mappedType === '52_WEEK_HIGH') mappedType = 'FIFTY_TWO_WEEK_HIGH';
      if (mappedType === '52_WEEK_LOW') mappedType = 'FIFTY_TWO_WEEK_LOW';
      if (mappedType === 'PRICE_SPIKE') mappedType = 'PRICE_SURGE';
      if (mappedType === 'EARNINGS_RELEASE') mappedType = 'EARNINGS_BEAT';

      eventFilter.eventType = mappedType as EventType;
    }

    const includeEvent = {
      event: {
        include: {
          stock: true,
          insights: true,
          digestEvents: {
            include: {
              digest: true,
            },
            take: 1,
          },
        },
      },
    };

    const watchlistSymbols = new Set(await getUserWatchlistSymbols(userId));

    // 4. Fetch UserEventRead (Archived) if requested
    let archivedItems: any[] = [];
    if (memoryType === 'ALL' || memoryType === 'ARCHIVED') {
      const readWhere: any = { userId };
      if (start || end) {
        readWhere.readAt = {};
        if (start) readWhere.readAt.gte = start;
        if (end) readWhere.readAt.lte = end;
      }
      if (Object.keys(eventFilter).length > 0) {
        readWhere.event = eventFilter;
      }

      const reads = await prisma.userEventRead.findMany({
        where: readWhere,
        orderBy: { readAt: 'desc' },
        take: options.limit || 100,
        include: includeEvent,
      });

      archivedItems = reads.map((read) => {
        const e = read.event;
        const metrics = (e.metricsDelta as any) || {};

        let eventMood: MarketMood = MarketMood.NEUTRAL;
        const changePct = Number(e.stock.changePercent);
        if (changePct >= 1.5) eventMood = MarketMood.EXTREME_GREED;
        else if (changePct >= 0.3) eventMood = MarketMood.BULLISH;
        else if (changePct <= -1.5) eventMood = MarketMood.BEARISH;
        else if (changePct <= -0.3) eventMood = MarketMood.CHOPPY;

        const primaryInsight = e.insights[0];

        return {
          id: e.id,
          readId: read.id,
          readAt: read.readAt.toISOString(),
          memoryType: 'ARCHIVED' as const,
          stockSymbol: e.stockSymbol,
          companyName: e.stock.companyName,
          eventType: e.eventType,
          priority: e.priority,
          headline: metrics.headline || `${e.stock.companyName} ${e.eventType}`,
          whatHappened: metrics.whatHappened || metrics.summary || metrics.headline || '',
          price: Number(e.stock.currentPrice),
          changeAmount: Number(e.stock.changeAmount),
          changePercent: Number(e.stock.changePercent),
          timestamp: e.timestamp.toISOString(),
          read: true,
          acknowledged: e.acknowledged,
          inWatchlist: watchlistSymbols.has(e.stockSymbol),
          marketMood: read.event.digestEvents[0]?.digest?.marketMood || eventMood,
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
          primaryInsight: primaryInsight
            ? {
                ...primaryInsight,
                confidenceScore: Number(primaryInsight.confidenceScore),
              }
            : null,
        };
      });
    }

    // 5. Fetch UserSavedEvent (Saved) if requested
    let savedItems: any[] = [];
    if (memoryType === 'ALL' || memoryType === 'SAVED') {
      const saveWhere: any = { userId };
      if (start || end) {
        saveWhere.savedAt = {};
        if (start) saveWhere.savedAt.gte = start;
        if (end) saveWhere.savedAt.lte = end;
      }
      if (Object.keys(eventFilter).length > 0) {
        saveWhere.event = eventFilter;
      }

      const saves = await prisma.userSavedEvent.findMany({
        where: saveWhere,
        orderBy: { savedAt: 'desc' },
        take: options.limit || 100,
        include: includeEvent,
      });

      savedItems = saves.map((save) => {
        const e = save.event;
        const metrics = (e.metricsDelta as any) || {};

        let eventMood: MarketMood = MarketMood.NEUTRAL;
        const changePct = Number(e.stock.changePercent);
        if (changePct >= 1.5) eventMood = MarketMood.EXTREME_GREED;
        else if (changePct >= 0.3) eventMood = MarketMood.BULLISH;
        else if (changePct <= -1.5) eventMood = MarketMood.BEARISH;
        else if (changePct <= -0.3) eventMood = MarketMood.CHOPPY;

        const primaryInsight = e.insights[0];

        return {
          id: e.id,
          saveId: save.id,
          savedAt: save.savedAt.toISOString(),
          memoryType: 'SAVED' as const,
          stockSymbol: e.stockSymbol,
          companyName: e.stock.companyName,
          eventType: e.eventType,
          priority: e.priority,
          headline: metrics.headline || `${e.stock.companyName} ${e.eventType}`,
          whatHappened: metrics.whatHappened || metrics.summary || metrics.headline || '',
          price: Number(e.stock.currentPrice),
          changeAmount: Number(e.stock.changeAmount),
          changePercent: Number(e.stock.changePercent),
          timestamp: e.timestamp.toISOString(),
          read: false,
          acknowledged: true,
          inWatchlist: watchlistSymbols.has(e.stockSymbol),
          marketMood: save.event.digestEvents[0]?.digest?.marketMood || eventMood,
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
          primaryInsight: primaryInsight
            ? {
                ...primaryInsight,
                confidenceScore: Number(primaryInsight.confidenceScore),
              }
            : null,
        };
      });
    }

    // 6. Combine & Sort newest first
    let results = [...archivedItems, ...savedItems];

    // 7. Market Mood Filter
    if (options.marketMood && options.marketMood.toUpperCase() !== 'ALL') {
      const moodFilter = options.marketMood.toUpperCase();
      results = results.filter((item) => item.marketMood === moodFilter);
    }

    // 8. Search Query Filter
    if (options.search && options.search.trim() !== '') {
      const q = options.search.toLowerCase().trim();
      results = results.filter((item) => {
        const matchHeadline = item.headline.toLowerCase().includes(q);
        const matchSymbol = item.stockSymbol.toLowerCase().includes(q);
        const matchCompany = item.companyName.toLowerCase().includes(q);
        const matchWhatHappened = item.whatHappened.toLowerCase().includes(q);
        const matchInsight = item.insights.some(
          (ins: any) =>
            ins.headline?.toLowerCase().includes(q) ||
            ins.possibleExplanation?.toLowerCase().includes(q) ||
            ins.whyItMatters?.toLowerCase().includes(q)
        );

        return matchHeadline || matchSymbol || matchCompany || matchWhatHappened || matchInsight;
      });
    }

    // Sort newest first by their memory action timestamp
    results.sort((a, b) => {
      const timeA = new Date(a.savedAt || a.readAt || a.timestamp).getTime();
      const timeB = new Date(b.savedAt || b.readAt || b.timestamp).getTime();
      return timeB - timeA;
    });

    if (options.limit && results.length > options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Retrieves aggregated memory counters for the authenticated user
   */
  async getMemoryCounts(userId: string) {
    const [archivedCount, savedCount] = await Promise.all([
      prisma.userEventRead.count({ where: { userId } }),
      prisma.userSavedEvent.count({ where: { userId } }),
    ]);

    return {
      archivedCount,
      savedCount,
      totalCount: archivedCount + savedCount,
    };
  }

  /**
   * Retrieves historical digests scoped to authenticated user
   */
  async getArchivedDigests(options: { userId: string; search?: string; limit?: number }) {
    const watchlistSymbols = await getUserWatchlistSymbols(options.userId);
    if (watchlistSymbols.length === 0) {
      return [];
    }

    const where: any = {
      digestEvents: {
        some: {
          event: {
            stockSymbol: { in: watchlistSymbols },
          },
        },
      },
    };

    if (options.search && options.search.trim() !== '') {
      const q = options.search.trim();
      where.OR = [
        { headline: { contains: q, mode: 'insensitive' } },
        { executiveSummary: { contains: q, mode: 'insensitive' } },
      ];
    }

    const digests = await prisma.digest.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options.limit || 20,
      include: {
        digestEvents: {
          include: {
            event: {
              include: {
                stock: true,
              },
            },
          },
        },
        digestInsights: {
          include: {
            insight: true,
          },
        },
      },
    });

    return digests;
  }
}

export const memoryService = new MemoryService();
