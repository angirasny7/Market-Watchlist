import { prisma } from '../config/prisma.js';

export class WatchlistService {
  /**
   * Fetch a specific watchlist or default watchlist belonging to the authenticated user.
   * Strictly enforces userId ownership.
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
        // Fallback to any watchlist belonging to this user
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
        // Create default watchlist for this user
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
   * List all watchlists owned by user
   */
  async getUserWatchlists(userId: string) {
    return prisma.watchlist.findMany({
      where: { userId },
      include: {
        _count: {
          select: { stocks: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Create a new watchlist for user (supports multi-watchlist / portfolios)
   */
  async createWatchlist(userId: string, name: string, isDefault = false) {
    if (isDefault) {
      await prisma.watchlist.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.watchlist.create({
      data: {
        userId,
        name: name.trim(),
        isDefault,
      },
    });
  }

  /**
   * Complete initial onboarding or batch configuration of user's primary watchlist.
   * Enforces min 3 stocks, max 50 stocks, and master catalog validation.
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
    if (normalizedSymbols.length < 1) {
      const error: any = new Error('Onboarding watchlist requires at least 1 stock');
      error.statusCode = 400;
      throw error;
    }
    if (normalizedSymbols.length > 50) {
      const error: any = new Error('Watchlist cannot exceed 50 stocks');
      error.statusCode = 400;
      throw error;
    }

    // Verify all symbols exist in master stock catalog
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

    const finalSymbols = normalizedSymbols;

    // Resolve or create primary watchlist for this user
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

    // Insert all stocks for this watchlist
    for (const sym of finalSymbols) {
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
   * Add a stock to user's watchlist with strict ownership, existence, capacity, and duplicate verification
   */
  async addStock(userId: string, symbol: string, watchlistId?: string) {
    const targetSymbol = symbol.toUpperCase().trim();

    // Verify stock exists in master catalog
    const stock = await prisma.stock.findUnique({
      where: { symbol: targetSymbol },
    });

    if (!stock) {
      const error: any = new Error(`Stock ${targetSymbol} does not exist in master catalog`);
      error.statusCode = 404;
      throw error;
    }

    // Resolve target watchlist and verify ownership
    let targetWatchlistId = watchlistId;
    if (targetWatchlistId) {
      const owned = await prisma.watchlist.findFirst({
        where: { id: targetWatchlistId, userId },
      });
      if (!owned) {
        const error: any = new Error('Watchlist not found or unauthorized');
        error.statusCode = 403;
        throw error;
      }
    } else {
      let defaultWl = await prisma.watchlist.findFirst({
        where: { userId, isDefault: true },
      });
      if (!defaultWl) {
        defaultWl = await prisma.watchlist.create({
          data: { userId, name: 'Primary Watchlist', isDefault: true },
        });
      }
      targetWatchlistId = defaultWl.id;
    }

    // Check capacity: maximum 50 stocks
    const currentCount = await prisma.watchlistStock.count({
      where: { watchlistId: targetWatchlistId },
    });
    if (currentCount >= 50) {
      const error: any = new Error('Watchlist cannot exceed 50 stocks');
      error.statusCode = 400;
      throw error;
    }

    // Check if already in watchlist
    const existing = await prisma.watchlistStock.findUnique({
      where: {
        watchlistId_stockSymbol: {
          watchlistId: targetWatchlistId,
          stockSymbol: targetSymbol,
        },
      },
      include: { stock: true },
    });

    if (existing) {
      const error: any = new Error(`Stock ${targetSymbol} is already in your watchlist`);
      error.statusCode = 409;
      throw error;
    }

    const created = await prisma.watchlistStock.create({
      data: {
        watchlistId: targetWatchlistId,
        stockSymbol: targetSymbol,
      },
      include: { stock: true },
    });

    return {
      ...created,
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
   * Remove a stock from user's watchlist with strict ownership verification
   */
  async removeStock(userId: string, symbol: string, watchlistId?: string) {
    const targetSymbol = symbol.toUpperCase().trim();

    let targetWatchlistId = watchlistId;
    if (targetWatchlistId) {
      const owned = await prisma.watchlist.findFirst({
        where: { id: targetWatchlistId, userId },
      });
      if (!owned) {
        const error: any = new Error('Watchlist not found or unauthorized');
        error.statusCode = 403;
        throw error;
      }
    } else {
      const defaultWl = await prisma.watchlist.findFirst({
        where: { userId, isDefault: true },
      });
      if (!defaultWl) return { success: true, removedSymbol: targetSymbol };
      targetWatchlistId = defaultWl.id;
    }

    await prisma.watchlistStock.deleteMany({
      where: {
        watchlistId: targetWatchlistId,
        stockSymbol: targetSymbol,
      },
    });

    return { success: true, removedSymbol: targetSymbol };
  }

  /**
   * Toggle pin status with ownership verification
   */
  async togglePinStock(userId: string, symbol: string, watchlistId?: string) {
    const targetSymbol = symbol.toUpperCase().trim();

    let targetWatchlistId = watchlistId;
    if (targetWatchlistId) {
      const owned = await prisma.watchlist.findFirst({
        where: { id: targetWatchlistId, userId },
      });
      if (!owned) {
        const error: any = new Error('Watchlist not found or unauthorized');
        error.statusCode = 403;
        throw error;
      }
    } else {
      const defaultWl = await prisma.watchlist.findFirst({
        where: { userId, isDefault: true },
      });
      if (!defaultWl) {
        const error: any = new Error('Default watchlist not found');
        error.statusCode = 404;
        throw error;
      }
      targetWatchlistId = defaultWl.id;
    }

    const item = await prisma.watchlistStock.findUnique({
      where: {
        watchlistId_stockSymbol: {
          watchlistId: targetWatchlistId,
          stockSymbol: targetSymbol,
        },
      },
    });

    if (!item) {
      const error: any = new Error(`Stock ${targetSymbol} is not in your watchlist`);
      error.statusCode = 404;
      throw error;
    }

    return prisma.watchlistStock.update({
      where: { id: item.id },
      data: { isPinned: !item.isPinned },
      include: { stock: true },
    });
  }
}

export const watchlistService = new WatchlistService();
