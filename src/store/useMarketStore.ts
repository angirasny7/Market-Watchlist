import { create } from 'zustand';
import { StockQuote, MarketStatus } from '../types/stock';
import { MarketEvent } from '../types/event';
import { Insight } from '../types/insight';
import { HistoricalDigest } from '../types/digest';
import { IndexSnapshot, MacroAlert, SectorPerformance, MarketMover } from '../types/market';
import { UserState, SyncStatus } from '../types/userState';
import {
  mockIndices,
  mockMacroAlerts,
  mockSectorPerformance,
  mockMarketMovers,
  mockUserState,
} from '../data';
import {
  watchlistService,
  eventService,
  insightService,
  digestService,
  stockService,
  authService,
  dashboardService,
  DashboardIntelligence,
  adaptBackendStockToStockQuote,
  adaptBackendEventToMarketEvent,
  adaptBackendInsightToInsight,
  adaptBackendDigestToHistoricalDigest,
} from '../services';
import { useToastStore } from './useToastStore';

export type FeedFilterType = 'all' | 'critical' | 'high' | 'earnings' | 'dividend' | '52w' | 'unread';
export type FeedScopeType = 'watchlist' | 'all';

interface MarketState {
  // Live State & Synchronization
  isLiveMode: boolean;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  lastRefreshedAt: string | null;
  dashboardData: DashboardIntelligence | null;

  // Normalized Entities
  watchlist: StockQuote[];
  allStocks: StockQuote[];
  events: MarketEvent[];
  insights: Record<string, Insight>; // Keyed by insight id
  digests: HistoricalDigest[];

  // Watchlist State
  watchlistViewMode: 'grid' | 'table';
  stockSearchQuery: string;
  addStock: (stock: StockQuote) => void;
  removeStock: (symbol: string) => void;
  togglePinStock: (symbol: string) => void;
  setWatchlistViewMode: (mode: 'grid' | 'table') => void;
  setStockSearchQuery: (query: string) => void;

  // Attention Feed State
  feedFilter: FeedFilterType;
  feedScope: FeedScopeType;
  feedSearchQuery: string;
  setFeedFilter: (filter: FeedFilterType) => void;
  setFeedScope: (scope: FeedScopeType) => void;
  setFeedSearchQuery: (query: string) => void;
  markEventRead: (id: string) => void;
  saveEventForLater: (id: string) => void;
  markAllEventsRead: () => void;
  convertSavedToArchived: (id: string) => void;
  acknowledgeEvent: (id: string) => void;

  // Memory Counters
  archivedEventsCount: number;
  savedEventsCount: number;
  totalMemoryCount: number;

  // Selected Item States
  selectedInsight: Insight | null;
  setSelectedInsight: (insight: Insight | null) => void;

  // Market Memory State
  selectedDigestId: string | null;
  isDigestDrawerOpen: boolean;
  openDigestDrawer: (digestId: string) => void;
  closeDigestDrawer: () => void;
  acknowledgeDigest: (digestId: string) => void;

  // Highlights State
  indices: IndexSnapshot[];
  macroAlerts: MacroAlert[];
  sectorPerformance: SectorPerformance[];
  marketMovers: MarketMover[];

  // User State & Cross-Device Sync
  userState: UserState;
  marketStatus: MarketStatus;
  simulateDeviceSwitch: (deviceId: string) => void;
  simulateNewSession: () => void;
  toggleMarketStatus: () => void;
  setSyncStatus: (status: SyncStatus) => void;

  // Data Loading & Hydration
  fetchMarketData: () => Promise<void>;
  refreshMarketData: () => Promise<void>;
  resetMarketStore: () => void;

  // Relational Selectors (Stock -> Event -> Insight -> Digest)
  getEventsByStock: (symbol: string) => MarketEvent[];
  getInsightsByEvent: (eventId: string) => Insight[];
  getDigestEvents: (digestId: string) => MarketEvent[];
  getDigestInsights: (digestId: string) => Insight[];
  getTopInsights: (limit?: number) => Insight[];
  getCriticalEvents: () => MarketEvent[];
}

export const useMarketStore = create<MarketState>((set, get) => ({
  // Live State
  isLiveMode: false,
  isLoading: false,
  isError: false,
  errorMessage: null,
  lastRefreshedAt: null,
  dashboardData: null,

  // Core Entities (Initial empty state until live hydration)
  watchlist: [],
  allStocks: [],
  events: [],
  insights: {},
  digests: [],

  // Watchlist View Settings
  watchlistViewMode: 'grid',
  stockSearchQuery: '',

  addStock: (stock: StockQuote) => {
    const exists = get().watchlist.some((s) => s.symbol === stock.symbol);
    if (!exists) {
      set((state) => ({
        watchlist: [stock, ...state.watchlist],
      }));
      watchlistService.addStock(stock.symbol).catch(() => {});
    }
  },

  removeStock: (symbol: string) => {
    set((state) => ({
      watchlist: state.watchlist.filter((s) => s.symbol !== symbol),
    }));
    watchlistService.removeStock(symbol).catch(() => {});
  },

  togglePinStock: (symbol: string) => {
    set((state) => ({
      watchlist: state.watchlist.map((s) =>
        s.symbol === symbol ? { ...s, isPinned: !s.isPinned } : s
      ),
    }));
    watchlistService.togglePin(symbol).catch(() => {});
  },

  setWatchlistViewMode: (mode: 'grid' | 'table') => {
    set({ watchlistViewMode: mode });
  },

  setStockSearchQuery: (query: string) => {
    set({ stockSearchQuery: query });
  },

  // Attention Feed State & Actions
  feedFilter: 'all',
  feedScope: 'watchlist', // Default to watchlist prioritization!
  feedSearchQuery: '',

  setFeedFilter: (filter: FeedFilterType) => {
    set({ feedFilter: filter });
  },

  setFeedScope: (scope: FeedScopeType) => {
    set({ feedScope: scope });
  },

  setFeedSearchQuery: (query: string) => {
    set({ feedSearchQuery: query });
  },

  // Memory Counters
  archivedEventsCount: 0,
  savedEventsCount: 0,
  totalMemoryCount: 0,

  markEventRead: (id: string) => {
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
      archivedEventsCount: state.archivedEventsCount + 1,
      totalMemoryCount: state.totalMemoryCount + 1,
      userState: {
        ...state.userState,
        cursor: {
          ...state.userState.cursor,
          unreadEventsCount: Math.max(0, state.userState.cursor.unreadEventsCount - 1),
        },
      },
    }));
    useToastStore.getState().addToast('Moved to Market Memory (Archived)', 'success');
    eventService.markEventRead(id).catch(() => {});
  },

  saveEventForLater: (id: string) => {
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
      savedEventsCount: state.savedEventsCount + 1,
      totalMemoryCount: state.totalMemoryCount + 1,
      userState: {
        ...state.userState,
        cursor: {
          ...state.userState.cursor,
          unreadEventsCount: Math.max(0, state.userState.cursor.unreadEventsCount - 1),
        },
      },
    }));
    useToastStore.getState().addToast('Saved to Market Memory', 'info');
    eventService.saveEventForLater(id).catch(() => {});
  },

  markAllEventsRead: () => {
    const activeCount = get().events.length;
    set((state) => ({
      events: [],
      archivedEventsCount: state.archivedEventsCount + activeCount,
      totalMemoryCount: state.totalMemoryCount + activeCount,
      userState: {
        ...state.userState,
        cursor: {
          ...state.userState.cursor,
          unreadEventsCount: 0,
        },
      },
    }));
    useToastStore.getState().addToast('Moved to Market Memory (Archived)', 'success');
    eventService.markAllRead().catch(() => {});
  },

  convertSavedToArchived: (id: string) => {
    set((state) => ({
      savedEventsCount: Math.max(0, state.savedEventsCount - 1),
      archivedEventsCount: state.archivedEventsCount + 1,
    }));
    useToastStore.getState().addToast('Moved to Archived Memory', 'success');
    eventService.markEventRead(id).catch(() => {});
  },

  acknowledgeEvent: (id: string) => {
    get().saveEventForLater(id);
  },

  // Insights State
  selectedInsight: null,
  setSelectedInsight: (insight: Insight | null) => {
    set({ selectedInsight: insight });
  },

  // Market Memory State
  selectedDigestId: null,
  isDigestDrawerOpen: false,

  openDigestDrawer: (digestId: string) => {
    set({ selectedDigestId: digestId, isDigestDrawerOpen: true });
  },

  closeDigestDrawer: () => {
    set({ isDigestDrawerOpen: false });
  },

  acknowledgeDigest: (digestId: string) => {
    set((state) => ({
      digests: state.digests.map((d) =>
        d.id === digestId ? { ...d, isAcknowledged: true } : d
      ),
    }));
    digestService.markDigestRead(digestId).catch(() => {});
    digestService.viewDigest(digestId).catch(() => {});
  },

  // Highlights State
  indices: mockIndices,
  macroAlerts: mockMacroAlerts,
  sectorPerformance: mockSectorPerformance,
  marketMovers: mockMarketMovers,

  // User State & Cross-Device Sync State
  userState: mockUserState,
  marketStatus: 'REGULAR_OPEN',

  simulateDeviceSwitch: (deviceId: string) => {
    const state = get();
    const targetDevice = state.userState.allDevices.find((d) => d.deviceId === deviceId);
    if (!targetDevice) return;

    set((s) => ({
      userState: { ...s.userState, syncStatus: 'SYNCING' },
    }));

    setTimeout(() => {
      set((s) => {
        const updatedDevices = s.userState.allDevices.map((d) => ({
          ...d,
          isCurrentDevice: d.deviceId === deviceId,
          lastActive: d.deviceId === deviceId ? 'Active Now' : 'Just Now',
        }));

        return {
          userState: {
            ...s.userState,
            currentDevice: {
              ...targetDevice,
              isCurrentDevice: true,
              lastActive: 'Active Now',
            },
            allDevices: updatedDevices,
            syncStatus: 'SYNCED',
            lastSeenDisplay:
              deviceId === 'dev_iphone_15_02'
                ? 'Synced via iPhone 15 Pro (4 mins ago)'
                : 'Synced via Workstation (Just Now)',
          },
        };
      });
    }, 450);
  },

  simulateNewSession: () => {
    set((s) => ({
      userState: {
        ...s.userState,
        lastVisitTimestamp: new Date().toISOString(),
        lastSeenDisplay: 'Just now (Session refreshed)',
      },
    }));
  },

  toggleMarketStatus: () => {
    set((s) => ({
      marketStatus: s.marketStatus === 'REGULAR_OPEN' ? 'CLOSED' : 'REGULAR_OPEN',
    }));
  },

  setSyncStatus: (status: SyncStatus) => {
    set((s) => ({
      userState: { ...s.userState, syncStatus: status },
    }));
  },

  // Data Loading & Hydration
  fetchMarketData: async () => {
    set({ isLoading: true, isError: false, errorMessage: null });

    try {
      // If unauthenticated, avoid unauthorized API traffic
      if (!authService.isAuthenticated()) {
        set({
          isLoading: false,
          isLiveMode: false,
        });
        return;
      }

      // 2. Concurrently fetch all live intelligence from PostgreSQL
      const [
        rawStocks,
        rawWatchlist,
        rawEvents,
        rawInsights,
        rawDigests,
        dashboardData,
        userStateRes,
      ] = await Promise.all([
        stockService.getAllStocks().catch(() => null),
        watchlistService.fetchWatchlist().catch(() => null),
        eventService.fetchEvents().catch(() => null),
        insightService.fetchInsights().catch(() => null),
        digestService.fetchDigests().catch(() => null),
        dashboardService.getDashboard().catch(() => null),
        dashboardService.getUserState().catch(() => null),
      ]);

      // If backend was unreachable across endpoints, preserve offline fallback
      if (!rawStocks && !rawEvents && !dashboardData) {
        set({
          isLiveMode: false,
          isLoading: false,
          userState: {
            ...get().userState,
            syncStatus: 'OFFLINE',
          },
        });
        return;
      }

      // 3. Resolve Watchlist Symbols
      const watchlistItems = Array.isArray(rawWatchlist) ? rawWatchlist : [];
      const watchlistSymbols = new Set<string>(
        watchlistItems.map((w: any) => (w.stockSymbol || w.symbol || '').toUpperCase())
      );

      const pinnedSymbols = new Set<string>(
        watchlistItems.filter((w: any) => w.isPinned).map((w: any) => (w.stockSymbol || w.symbol || '').toUpperCase())
      );

      // 4. Adapt Stocks
      const stockList = Array.isArray(rawStocks) ? rawStocks : [];
      const adaptedAllStocks: StockQuote[] = stockList.map((s: any) =>
        adaptBackendStockToStockQuote(s, pinnedSymbols.has(s.symbol), rawEvents || [])
      );

      const adaptedWatchlist = adaptedAllStocks.filter((s) => watchlistSymbols.has(s.symbol));

      // 5. Adapt Events
      const eventList = Array.isArray(rawEvents) ? rawEvents : [];
      const adaptedEvents: MarketEvent[] = eventList.map((e: any) =>
        adaptBackendEventToMarketEvent(e, watchlistSymbols)
      );

      // 6. Adapt Insights
      const insightList = Array.isArray(rawInsights) ? rawInsights : [];
      const adaptedInsights: Record<string, Insight> = {};
      for (const ins of insightList) {
        const adapted = adaptBackendInsightToInsight(ins, watchlistSymbols);
        adaptedInsights[adapted.id] = adapted;
      }

      // 7. Adapt Digests (Watchlist-prioritized)
      const digestList = Array.isArray(rawDigests) ? rawDigests : [];
      const adaptedDigests: HistoricalDigest[] = digestList
        .map((d: any) => adaptBackendDigestToHistoricalDigest(d, watchlistSymbols))
        .sort((a, b) => {
          if (a.hasWatchlistEvents && !b.hasWatchlistEvents) return -1;
          if (!a.hasWatchlistEvents && b.hasWatchlistEvents) return 1;
          return new Date(b.digestDate).getTime() - new Date(a.digestDate).getTime();
        });

      // 8. Update User State & Sync Status
      const unreadCount =
        userStateRes?.unreadEvents ?? adaptedEvents.filter((e) => !e.read).length;

      const awayDisplay = dashboardData?.awayDuration
        ? `${dashboardData.awayDuration} ago`
        : get().userState.lastSeenDisplay;

      const liveCurrentDevice = dashboardData?.currentDevice || userStateRes?.currentDevice;
      const livePreviousDevice = dashboardData?.previousDevice || userStateRes?.previousDevice;

      const currentDeviceSession = {
        deviceId: 'dev_current',
        deviceName: liveCurrentDevice?.deviceName || 'Desktop',
        deviceType: (liveCurrentDevice?.deviceType || 'Desktop') as any,
        lastActive: 'Active Now',
        isCurrentDevice: true,
      };

      const previousDeviceSession = livePreviousDevice
        ? {
            deviceId: 'dev_previous',
            deviceName: livePreviousDevice.deviceName,
            deviceType: livePreviousDevice.deviceType as any,
            lastActive: awayDisplay,
            isCurrentDevice: false,
          }
        : null;

      const allDevicesList = [
        currentDeviceSession,
        ...(previousDeviceSession ? [previousDeviceSession] : []),
      ];

      set({
        isLiveMode: true,
        isLoading: false,
        lastRefreshedAt: new Date().toLocaleTimeString(),
        dashboardData,
        watchlist: adaptedWatchlist,
        allStocks: adaptedAllStocks,
        events: adaptedEvents,
        insights: adaptedInsights,
        digests: adaptedDigests,
        archivedEventsCount: userStateRes?.archivedEventsCount ?? get().archivedEventsCount,
        savedEventsCount: userStateRes?.savedEventsCount ?? get().savedEventsCount,
        totalMemoryCount: userStateRes?.totalMemoryCount ?? (get().archivedEventsCount + get().savedEventsCount),
        marketStatus: (dashboardData?.marketMood === 'CHOPPY' || dashboardData?.marketMood === 'BULLISH')
          ? 'REGULAR_OPEN'
          : get().marketStatus,
        userState: {
          ...get().userState,
          userName: (dashboardData as any)?.userName || userStateRes?.userName || get().userState.userName,
          userId: (dashboardData as any)?.user?.id || userStateRes?.userId || get().userState.userId,
          lastLoginAt: (dashboardData as any)?.lastLoginAt || userStateRes?.lastLoginAt || (dashboardData as any)?.user?.lastLoginAt || null,
          previousLoginAt: (dashboardData as any)?.previousLoginAt || userStateRes?.previousLoginAt || (dashboardData as any)?.user?.previousLoginAt || null,
          previousSessionAt: (dashboardData as any)?.previousSessionAt || userStateRes?.previousSessionAt || null,
          lastLogoutAt: (dashboardData as any)?.lastLogoutAt || userStateRes?.lastLogoutAt || null,
          lastSeenDisplay: awayDisplay,
          lastVisitTimestamp: (dashboardData as any)?.previousSessionAt || userStateRes?.lastActivityAt || get().userState.lastVisitTimestamp,
          syncStatus: 'SYNCED',
          cursor: {
            ...get().userState.cursor,
            unreadEventsCount: unreadCount,
          },
          currentDevice: currentDeviceSession,
          previousDevice: previousDeviceSession,
          allDevices: allDevicesList,
        },
      });
    } catch (err: any) {
      console.error('[useMarketStore] Failed to fetch live market data:', err);
      set({
        isLoading: false,
        isError: true,
        errorMessage: err.message || 'Failed to load live data',
        isLiveMode: false,
      });
    }
  },

  refreshMarketData: async () => {
    return get().fetchMarketData();
  },

  resetMarketStore: () => {
    set({
      watchlist: [],
      allStocks: [],
      events: [],
      insights: {},
      digests: [],
      selectedInsight: null,
      selectedDigestId: null,
      isDigestDrawerOpen: false,
      feedFilter: 'all',
      feedScope: 'watchlist',
      isLoading: false,
      isError: false,
      errorMessage: null,
      userState: mockUserState,
    });
  },

  // Relational Selectors
  // 1. Stock -> Events
  getEventsByStock: (symbol: string) => {
    const { events } = get();
    return events.filter((e) => e.stockSymbol === symbol);
  },

  // 2. Event -> Insights
  getInsightsByEvent: (eventId: string) => {
    const { insights } = get();
    return Object.values(insights).filter((i) => i.relatedEventId === eventId);
  },

  // 3. Digest -> Events
  getDigestEvents: (digestId: string) => {
    const { digests, events } = get();
    const digest = digests.find((d) => d.id === digestId);
    if (!digest) return [];
    return events.filter((e) => digest.eventIds.includes(e.id));
  },

  // 4. Digest -> Insights
  getDigestInsights: (digestId: string) => {
    const { digests, insights } = get();
    const digest = digests.find((d) => d.id === digestId);
    if (!digest) return [];
    return digest.insightIds
      .map((id) => insights[id])
      .filter((i): i is Insight => Boolean(i));
  },

  // 5. Top Insights (Strictly scoped to user watchlist stocks, 1 per stock symbol)
  getTopInsights: (limit: number = 3) => {
    const { insights, watchlist, events } = get();
    if (watchlist.length === 0) return [];

    const priorityWeights: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    const candidateInsights = Object.values(insights).filter((i) => i.inWatchlist);

    // Sort by: Event Priority -> Attention Score -> Confidence Score -> Recency
    const sorted = [...candidateInsights].sort((a, b) => {
      const eventA = events.find((e) => e.id === a.relatedEventId);
      const eventB = events.find((e) => e.id === b.relatedEventId);

      const pA = eventA ? priorityWeights[eventA.priority] || 1 : 1;
      const pB = eventB ? priorityWeights[eventB.priority] || 1 : 1;
      if (pB !== pA) return pB - pA;

      const scoreA = eventA?.scoring?.finalScore ?? 0;
      const scoreB = eventB?.scoring?.finalScore ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;

      const confA = a.confidenceScore ?? 0;
      const confB = b.confidenceScore ?? 0;
      if (confB !== confA) return confB - confA;

      return new Date(b.generatedAt || 0).getTime() - new Date(a.generatedAt || 0).getTime();
    });

    // Limit to ONE insight per stock symbol
    const seenSymbols = new Set<string>();
    const uniquePerSymbol: Insight[] = [];
    for (const ins of sorted) {
      if (!seenSymbols.has(ins.stockSymbol)) {
        seenSymbols.add(ins.stockSymbol);
        uniquePerSymbol.push(ins);
      }
      if (uniquePerSymbol.length >= limit) break;
    }

    return uniquePerSymbol;
  },

  // 6. Critical Events (Strictly scoped to user watchlist critical events)
  getCriticalEvents: () => {
    const { events, watchlist } = get();
    if (watchlist.length === 0) return [];
    return events.filter(
      (e) => e.inWatchlist && (e.priority === 'CRITICAL' || e.priority === 'HIGH')
    );
  },
}));
