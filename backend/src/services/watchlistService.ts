import { prisma } from '../config/prisma.js';
import { computeDataFreshness } from './sinceLastVisitService.js';
import { attentionScoringService } from './attentionScoringService.js';
import { corporateEventService } from './corporateEventService.js';

export interface WatchlistStockOverviewItem {
  symbol: string;
  companyName: string;
  sector: string;
  exchange: string;
  currency: string;
  currentPrice: number;
  changeAmount: number;
  changePercent: number;
  isPinned: boolean;
  addedAt: string;
  attentionLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  attentionScore: number;
  unseenUpdatesCount: number;
  nextEvent: { type: string; date: string; label: string } | null;
  activeAlertCount: number;
  sparkline: number[];
  watchlistIds: string[];
}

export interface WatchlistOverviewSummary {
  totalStocks: number;
  needAttention: number;
  upcomingEvents: number;
  activeAlerts: number;
  unseenUpdates: number;
}

export interface WatchlistOverviewResponse {
  watchlist?: {
    id: string;
    name: string;
    isDefault: boolean;
  };
  stocks: WatchlistStockOverviewItem[];
  summary: WatchlistOverviewSummary;
  dataFreshness: {
    lastSyncedAt: string | null;
    isStale: boolean;
  };
}

/**
 * Extracts or generates a normalized array of price numbers for sparkline rendering.
 */
function extractSparklineNumbers(
  stock: any,
  range: '1D' | '1W' | '1M' = '1D'
): number[] {
  const currentPrice = Number(stock.currentPrice);
  const changePercent = Number(stock.changePercent || 0);
  const rawSparkline = stock.sparkline;

  let basePoints: number[] = [];
  if (Array.isArray(rawSparkline) && rawSparkline.length > 0) {
    basePoints = rawSparkline
      .map((item: any) => (typeof item === 'number' ? item : Number(item.price ?? currentPrice)))
      .filter((num: number) => !isNaN(num) && num > 0);
  }

  if (range === '1D') {
    // 8 points representing today's move from open to current price
    const openPrice = currentPrice / (1 + changePercent / 100);
    const count = 8;
    const points: number[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const wave = Math.sin(t * Math.PI) * 0.003 * currentPrice;
      const p = openPrice + (currentPrice - openPrice) * t + (i === count - 1 ? 0 : wave);
      points.push(Number(p.toFixed(2)));
    }
    return points;
  }

  if (range === '1W') {
    if (basePoints.length >= 7) {
      return basePoints.slice(-7);
    }
    const startPrice = currentPrice / (1 + changePercent / 100);
    const points: number[] = [];
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const wave = Math.sin(i * 1.5) * 0.008 * currentPrice;
      const p = startPrice + (currentPrice - startPrice) * t + (i === 6 ? 0 : wave);
      points.push(Number(p.toFixed(2)));
    }
    return points;
  }

  // 1M (monthly trajectory: ~22 trading sessions)
  const startPrice30D = currentPrice / (1 + (changePercent * 2.2) / 100);
  const count = 22;
  const points: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const wave = Math.sin(i * 0.7) * 0.012 * currentPrice;
    const p = startPrice30D + (currentPrice - startPrice30D) * t + (i === count - 1 ? 0 : wave);
    points.push(Number(p.toFixed(2)));
  }
  return points;
}

export class WatchlistService {
  /**
   * List all watchlists owned by user with stockCount.
   * If the user has no watchlists, creates the initial default watchlist.
   */
  async getUserWatchlists(userId: string) {
    let watchlists = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        _count: {
          select: { stocks: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    if (watchlists.length === 0) {
      const defaultWl = await prisma.watchlist.create({
        data: {
          userId,
          name: 'Primary Watchlist',
          isDefault: true,
        },
        include: {
          _count: {
            select: { stocks: true },
          },
        },
      });
      watchlists = [defaultWl];
    }

    return watchlists.map((w) => ({
      id: w.id,
      name: w.name,
      isDefault: w.isDefault,
      stockCount: w._count.stocks,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));
  }

  /**
   * Create a new watchlist for user.
   * Validates name (1-40 chars trimmed), max 10 watchlists per user, case-insensitive unique name.
   */
  async createWatchlist(userId: string, rawName: string) {
    const name = (rawName || '').trim();
    if (!name || name.length < 1 || name.length > 40) {
      const error: any = new Error('Watchlist name must be between 1 and 40 characters');
      error.statusCode = 400;
      throw error;
    }

    const count = await prisma.watchlist.count({ where: { userId } });
    if (count >= 10) {
      const error: any = new Error('Maximum of 10 watchlists allowed per user');
      error.statusCode = 400;
      throw error;
    }

    const existing = await prisma.watchlist.findMany({ where: { userId } });
    const duplicate = existing.some(
      (w) => w.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      const error: any = new Error(`A watchlist named "${name}" already exists`);
      error.statusCode = 400;
      throw error;
    }

    const created = await prisma.watchlist.create({
      data: {
        userId,
        name,
        isDefault: count === 0,
      },
      include: {
        _count: { select: { stocks: true } },
      },
    });

    return {
      id: created.id,
      name: created.name,
      isDefault: created.isDefault,
      stockCount: created._count.stocks,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  /**
   * Rename an existing watchlist.
   * Validates name (1-40 chars trimmed), ownership, and case-insensitive uniqueness.
   */
  async renameWatchlist(userId: string, watchlistId: string, rawName: string) {
    const name = (rawName || '').trim();
    if (!name || name.length < 1 || name.length > 40) {
      const error: any = new Error('Watchlist name must be between 1 and 40 characters');
      error.statusCode = 400;
      throw error;
    }

    const target = await prisma.watchlist.findFirst({
      where: { id: watchlistId, userId },
    });
    if (!target) {
      const error: any = new Error('Watchlist not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const otherWatchlists = await prisma.watchlist.findMany({
      where: { userId, id: { not: watchlistId } },
    });
    const duplicate = otherWatchlists.some(
      (w) => w.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      const error: any = new Error(`A watchlist named "${name}" already exists`);
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.watchlist.update({
      where: { id: watchlistId },
      data: { name },
      include: {
        _count: { select: { stocks: true } },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      isDefault: updated.isDefault,
      stockCount: updated._count.stocks,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete a watchlist.
   * Default watchlist cannot be deleted; cannot delete if it's the only watchlist.
   */
  async deleteWatchlist(userId: string, watchlistId: string) {
    const target = await prisma.watchlist.findFirst({
      where: { id: watchlistId, userId },
    });
    if (!target) {
      const error: any = new Error('Watchlist not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    if (target.isDefault) {
      const error: any = new Error('The default watchlist cannot be deleted');
      error.statusCode = 400;
      throw error;
    }

    const count = await prisma.watchlist.count({ where: { userId } });
    if (count <= 1) {
      const error: any = new Error('Cannot delete your only watchlist');
      error.statusCode = 400;
      throw error;
    }

    await prisma.watchlist.delete({
      where: { id: watchlistId },
    });

    return { success: true, message: 'Watchlist deleted successfully' };
  }

  /**
   * Add a stock to a specific watchlist with max 50 capacity and duplicate validation.
   */
  async addStockToWatchlist(userId: string, watchlistId: string, rawSymbol: string) {
    const symbol = (rawSymbol || '').toUpperCase().trim();
    if (!symbol) {
      const error: any = new Error('Stock symbol is required');
      error.statusCode = 400;
      throw error;
    }

    const watchlist = await prisma.watchlist.findFirst({
      where: { id: watchlistId, userId },
    });
    if (!watchlist) {
      const error: any = new Error('Watchlist not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const stock = await prisma.stock.findUnique({
      where: { symbol },
    });
    if (!stock) {
      const error: any = new Error(`Stock ${symbol} does not exist in master catalog`);
      error.statusCode = 404;
      throw error;
    }

    const currentCount = await prisma.watchlistStock.count({
      where: { watchlistId },
    });
    if (currentCount >= 50) {
      const error: any = new Error('Watchlist cannot exceed 50 stocks');
      error.statusCode = 400;
      throw error;
    }

    const existing = await prisma.watchlistStock.findUnique({
      where: {
        watchlistId_stockSymbol: {
          watchlistId,
          stockSymbol: symbol,
        },
      },
    });
    if (existing) {
      const error: any = new Error(`Stock ${symbol} is already in this watchlist`);
      error.statusCode = 409;
      throw error;
    }

    const created = await prisma.watchlistStock.create({
      data: {
        watchlistId,
        stockSymbol: symbol,
      },
      include: { stock: true },
    });

    return {
      id: created.id,
      watchlistId: created.watchlistId,
      stockSymbol: created.stockSymbol,
      isPinned: created.isPinned,
      addedAt: created.addedAt,
      stock: {
        ...created.stock,
        currentPrice: Number(created.stock.currentPrice),
        changeAmount: Number(created.stock.changeAmount),
        changePercent: Number(created.stock.changePercent),
        volume: Number(created.stock.volume),
        avgVolume20D: Number(created.stock.avgVolume20D),
        peRatio: created.stock.peRatio ? Number(created.stock.peRatio) : null,
        high52w: Number(created.stock.high52w),
        low52w: Number(created.stock.low52w),
      },
    };
  }

  /**
   * Remove a stock from a specific watchlist.
   */
  async removeStockFromWatchlist(userId: string, watchlistId: string, rawSymbol: string) {
    const symbol = (rawSymbol || '').toUpperCase().trim();
    const watchlist = await prisma.watchlist.findFirst({
      where: { id: watchlistId, userId },
    });
    if (!watchlist) {
      const error: any = new Error('Watchlist not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    await prisma.watchlistStock.deleteMany({
      where: { watchlistId, stockSymbol: symbol },
    });

    return { success: true, removedSymbol: symbol, watchlistId };
  }

  /**
   * Toggle pin status for a stock in a specific watchlist.
   */
  async togglePinInWatchlist(userId: string, watchlistId: string, rawSymbol: string) {
    const symbol = (rawSymbol || '').toUpperCase().trim();
    const watchlist = await prisma.watchlist.findFirst({
      where: { id: watchlistId, userId },
    });
    if (!watchlist) {
      const error: any = new Error('Watchlist not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const item = await prisma.watchlistStock.findUnique({
      where: {
        watchlistId_stockSymbol: {
          watchlistId,
          stockSymbol: symbol,
        },
      },
    });
    if (!item) {
      const error: any = new Error(`Stock ${symbol} is not in this watchlist`);
      error.statusCode = 404;
      throw error;
    }

    return prisma.watchlistStock.update({
      where: { id: item.id },
      data: { isPinned: !item.isPinned },
      include: { stock: true },
    });
  }

  /**
   * Aggregated Watchlist Overview endpoint
   * Supports specific watchlist (:id) or union across all watchlists ('all').
   * Evaluates attention level & score from highest unread event, unseen counts,
   * sparklines, summary, and data freshness in one call using grouped queries.
   */
  async getOverview(
    userId: string,
    targetId: string | 'all',
    range: '1D' | '1W' | '1M' = '1D'
  ): Promise<WatchlistOverviewResponse> {
    const isAll = targetId === 'all';
    let targetWatchlist: any = null;

    if (!isAll) {
      targetWatchlist = await prisma.watchlist.findFirst({
        where: { id: targetId, userId },
      });
      if (!targetWatchlist) {
        const error: any = new Error('Watchlist not found or unauthorized access');
        error.statusCode = 404;
        throw error;
      }
    }

    // 1. Fetch user's all watchlist-stock mappings in one query
    const allUserWatchlistStocks = await prisma.watchlistStock.findMany({
      where: { watchlist: { userId } },
      include: { stock: true },
      orderBy: { addedAt: 'desc' },
    });

    // Build symbol -> watchlistIds mapping
    const symbolToWatchlistIds = new Map<string, string[]>();
    for (const ws of allUserWatchlistStocks) {
      const list = symbolToWatchlistIds.get(ws.stockSymbol) || [];
      list.push(ws.watchlistId);
      symbolToWatchlistIds.set(ws.stockSymbol, list);
    }

    // Filter relevant watchlist stocks for this view
    const relevantStocks = isAll
      ? allUserWatchlistStocks
      : allUserWatchlistStocks.filter((ws) => ws.watchlistId === targetId);

    // De-duplicate by symbol
    const stockMap = new Map<string, any>();
    const isPinnedMap = new Map<string, boolean>();
    const addedAtMap = new Map<string, Date>();

    for (const ws of relevantStocks) {
      if (!stockMap.has(ws.stockSymbol)) {
        stockMap.set(ws.stockSymbol, ws.stock);
        isPinnedMap.set(ws.stockSymbol, ws.isPinned);
        addedAtMap.set(ws.stockSymbol, ws.addedAt);
      } else {
        if (ws.isPinned) {
          isPinnedMap.set(ws.stockSymbol, true);
        }
      }
    }

    const distinctSymbols = Array.from(stockMap.keys());

    // 2. Grouped query: unread events for these symbols for this user
    let unreadEvents: any[] = [];
    if (distinctSymbols.length > 0) {
      unreadEvents = await prisma.event.findMany({
        where: {
          stockSymbol: { in: distinctSymbols },
          userReads: { none: { userId } },
        },
        select: {
          id: true,
          stockSymbol: true,
          priority: true,
          metricsDelta: true,
          timestamp: true,
        },
        orderBy: { timestamp: 'desc' },
      });
    }

    const unreadEventsBySymbol = new Map<string, any[]>();
    for (const ev of unreadEvents) {
      const list = unreadEventsBySymbol.get(ev.stockSymbol) || [];
      list.push(ev);
      unreadEventsBySymbol.set(ev.stockSymbol, list);
    }

    // 3. Grouped queries: active alerts and upcoming corporate events
    let activeAlertsBySymbol = new Map<string, number>();
    let upcomingEventsMap = new Map<string, { type: string; date: string; label: string; daysAway: number }>();

    if (distinctSymbols.length > 0) {
      const alertCounts = await prisma.alert.groupBy({
        by: ['stockSymbol'],
        where: {
          userId,
          isActive: true,
          stockSymbol: { in: distinctSymbols },
        },
        _count: { id: true },
      });
      for (const a of alertCounts) {
        activeAlertsBySymbol.set(a.stockSymbol, a._count.id);
      }

      upcomingEventsMap = await corporateEventService.getEarliestUpcomingEventsBySymbol(distinctSymbols);
    }

    const totalUserActiveAlerts = await prisma.alert.count({
      where: { userId, isActive: true },
    });

    // 4. Assemble stock items
    // Attention thresholds aligned with attentionScoringService.ts:
    // CRITICAL: >= 75
    // HIGH: >= 55
    // MEDIUM: >= 35
    // LOW: < 35 (or 0 when no unread events)
    const stockItems: WatchlistStockOverviewItem[] = [];

    for (const symbol of distinctSymbols) {
      const stock = stockMap.get(symbol);
      const stockUnreadEvents = unreadEventsBySymbol.get(symbol) || [];
      const unseenUpdatesCount = stockUnreadEvents.length;

      let maxScore = 0;
      for (const ev of stockUnreadEvents) {
        const delta = (ev.metricsDelta as any) || {};
        let score = typeof delta.attentionScore === 'number' ? delta.attentionScore : 0;
        if (!score) {
          if (ev.priority === 'CRITICAL') score = 80;
          else if (ev.priority === 'HIGH') score = 65;
          else if (ev.priority === 'MEDIUM') score = 45;
          else score = 20;
        }
        if (score > maxScore) maxScore = score;
      }

      let attentionLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (maxScore >= 75) attentionLevel = 'CRITICAL';
      else if (maxScore >= 55) attentionLevel = 'HIGH';
      else if (maxScore >= 35) attentionLevel = 'MEDIUM';
      else attentionLevel = 'LOW';

      const sparklineNumbers = extractSparklineNumbers(stock, range);
      const isPinned = isPinnedMap.get(symbol) || false;
      const addedAt = addedAtMap.get(symbol) || new Date();
      const nextEv = upcomingEventsMap.get(symbol);
      const activeAlertCount = activeAlertsBySymbol.get(symbol) || 0;

      stockItems.push({
        symbol,
        companyName: stock.companyName,
        sector: stock.sector,
        exchange: stock.exchange,
        currency: stock.currency || '₹',
        currentPrice: Number(stock.currentPrice),
        changeAmount: Number(stock.changeAmount),
        changePercent: Number(stock.changePercent),
        isPinned,
        addedAt: addedAt.toISOString(),
        attentionLevel,
        attentionScore: maxScore,
        unseenUpdatesCount,
        nextEvent: nextEv ? { type: nextEv.type, date: nextEv.date, label: nextEv.label } : null,
        activeAlertCount,
        sparkline: sparklineNumbers,
        watchlistIds: symbolToWatchlistIds.get(symbol) || [],
      });
    }

    // Sort: pinned first, then by attention score descending
    stockItems.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.attentionScore - a.attentionScore;
    });

    // 5. Compute aggregate summary
    const summary: WatchlistOverviewSummary = {
      totalStocks: stockItems.length,
      needAttention: stockItems.filter(
        (s) => s.attentionLevel === 'CRITICAL' || s.attentionLevel === 'HIGH'
      ).length,
      upcomingEvents: stockItems.filter((s) => s.nextEvent !== null).length,
      activeAlerts: totalUserActiveAlerts,
      unseenUpdates: stockItems.reduce((acc, s) => acc + s.unseenUpdatesCount, 0),
    };

    const dataFreshness = await computeDataFreshness();

    return {
      watchlist: targetWatchlist
        ? {
            id: targetWatchlist.id,
            name: targetWatchlist.name,
            isDefault: targetWatchlist.isDefault,
          }
        : undefined,
      stocks: stockItems,
      summary,
      dataFreshness,
    };
  }

  // =========================================================================
  // Legacy methods (operating on default watchlist so existing flows don't break)
  // =========================================================================

  /**
   * Fetch specific or default watchlist (Legacy API support).
   */
  async getWatchlist(userId: string, watchlistId?: string) {
    let watchlist;

    if (watchlistId) {
      watchlist = await prisma.watchlist.findFirst({
        where: { id: watchlistId, userId },
        include: {
          stocks: {
            include: {
              stock: {
                include: {
                  events: {
                    take: 1,
                    orderBy: { timestamp: 'desc' },
                  },
                },
              },
            },
            orderBy: { addedAt: 'desc' },
          },
        },
      });

      if (!watchlist) {
        const error: any = new Error('Watchlist not found or unauthorized access');
        error.statusCode = 404;
        throw error;
      }
    } else {
      watchlist = await prisma.watchlist.findFirst({
        where: { userId, isDefault: true },
        include: {
          stocks: {
            include: {
              stock: {
                include: {
                  events: {
                    take: 1,
                    orderBy: { timestamp: 'desc' },
                  },
                },
              },
            },
            orderBy: { addedAt: 'desc' },
          },
        },
      });

      if (!watchlist) {
        watchlist = await prisma.watchlist.findFirst({
          where: { userId },
          include: {
            stocks: {
              include: {
                stock: {
                  include: {
                    events: { take: 1, orderBy: { timestamp: 'desc' } },
                  },
                },
              },
              orderBy: { addedAt: 'desc' },
            },
          },
        });
      }

      if (!watchlist) {
        watchlist = await prisma.watchlist.create({
          data: {
            userId,
            name: 'Primary Watchlist',
            isDefault: true,
          },
          include: {
            stocks: {
              include: {
                stock: {
                  include: {
                    events: { take: 1, orderBy: { timestamp: 'desc' } },
                  },
                },
              },
            },
          },
        });
      }
    }

    return {
      ...watchlist,
      stocks: watchlist.stocks.map((ws) => ({
        id: ws.id,
        watchlistId: ws.watchlistId,
        stockSymbol: ws.stockSymbol,
        isPinned: ws.isPinned,
        addedAt: ws.addedAt,
        stock: {
          ...ws.stock,
          currentPrice: Number(ws.stock.currentPrice),
          changeAmount: Number(ws.stock.changeAmount),
          changePercent: Number(ws.stock.changePercent),
          volume: Number(ws.stock.volume),
          avgVolume20D: Number(ws.stock.avgVolume20D),
          peRatio: ws.stock.peRatio ? Number(ws.stock.peRatio) : null,
          high52w: Number(ws.stock.high52w),
          low52w: Number(ws.stock.low52w),
        },
      })),
    };
  }

  /**
   * Batch setup watchlist (used during onboarding).
   */
  async setupWatchlist(userId: string, data: { name?: string; symbols: string[] }) {
    const rawSymbols = Array.isArray(data.symbols) ? data.symbols : [];
    if (rawSymbols.length < 1) {
      const error: any = new Error('Onboarding watchlist requires at least 1 stock');
      error.statusCode = 400;
      throw error;
    }
    if (rawSymbols.length > 50) {
      const error: any = new Error('Watchlist cannot exceed 50 stocks');
      error.statusCode = 400;
      throw error;
    }

    const normalizedSymbols = Array.from(new Set(rawSymbols.map((s) => s.trim().toUpperCase())));

    const validStocks = await prisma.stock.findMany({
      where: { symbol: { in: normalizedSymbols } },
      select: { symbol: true },
    });
    const validSet = new Set(validStocks.map((s) => s.symbol));
    const invalidSymbols = normalizedSymbols.filter((s) => !validSet.has(s));

    if (invalidSymbols.length > 0) {
      const error: any = new Error(
        `Invalid symbol(s) detected not in master catalog: ${invalidSymbols.join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }

    let defaultWl = await prisma.watchlist.findFirst({
      where: { userId, isDefault: true },
    });

    if (!defaultWl) {
      defaultWl = await prisma.watchlist.create({
        data: {
          userId,
          name: (data.name || 'Primary Watchlist').trim(),
          isDefault: true,
        },
      });
    } else if (data.name && data.name.trim() !== defaultWl.name) {
      defaultWl = await prisma.watchlist.update({
        where: { id: defaultWl.id },
        data: { name: data.name.trim() },
      });
    }

    for (const sym of normalizedSymbols) {
      await prisma.watchlistStock.upsert({
        where: {
          watchlistId_stockSymbol: {
            watchlistId: defaultWl.id,
            stockSymbol: sym,
          },
        },
        create: {
          watchlistId: defaultWl.id,
          stockSymbol: sym,
        },
        update: {},
      });
    }

    return this.getWatchlist(userId, defaultWl.id);
  }

  /**
   * Legacy addStock (delegates to default watchlist if no watchlistId).
   */
  async addStock(userId: string, symbol: string, watchlistId?: string) {
    let targetWlId = watchlistId;
    if (!targetWlId) {
      const defaultWl = await prisma.watchlist.findFirst({
        where: { userId, isDefault: true },
      });
      if (!defaultWl) {
        const created = await prisma.watchlist.create({
          data: { userId, name: 'Primary Watchlist', isDefault: true },
        });
        targetWlId = created.id;
      } else {
        targetWlId = defaultWl.id;
      }
    }
    return this.addStockToWatchlist(userId, targetWlId, symbol);
  }

  /**
   * Legacy removeStock (delegates to default watchlist if no watchlistId).
   */
  async removeStock(userId: string, symbol: string, watchlistId?: string) {
    let targetWlId = watchlistId;
    if (!targetWlId) {
      const defaultWl = await prisma.watchlist.findFirst({
        where: { userId, isDefault: true },
      });
      if (!defaultWl) return { success: true, removedSymbol: symbol };
      targetWlId = defaultWl.id;
    }
    return this.removeStockFromWatchlist(userId, targetWlId, symbol);
  }

  /**
   * Legacy togglePinStock (delegates to default watchlist if no watchlistId).
   */
  async togglePinStock(userId: string, symbol: string, watchlistId?: string) {
    let targetWlId = watchlistId;
    if (!targetWlId) {
      const defaultWl = await prisma.watchlist.findFirst({
        where: { userId, isDefault: true },
      });
      if (!defaultWl) {
        const error: any = new Error('Default watchlist not found');
        error.statusCode = 404;
        throw error;
      }
      targetWlId = defaultWl.id;
    }
    return this.togglePinInWatchlist(userId, targetWlId, symbol);
  }
}

export const watchlistService = new WatchlistService();
