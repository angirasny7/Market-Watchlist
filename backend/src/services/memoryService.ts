import { prisma } from '../config/prisma.js';
import { Priority } from '@prisma/client';
import { undoStore } from '../utils/undoStore.js';

export type FeedPriorityLabel = 'Urgent' | 'Important' | 'Worth a look' | 'FYI';

export type MemoryTab = 'SAVED' | 'READ' | 'DELETED';

export interface MemoryItem {
  id: string; // eventId
  tab: MemoryTab;
  stockSymbol: string;
  companyName: string;
  exchange: string;
  currency: string;
  eventType: string;
  priority: Priority;
  priorityLabel: FeedPriorityLabel;
  meaningfulnessScore: number | null;
  headline: string;
  whatHappened: string;
  signals: Array<{ type: string; label: string }>;
  currentPrice: number | null;
  dayChangePercent: number | null;
  eventPrice: number | null;
  priceAtSave: number | null;
  priceChangeSinceSaved: number | null;
  note: string | null;
  savedAt: string | null;
  readAt: string | null;
  deletedAt: string | null;
  expiresAt: string | null;
  occurredAt: string;
  detectedAt: string;
  timestamp: string;
  source: string | null;
  sourceUrl: string | null;
  sourceTrustTier: string | null;
  sources: any[] | null;
  whyShown: string | null;
}

export interface MemoryQueryOptions {
  tab?: MemoryTab | 'ARCHIVED' | 'ALL';
  search?: string;
  stock?: string;
  watchlistId?: string;
  priority?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  dateFilterType?: 'eventDate' | 'actionDate';
  hasNote?: boolean;
  sortBy?: 'recent_action' | 'event_date_desc' | 'event_date_asc' | 'stock_name' | 'priority' | 'change_since_saved';
  cursor?: string;
  limit?: number;
}

export interface MemoryResponse {
  items: MemoryItem[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
  counts: {
    savedCount: number;
    readCount: number;
    deletedCount: number;
    totalCount: number;
  };
}

export class MemoryService {
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
   * Shared database event filter excluding hidden, demo, duplicate, simulated, or invalidated events
   */
  private getSharedEventFilter() {
    const allowDemo = process.env.NODE_ENV === 'development' && process.env.SEED_DEMO_EVENTS === 'true';
    return {
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
  }

  /**
   * Single source of truth for Memory counters.
   * Guaranteed: savedCount, readCount, deletedCount match list length.
   */
  async getMemoryCounts(userId: string): Promise<{
    savedCount: number;
    readCount: number;
    deletedCount: number;
    archivedCount: number;
    totalCount: number;
  }> {
    const eventFilter = this.getSharedEventFilter();

    const [savedCount, readCount, deletedCount] = await Promise.all([
      prisma.userSavedEvent.count({
        where: {
          userId,
          event: eventFilter,
        },
      }),
      prisma.userEventRead.count({
        where: {
          userId,
          readSource: { not: 'auto' },
          event: eventFilter,
        },
      }),
      prisma.userEventDelete.count({
        where: {
          userId,
          expiresAt: { gt: new Date() },
          event: eventFilter,
        },
      }),
    ]);

    return {
      savedCount,
      readCount,
      deletedCount,
      archivedCount: readCount,
      totalCount: savedCount + readCount,
    };
  }

  /**
   * Primary shared query engine for Market Memory
   */
  async getMemoryItems(userId: string, options?: MemoryQueryOptions): Promise<MemoryResponse> {
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    const tab: MemoryTab =
      options?.tab === 'READ' || options?.tab === 'ARCHIVED'
        ? 'READ'
        : options?.tab === 'DELETED'
        ? 'DELETED'
        : 'SAVED';

    const eventFilter = this.getSharedEventFilter();
    const counts = await this.getMemoryCounts(userId);

    // Resolve watchlist symbols filter if watchlistId is provided
    let allowedSymbols: string[] | undefined;
    if (options?.watchlistId && options.watchlistId !== 'all') {
      const ws = await prisma.watchlistStock.findMany({
        where: { watchlistId: options.watchlistId, watchlist: { userId } },
        select: { stockSymbol: true },
      });
      allowedSymbols = ws.map((w) => w.stockSymbol);
    }

    let rawItems: MemoryItem[] = [];

    if (tab === 'SAVED') {
      const saves = await prisma.userSavedEvent.findMany({
        where: {
          userId,
          event: eventFilter,
        },
        include: {
          event: {
            include: { stock: true },
          },
        },
        orderBy: { savedAt: 'desc' },
      });

      rawItems = saves.map((s) => {
        const ev = s.event;
        const stock = ev.stock;
        const delta = (ev.metricsDelta as any) || {};
        const priceAtSave = s.priceAtSave ? Number(s.priceAtSave) : null;
        const currentPrice = stock?.currentPrice ? Number(stock.currentPrice) : null;
        const priceChangeSinceSaved =
          priceAtSave && currentPrice ? parseFloat((((currentPrice - priceAtSave) / priceAtSave) * 100).toFixed(2)) : null;

        const changePercent = typeof delta.changePercent === 'number' ? delta.changePercent : stock?.changePercent ? Number(stock.changePercent) : 0;
        const volumeRatio = delta.volumeRatio || 1.0;

        return {
          id: ev.id,
          tab: 'SAVED',
          stockSymbol: ev.stockSymbol,
          companyName: stock?.companyName || ev.stockSymbol,
          exchange: stock?.exchange || 'NSE',
          currency: stock?.currency || '₹',
          eventType: ev.eventType,
          priority: ev.priority,
          priorityLabel: this.mapPriorityToLabel(ev.priority),
          meaningfulnessScore: ev.meaningfulnessScore,
          headline: delta.headline || delta.title || `${stock?.companyName || ev.stockSymbol} ${ev.eventType}`,
          whatHappened: ev.whyShown || delta.summary || delta.whatHappened || '',
          signals: [{ type: ev.eventType, label: `${ev.eventType} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)` }],
          currentPrice,
          dayChangePercent: stock?.changePercent ? Number(stock.changePercent) : null,
          eventPrice: delta.dayClose ? Number(delta.dayClose) : currentPrice,
          priceAtSave,
          priceChangeSinceSaved,
          note: s.note,
          savedAt: s.savedAt.toISOString(),
          readAt: null,
          deletedAt: null,
          expiresAt: null,
          occurredAt: (ev.occurredAt || ev.occurredOn || ev.timestamp).toISOString(),
          detectedAt: (ev.detectedAt || ev.timestamp).toISOString(),
          timestamp: ev.timestamp.toISOString(),
          source: ev.source,
          sourceUrl: ev.sourceUrl,
          sourceTrustTier: ev.sourceTrustTier,
          sources: (ev.sources as any[]) || null,
          whyShown: ev.whyShown,
        };
      });
    } else if (tab === 'READ') {
      const reads = await prisma.userEventRead.findMany({
        where: {
          userId,
          readSource: { not: 'auto' },
          event: eventFilter,
        },
        include: {
          event: {
            include: { stock: true },
          },
        },
        orderBy: { readAt: 'desc' },
      });

      rawItems = reads.map((r) => {
        const ev = r.event;
        const stock = ev.stock;
        const delta = (ev.metricsDelta as any) || {};
        const currentPrice = stock?.currentPrice ? Number(stock.currentPrice) : null;
        const changePercent = typeof delta.changePercent === 'number' ? delta.changePercent : stock?.changePercent ? Number(stock.changePercent) : 0;

        return {
          id: ev.id,
          tab: 'READ',
          stockSymbol: ev.stockSymbol,
          companyName: stock?.companyName || ev.stockSymbol,
          exchange: stock?.exchange || 'NSE',
          currency: stock?.currency || '₹',
          eventType: ev.eventType,
          priority: ev.priority,
          priorityLabel: this.mapPriorityToLabel(ev.priority),
          meaningfulnessScore: ev.meaningfulnessScore,
          headline: delta.headline || delta.title || `${stock?.companyName || ev.stockSymbol} ${ev.eventType}`,
          whatHappened: ev.whyShown || delta.summary || delta.whatHappened || '',
          signals: [{ type: ev.eventType, label: `${ev.eventType} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)` }],
          currentPrice,
          dayChangePercent: stock?.changePercent ? Number(stock.changePercent) : null,
          eventPrice: delta.dayClose ? Number(delta.dayClose) : currentPrice,
          priceAtSave: null,
          priceChangeSinceSaved: null,
          note: null,
          savedAt: null,
          readAt: r.readAt.toISOString(),
          deletedAt: null,
          expiresAt: null,
          occurredAt: (ev.occurredAt || ev.occurredOn || ev.timestamp).toISOString(),
          detectedAt: (ev.detectedAt || ev.timestamp).toISOString(),
          timestamp: ev.timestamp.toISOString(),
          source: ev.source,
          sourceUrl: ev.sourceUrl,
          sourceTrustTier: ev.sourceTrustTier,
          sources: (ev.sources as any[]) || null,
          whyShown: ev.whyShown,
        };
      });
    } else {
      // DELETED
      const deletes = await prisma.userEventDelete.findMany({
        where: {
          userId,
          expiresAt: { gt: new Date() },
          event: eventFilter,
        },
        include: {
          event: {
            include: { stock: true },
          },
        },
        orderBy: { deletedAt: 'desc' },
      });

      rawItems = deletes.map((d) => {
        const ev = d.event;
        const stock = ev.stock;
        const delta = (ev.metricsDelta as any) || {};
        const currentPrice = stock?.currentPrice ? Number(stock.currentPrice) : null;
        const changePercent = typeof delta.changePercent === 'number' ? delta.changePercent : stock?.changePercent ? Number(stock.changePercent) : 0;

        return {
          id: ev.id,
          tab: 'DELETED',
          stockSymbol: ev.stockSymbol,
          companyName: stock?.companyName || ev.stockSymbol,
          exchange: stock?.exchange || 'NSE',
          currency: stock?.currency || '₹',
          eventType: ev.eventType,
          priority: ev.priority,
          priorityLabel: this.mapPriorityToLabel(ev.priority),
          meaningfulnessScore: ev.meaningfulnessScore,
          headline: delta.headline || delta.title || `${stock?.companyName || ev.stockSymbol} ${ev.eventType}`,
          whatHappened: ev.whyShown || delta.summary || delta.whatHappened || '',
          signals: [{ type: ev.eventType, label: `${ev.eventType} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)` }],
          currentPrice,
          dayChangePercent: stock?.changePercent ? Number(stock.changePercent) : null,
          eventPrice: delta.dayClose ? Number(delta.dayClose) : currentPrice,
          priceAtSave: null,
          priceChangeSinceSaved: null,
          note: null,
          savedAt: null,
          readAt: null,
          deletedAt: d.deletedAt.toISOString(),
          expiresAt: d.expiresAt.toISOString(),
          occurredAt: (ev.occurredAt || ev.occurredOn || ev.timestamp).toISOString(),
          detectedAt: (ev.detectedAt || ev.timestamp).toISOString(),
          timestamp: ev.timestamp.toISOString(),
          source: ev.source,
          sourceUrl: ev.sourceUrl,
          sourceTrustTier: ev.sourceTrustTier,
          sources: (ev.sources as any[]) || null,
          whyShown: ev.whyShown,
        };
      });
    }

    // Apply In-Memory Filtering
    let filtered = rawItems;

    // 1. Stock / Watchlist filter
    if (options?.stock && options.stock !== 'ALL') {
      const sym = options.stock.toUpperCase();
      filtered = filtered.filter((i) => i.stockSymbol === sym);
    } else if (allowedSymbols) {
      filtered = filtered.filter((i) => allowedSymbols!.includes(i.stockSymbol));
    }

    // 2. Priority filter
    if (options?.priority && options.priority !== 'ALL') {
      filtered = filtered.filter((i) => i.priority === options.priority);
    }

    // 3. EventType filter
    if (options?.eventType && options.eventType !== 'ALL') {
      filtered = filtered.filter((i) => i.eventType === options.eventType);
    }

    // 4. Has Note filter
    if (options?.hasNote) {
      filtered = filtered.filter((i) => i.note && i.note.trim() !== '');
    }

    // 5. Date Range filter
    if (options?.startDate || options?.endDate) {
      const startMs = options.startDate ? new Date(options.startDate).getTime() : 0;
      const endMs = options.endDate ? new Date(options.endDate).getTime() : Infinity;
      const dateKey = options.dateFilterType === 'eventDate' ? 'occurredAt' : tab === 'SAVED' ? 'savedAt' : tab === 'DELETED' ? 'deletedAt' : 'readAt';

      filtered = filtered.filter((i) => {
        const itemDateStr = (i as any)[dateKey] || i.timestamp;
        const itemMs = new Date(itemDateStr).getTime();
        return itemMs >= startMs && itemMs <= endMs;
      });
    }

    // 6. Search query
    if (options?.search && options.search.trim() !== '') {
      const q = options.search.trim().toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.stockSymbol.toLowerCase().includes(q) ||
          i.companyName.toLowerCase().includes(q) ||
          i.headline.toLowerCase().includes(q) ||
          (i.note && i.note.toLowerCase().includes(q)) ||
          (i.source && i.source.toLowerCase().includes(q)) ||
          i.signals.some((s) => s.label.toLowerCase().includes(q))
      );
    }

    // 7. Sorting
    filtered.sort((a, b) => {
      switch (options?.sortBy) {
        case 'event_date_desc':
          return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
        case 'event_date_asc':
          return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
        case 'stock_name':
          return a.companyName.localeCompare(b.companyName);
        case 'priority': {
          const pWeight: Record<Priority, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return pWeight[b.priority] - pWeight[a.priority];
        }
        case 'change_since_saved':
          return (b.priceChangeSinceSaved ?? -999) - (a.priceChangeSinceSaved ?? -999);
        case 'recent_action':
        default: {
          const dateA = new Date(a.savedAt || a.readAt || a.deletedAt || a.timestamp).getTime();
          const dateB = new Date(b.savedAt || b.readAt || b.deletedAt || b.timestamp).getTime();
          return dateB - dateA;
        }
      }
    });

    const total = filtered.length;

    // 8. Cursor Pagination
    let startIndex = 0;
    if (options?.cursor) {
      const cursorIdx = filtered.findIndex((i) => i.id === options.cursor);
      if (cursorIdx !== -1) {
        startIndex = cursorIdx + 1;
      }
    }

    const pagedItems = filtered.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < filtered.length;
    const nextCursor = hasMore && pagedItems.length > 0 ? pagedItems[pagedItems.length - 1].id : null;

    return {
      items: pagedItems,
      total,
      hasMore,
      nextCursor,
      counts,
    };
  }

  /**
   * Update or delete private note on a saved item
   */
  async updateNote(userId: string, eventId: string, note: string | null): Promise<{ success: boolean; note: string | null }> {
    const sanitizedNote = note ? note.trim().slice(0, 500) : null;

    const existing = await prisma.userSavedEvent.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    if (!existing) {
      // If not yet saved, save it with note
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { stock: true },
      });
      if (!event) {
        throw new Error('Event not found');
      }

      await prisma.userSavedEvent.create({
        data: {
          userId,
          eventId,
          savedAt: new Date(),
          priceAtSave: event.stock?.currentPrice || null,
          note: sanitizedNote,
        },
      });
    } else {
      await prisma.userSavedEvent.update({
        where: { userId_eventId: { userId, eventId } },
        data: { note: sanitizedNote },
      });
    }

    return { success: true, note: sanitizedNote };
  }

  /**
   * Restore an item from Market Memory back to the Attention Feed (marks unread)
   */
  async restoreToFeed(userId: string, eventId: string): Promise<{ success: boolean; undoToken?: string }> {
    await Promise.all([
      prisma.userEventRead.deleteMany({ where: { userId, eventId } }),
      prisma.userSavedEvent.deleteMany({ where: { userId, eventId } }),
      prisma.userEventDelete.deleteMany({ where: { userId, eventId } }),
    ]);

    const undoToken = undoStore.createUndoToken(userId, 'restore', [eventId]);
    return { success: true, undoToken };
  }

  /**
   * Permanently delete an item from Deleted section (expires immediately)
   */
  async permanentlyDeleteItem(userId: string, eventId: string): Promise<{ success: boolean; eventId: string }> {
    await prisma.userEventDelete.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: {
        userId,
        eventId,
        deletedAt: new Date(),
        expiresAt: new Date(0),
      },
      update: {
        expiresAt: new Date(0),
      },
    });

    return { success: true, eventId };
  }

  /**
   * Backward-compatibility aliases
   */
  async getArchivedEvents(options: any) {
    const memoryType = options.memoryType?.toUpperCase();
    const tab: MemoryTab =
      memoryType === 'SAVED' ? 'SAVED' : memoryType === 'DELETED' ? 'DELETED' : 'READ';
    const res = await this.getMemoryItems(options.userId, {
      tab,
      search: options.search,
      stock: options.symbol,
      watchlistId: options.watchlistOnly ? undefined : undefined,
      limit: options.limit,
    });
    return res.items;
  }

  async getSavedEvents(userId: string, options?: any) {
    return this.getMemoryItems(userId, { tab: 'SAVED', ...options });
  }

  async getDeletedEvents(userId: string, options?: any) {
    return this.getMemoryItems(userId, { tab: 'DELETED', ...options });
  }
}

export const memoryService = new MemoryService();
