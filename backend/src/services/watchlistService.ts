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
   * Add a stock to user's watchlist with strict ownership verification
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
      return {
        ...existing,
        stock: {
          ...existing.stock,
          currentPrice: Number(existing.stock.currentPrice),
          changeAmount: Number(existing.stock.changeAmount),
          changePercent: Number(existing.stock.changePercent),
          volume: Number(existing.stock.volume),
          avgVolume20D: Number(existing.stock.avgVolume20D),
          peRatio: existing.stock.peRatio ? Number(existing.stock.peRatio) : null,
          high52w: Number(existing.stock.high52w),
          low52w: Number(existing.stock.low52w),
        },
      };
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
