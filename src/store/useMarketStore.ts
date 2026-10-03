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
  UserWatchlist,
  WatchlistOverviewData,
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
import {
  WatchlistQuickFilter,
  WatchlistDropdownFilter,
  WatchlistSortField,
} from '../lib/watchlistFilters';
import { useToastStore } from './useToastStore';
import { apiClient } from '../services/apiClient';

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

  // Phase 1 & 2 Multi-Watchlist & Overview State
  userWatchlists: UserWatchlist[];
  activeWatchlistId: string | 'all';
  watchlistOverview: WatchlistOverviewData | null;
  watchlistRange: '1D' | '1W' | '1M';
  watchlistQuickFilter: WatchlistQuickFilter;
  watchlistDropdownFilter: WatchlistDropdownFilter;
  watchlistSortField: WatchlistSortField;
  isOverviewLoading: boolean;

  setActiveWatchlistId: (id: string | 'all') => void;
  setWatchlistRange: (range: '1D' | '1W' | '1M') => void;
  setWatchlistQuickFilter: (filter: WatchlistQuickFilter) => void;
  setWatchlistDropdownFilter: (filter: WatchlistDropdownFilter) => void;
  setWatchlistSortField: (sort: WatchlistSortField) => void;

  fetchUserWatchlists: () => Promise<void>;
  fetchWatchlistOverview: (watchlistId?: string | 'all', range?: '1D' | '1W' | '1M', force?: boolean) => Promise<void>;
  createUserWatchlist: (name: string) => Promise<UserWatchlist | null>;
  renameUserWatchlist: (id: string, name: string) => Promise<boolean>;
  deleteUserWatchlist: (id: string) => Promise<boolean>;
  addStockToActiveWatchlist: (symbol: string, targetWatchlistId?: string) => Promise<boolean>;
  removeStockFromActiveWatchlist: (symbol: string, targetWatchlistId?: string) => Promise<boolean>;
  togglePinInActiveWatchlist: (symbol: string, targetWatchlistId?: string) => Promise<boolean>;
  copyStockToWatchlist: (symbol: string, targetWatchlistId: string) => Promise<boolean>;
  moveStockToWatchlist: (symbol: string, sourceWatchlistId: string, targetWatchlistId: string) => Promise<boolean>;
  pollWatchlistQuotes: (watchlistId?: string | 'all') => Promise<void>;

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

const SAVED_ACTIVE_WL_KEY = 'smw_active_watchlist_id';
const SAVED_WL_RANGE_KEY = 'smw_watchlist_range';
const SAVED_WL_VIEW_MODE_KEY = 'smw_watchlist_view_mode';
const SAVED_WL_SORT_KEY = 'smw_watchlist_sort_field';
const SAVED_WL_QUICK_FILTER_KEY = 'smw_watchlist_quick_filter';
const SAVED_WL_DROPDOWN_FILTER_KEY = 'smw_watchlist_dropdown_filter';

let syncTimer: any = null;
function debouncedSyncPreferences(getState: () => MarketState) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const s = getState();
    const prefs = {
      selectedWatchlistId: s.activeWatchlistId,
      viewMode: s.watchlistViewMode,
      range: s.watchlistRange,
      sortField: s.watchlistSortField,
      quickFilter: s.watchlistQuickFilter,
      dropdownFilter: s.watchlistDropdownFilter,
    };
    apiClient.patch('/user/preferences', { preferences: prefs }).catch(() => {});
  }, 1000);
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
  watchlistViewMode: (typeof localStorage !== 'undefined' && (localStorage.getItem(SAVED_WL_VIEW_MODE_KEY) as 'grid' | 'table')) || 'table',
  stockSearchQuery: '',

  // Multi-Watchlist & Overview State
  userWatchlists: [],
  activeWatchlistId: (typeof localStorage !== 'undefined' && localStorage.getItem(SAVED_ACTIVE_WL_KEY)) || 'all',
  watchlistOverview: null,
  watchlistRange: (typeof localStorage !== 'undefined' && (localStorage.getItem(SAVED_WL_RANGE_KEY) as '1D' | '1W' | '1M')) || '1D',
  watchlistQuickFilter: (typeof localStorage !== 'undefined' && (localStorage.getItem(SAVED_WL_QUICK_FILTER_KEY) as WatchlistQuickFilter)) || 'ALL',
  watchlistDropdownFilter: (typeof localStorage !== 'undefined' && (localStorage.getItem(SAVED_WL_DROPDOWN_FILTER_KEY) as WatchlistDropdownFilter)) || 'ALL',
  watchlistSortField: (typeof localStorage !== 'undefined' && (localStorage.getItem(SAVED_WL_SORT_KEY) as WatchlistSortField)) || 'ATTENTION_SCORE',
  isOverviewLoading: false,

  setWatchlistViewMode: (mode: 'grid' | 'table') => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVED_WL_VIEW_MODE_KEY, mode);
    }
    set({ watchlistViewMode: mode });
    debouncedSyncPreferences(get);
  },

  setActiveWatchlistId: (id: string | 'all') => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVED_ACTIVE_WL_KEY, id);
    }
    set({ activeWatchlistId: id });
    debouncedSyncPreferences(get);
    get().fetchWatchlistOverview(id);
  },

  setWatchlistRange: (range: '1D' | '1W' | '1M') => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVED_WL_RANGE_KEY, range);
    }
    set({ watchlistRange: range });
    debouncedSyncPreferences(get);
    get().fetchWatchlistOverview(undefined, range);
  },

  setWatchlistQuickFilter: (filter: WatchlistQuickFilter) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVED_WL_QUICK_FILTER_KEY, filter);
    }
    set({ watchlistQuickFilter: filter });
    debouncedSyncPreferences(get);
  },

  setWatchlistDropdownFilter: (filter: WatchlistDropdownFilter) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVED_WL_DROPDOWN_FILTER_KEY, filter);
    }
    set({ watchlistDropdownFilter: filter });
    debouncedSyncPreferences(get);
  },

  setWatchlistSortField: (sort: WatchlistSortField) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVED_WL_SORT_KEY, sort);
    }
    set({ watchlistSortField: sort });
    debouncedSyncPreferences(get);
  },

  fetchUserWatchlists: async () => {
    try {
      const lists = await watchlistService.fetchUserWatchlists();
      set({ userWatchlists: lists });
    } catch (err) {
      console.error('Failed to fetch user watchlists', err);
    }
  },

  fetchWatchlistOverview: async (targetId?: string | 'all', targetRange?: '1D' | '1W' | '1M') => {
    const currentId = targetId !== undefined ? targetId : get().activeWatchlistId;
    const currentRange = targetRange !== undefined ? targetRange : get().watchlistRange;

    set({ isOverviewLoading: true });
    try {
      const overview = await watchlistService.fetchOverview(currentId, currentRange);
      if (overview) {
        set({
          watchlistOverview: overview,
          isOverviewLoading: false,
        });
      } else {
        set({ isOverviewLoading: false });
      }
    } catch (err: any) {
      console.error('Failed to fetch watchlist overview', err);
      set({ isOverviewLoading: false });
    }
  },

  createUserWatchlist: async (name: string) => {
    try {
      const created = await watchlistService.createWatchlist(name);
      if (created) {
        const prev = get().userWatchlists;
        set({
          userWatchlists: [...prev, created],
          activeWatchlistId: created.id,
        });
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(SAVED_ACTIVE_WL_KEY, created.id);
        }
        useToastStore.getState().addToast(`Watchlist "${created.name}" created`, 'success');
        await get().fetchWatchlistOverview(created.id);
        return created;
      }
      return null;
    } catch (err: any) {
      useToastStore.getState().addToast(err.message || 'Failed to create watchlist', 'error');
      return null;
    }
  },

  renameUserWatchlist: async (id: string, name: string) => {
    const prevLists = get().userWatchlists;
    set({
      userWatchlists: prevLists.map((w) => (w.id === id ? { ...w, name } : w)),
    });
    try {
      const updated = await watchlistService.renameWatchlist(id, name);
      if (updated) {
        useToastStore.getState().addToast(`Renamed watchlist to "${name}"`, 'success');
        const currentOverview = get().watchlistOverview;
        if (currentOverview?.watchlist?.id === id) {
          set({
            watchlistOverview: {
              ...currentOverview,
              watchlist: { ...currentOverview.watchlist, name },
            },
          });
        }
        return true;
      }
      set({ userWatchlists: prevLists });
      return false;
    } catch (err: any) {
      set({ userWatchlists: prevLists });
      useToastStore.getState().addToast(err.message || 'Failed to rename watchlist', 'error');
      return false;
    }
  },

  deleteUserWatchlist: async (id: string) => {
    const prevLists = get().userWatchlists;
    const target = prevLists.find((w) => w.id === id);
    if (!target) return false;

    const remaining = prevLists.filter((w) => w.id !== id);
    set({
      userWatchlists: remaining,
      activeWatchlistId: 'all',
    });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVED_ACTIVE_WL_KEY, 'all');
    }

    try {
      const success = await watchlistService.deleteWatchlist(id);
      if (success) {
        useToastStore.getState().addToast(`Deleted watchlist "${target.name}"`, 'info');
        await get().fetchWatchlistOverview('all');
        return true;
      }
      set({ userWatchlists: prevLists });
      return false;
    } catch (err: any) {
      set({ userWatchlists: prevLists, activeWatchlistId: id });
      useToastStore.getState().addToast(err.message || 'Failed to delete watchlist', 'error');
      return false;
    }
  },

  addStockToActiveWatchlist: async (symbol: string, targetWatchlistId?: string) => {
    const activeId = targetWatchlistId || get().activeWatchlistId;
    const effectiveId = activeId === 'all'
      ? (get().userWatchlists.find((w) => w.isDefault)?.id || get().userWatchlists[0]?.id)
      : activeId;

    if (!effectiveId) {
      useToastStore.getState().addToast('No watchlist selected', 'error');
      return false;
    }

    try {
      const success = await watchlistService.addStockToWatchlist(effectiveId, symbol);
      if (success) {
        useToastStore.getState().addToast(`Added ${symbol} to watchlist`, 'success');
        await Promise.all([
          get().fetchUserWatchlists(),
          get().fetchWatchlistOverview(),
        ]);
        return true;
      }
      return false;
    } catch (err: any) {
      useToastStore.getState().addToast(err.message || `Failed to add ${symbol}`, 'error');
      return false;
    }
  },

  removeStockFromActiveWatchlist: async (symbol: string, targetWatchlistId?: string) => {
    const activeId = targetWatchlistId || get().activeWatchlistId;
    const currentOverview = get().watchlistOverview;
    const prevStocks = currentOverview?.stocks || [];

    if (currentOverview) {
      set({
        watchlistOverview: {
          ...currentOverview,
          stocks: prevStocks.filter((s) => s.symbol !== symbol),
          summary: {
            ...currentOverview.summary,
            totalStocks: Math.max(0, currentOverview.summary.totalStocks - 1),
          },
        },
      });
    }

    try {
      if (activeId === 'all') {
        const stockItem = prevStocks.find((s) => s.symbol === symbol);
        const wlIds = stockItem?.watchlistIds || [];
        await Promise.all(wlIds.map((wlId) => watchlistService.removeStockFromWatchlist(wlId, symbol)));
      } else {
        await watchlistService.removeStockFromWatchlist(activeId, symbol);
      }
      useToastStore.getState().addToast(`Removed ${symbol} from watchlist`, 'info');
      await Promise.all([
        get().fetchUserWatchlists(),
        get().fetchWatchlistOverview(),
      ]);
      return true;
    } catch (err: any) {
      if (currentOverview) {
        set({ watchlistOverview: currentOverview });
      }
      useToastStore.getState().addToast(err.message || `Failed to remove ${symbol}`, 'error');
      return false;
    }
  },

  togglePinInActiveWatchlist: async (symbol: string, targetWatchlistId?: string) => {
    const activeId = targetWatchlistId || get().activeWatchlistId;
    const currentOverview = get().watchlistOverview;
    const prevStocks = currentOverview?.stocks || [];
    const targetStock = prevStocks.find((s) => s.symbol === symbol);
    if (!targetStock) return false;

    const nextPinned = !targetStock.isPinned;

    if (currentOverview) {
      set({
        watchlistOverview: {
          ...currentOverview,
          stocks: prevStocks.map((s) => (s.symbol === symbol ? { ...s, isPinned: nextPinned } : s)),
        },
      });
    }

    const effectiveId = activeId === 'all'
      ? (targetStock.watchlistIds[0] || get().userWatchlists[0]?.id)
      : activeId;

    if (!effectiveId) return false;

    try {
      await watchlistService.togglePinInWatchlist(effectiveId, symbol);
      return true;
    } catch (err: any) {
      if (currentOverview) {
        set({ watchlistOverview: currentOverview });
      }
      useToastStore.getState().addToast(err.message || `Failed to update pin for ${symbol}`, 'error');
      return false;
    }
  },

  copyStockToWatchlist: async (symbol: string, targetWatchlistId: string) => {
    try {
      const target = get().userWatchlists.find((w) => w.id === targetWatchlistId);
      const targetName = target ? target.name : 'watchlist';
      const success = await watchlistService.addStockToWatchlist(targetWatchlistId, symbol);
      if (success) {
        useToastStore.getState().addToast(`Copied ${symbol} to "${targetName}"`, 'success');
        await Promise.all([
          get().fetchUserWatchlists(),
          get().fetchWatchlistOverview(),
        ]);
        return true;
      }
      return false;
    } catch (err: any) {
      useToastStore.getState().addToast(err.message || `Failed to copy ${symbol}`, 'error');
      return false;
    }
  },

  moveStockToWatchlist: async (symbol: string, sourceWatchlistId: string, targetWatchlistId: string) => {
    if (sourceWatchlistId === targetWatchlistId) return true;
    try {
      const target = get().userWatchlists.find((w) => w.id === targetWatchlistId);
      const targetName = target ? target.name : 'watchlist';
      await watchlistService.addStockToWatchlist(targetWatchlistId, symbol);
      await watchlistService.removeStockFromWatchlist(sourceWatchlistId, symbol);
      useToastStore.getState().addToast(`Moved ${symbol} to "${targetName}"`, 'success');
      await Promise.all([
        get().fetchUserWatchlists(),
        get().fetchWatchlistOverview(),
      ]);
      return true;
    } catch (err: any) {
      useToastStore.getState().addToast(err.message || `Failed to move ${symbol}`, 'error');
      return false;
    }
  },

  /**
   * Lightweight price polling — updates price/change fields in watchlistOverview
   * without refetching the full overview (sparkline, attention, alerts unchanged).
   * Call at 30-60s intervals during market hours.
   */
  pollWatchlistQuotes: async (watchlistId?: string | 'all') => {
    const currentId = watchlistId || get().activeWatchlistId || 'all';
    try {
      const result = await watchlistService.fetchQuotes(currentId as string | 'all');
      if (!result || !result.quotes.length) return;

      const current = get().watchlistOverview;
      if (!current) return;

      // Patch prices in-place without triggering a full overview reload
      const patchMap = new Map(result.quotes.map(q => [q.symbol, q]));
      const patchedStocks = current.stocks.map(s => {
        const q = patchMap.get(s.symbol);
        if (!q) return s;
        return {
          ...s,
          currentPrice: q.price,
          changeAmount: q.changeAmount,
          changePercent: q.changePercent,
        };
      });

      set({
        watchlistOverview: {
          ...current,
          stocks: patchedStocks,
        },
      });
    } catch {
      // Silent fail on polling errors — UI retains last known prices
    }
  },

  addStock: (stock: StockQuote) => {
    const prevWatchlist = get().watchlist;
    const exists = prevWatchlist.some((s) => s.symbol === stock.symbol);
    if (!exists) {
      set({
        watchlist: [stock, ...prevWatchlist],
      });
      useToastStore.getState().addToast(`Added ${stock.symbol} to watchlist`, 'success');
      watchlistService.addStock(stock.symbol).catch(() => {
        set({ watchlist: prevWatchlist });
        useToastStore.getState().addToast(`Failed to add ${stock.symbol}. Reverted.`, 'error');
      });
    }
  },

  removeStock: (symbol: string) => {
    const prevWatchlist = get().watchlist;
    set({
      watchlist: prevWatchlist.filter((s) => s.symbol !== symbol),
    });
    useToastStore.getState().addToast(`Removed ${symbol} from watchlist`, 'info');
    watchlistService.removeStock(symbol).catch(() => {
      set({ watchlist: prevWatchlist });
      useToastStore.getState().addToast(`Failed to remove ${symbol}. Reverted.`, 'error');
    });
  },

  togglePinStock: (symbol: string) => {
    const prevWatchlist = get().watchlist;
    const target = prevWatchlist.find((s) => s.symbol === symbol);
    const nextPinned = !target?.isPinned;
    set({
      watchlist: prevWatchlist.map((s) =>
        s.symbol === symbol ? { ...s, isPinned: nextPinned } : s
      ),
    });
    watchlistService.togglePin(symbol).catch(() => {
      set({ watchlist: prevWatchlist });
      useToastStore.getState().addToast(`Failed to update pin for ${symbol}. Reverted.`, 'error');
    });
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
    const prevEvents = get().events;
    const targetEvent = prevEvents.find((e) => e.id === id);
    if (!targetEvent) return;
    const prevArchivedCount = get().archivedEventsCount;
    const prevTotalCount = get().totalMemoryCount;
    const prevCursor = get().userState.cursor;
    const prevOverview = get().watchlistOverview;

    set((state) => {
      let updatedOverview = state.watchlistOverview;
      if (updatedOverview) {
        const updatedStocks = updatedOverview.stocks.map((s) => {
          if (s.symbol === targetEvent.stockSymbol) {
            return { ...s, unseenUpdatesCount: Math.max(0, s.unseenUpdatesCount - 1) };
          }
          return s;
        });
        updatedOverview = {
          ...updatedOverview,
          stocks: updatedStocks,
          summary: {
            ...updatedOverview.summary,
            unseenUpdates: Math.max(0, updatedOverview.summary.unseenUpdates - 1),
          },
        };
      }

      return {
        events: state.events.filter((e) => e.id !== id),
        watchlistOverview: updatedOverview,
        archivedEventsCount: state.archivedEventsCount + 1,
        totalMemoryCount: state.totalMemoryCount + 1,
        userState: {
          ...state.userState,
          cursor: {
            ...state.userState.cursor,
            unreadEventsCount: Math.max(0, state.userState.cursor.unreadEventsCount - 1),
          },
        },
      };
    });

    useToastStore.getState().addToast('Moved to Market Memory (Archived)', 'success');
    eventService.markEventRead(id).catch(() => {
      set((state) => ({
        events: prevEvents,
        watchlistOverview: prevOverview,
        archivedEventsCount: prevArchivedCount,
        totalMemoryCount: prevTotalCount,
        userState: { ...state.userState, cursor: prevCursor },
      }));
      useToastStore.getState().addToast('Failed to mark event read. Reverted.', 'error');
    });
  },

  saveEventForLater: (id: string) => {
    const prevEvents = get().events;
    const targetEvent = prevEvents.find((e) => e.id === id);
    if (!targetEvent) return;
    const prevSavedCount = get().savedEventsCount;
    const prevTotalCount = get().totalMemoryCount;
    const prevCursor = get().userState.cursor;
    const prevOverview = get().watchlistOverview;

    set((state) => {
      let updatedOverview = state.watchlistOverview;
      if (updatedOverview) {
        const updatedStocks = updatedOverview.stocks.map((s) => {
          if (s.symbol === targetEvent.stockSymbol) {
            return { ...s, unseenUpdatesCount: Math.max(0, s.unseenUpdatesCount - 1) };
          }
          return s;
        });
        updatedOverview = {
          ...updatedOverview,
          stocks: updatedStocks,
          summary: {
            ...updatedOverview.summary,
            unseenUpdates: Math.max(0, updatedOverview.summary.unseenUpdates - 1),
          },
        };
      }

      return {
        events: state.events.filter((e) => e.id !== id),
        watchlistOverview: updatedOverview,
        savedEventsCount: state.savedEventsCount + 1,
        totalMemoryCount: state.totalMemoryCount + 1,
        userState: {
          ...state.userState,
          cursor: {
            ...state.userState.cursor,
            unreadEventsCount: Math.max(0, state.userState.cursor.unreadEventsCount - 1),
          },
        },
      };
    });

    useToastStore.getState().addToast('Saved to Market Memory', 'info');
    eventService.saveEventForLater(id).catch(() => {
      set((state) => ({
        events: prevEvents,
        watchlistOverview: prevOverview,
        savedEventsCount: prevSavedCount,
        totalMemoryCount: prevTotalCount,
        userState: { ...state.userState, cursor: prevCursor },
      }));
      useToastStore.getState().addToast('Failed to save event. Reverted.', 'error');
    });
  },

  markAllEventsRead: () => {
    const prevEvents = get().events;
    const activeCount = prevEvents.length;
    const prevArchived = get().archivedEventsCount;
    const prevTotal = get().totalMemoryCount;
    const prevCursor = get().userState.cursor;
    const prevOverview = get().watchlistOverview;

    set((state) => {
      let updatedOverview = state.watchlistOverview;
      if (updatedOverview) {
        updatedOverview = {
          ...updatedOverview,
          stocks: updatedOverview.stocks.map((s) => ({ ...s, unseenUpdatesCount: 0 })),
          summary: {
            ...updatedOverview.summary,
            unseenUpdates: 0,
          },
        };
      }

      return {
        events: [],
        watchlistOverview: updatedOverview,
        archivedEventsCount: state.archivedEventsCount + activeCount,
        totalMemoryCount: state.totalMemoryCount + activeCount,
        userState: {
          ...state.userState,
          cursor: {
            ...state.userState.cursor,
            unreadEventsCount: 0,
          },
        },
      };
    });

    useToastStore.getState().addToast('All events marked as read', 'success');
    eventService.markAllRead().catch(() => {
      set((state) => ({
        events: prevEvents,
        watchlistOverview: prevOverview,
        archivedEventsCount: prevArchived,
        totalMemoryCount: prevTotal,
        userState: { ...state.userState, cursor: prevCursor },
      }));
      useToastStore.getState().addToast('Failed to mark all read. Reverted.', 'error');
    });
  },

  convertSavedToArchived: (id: string) => {
    const prevSaved = get().savedEventsCount;
    const prevArchived = get().archivedEventsCount;

    set((state) => ({
      savedEventsCount: Math.max(0, state.savedEventsCount - 1),
      archivedEventsCount: state.archivedEventsCount + 1,
    }));
    useToastStore.getState().addToast('Moved to Archived Memory', 'success');
    eventService.markEventRead(id).catch(() => {
      set({
        savedEventsCount: prevSaved,
        archivedEventsCount: prevArchived,
      });
      useToastStore.getState().addToast('Failed to archive event. Reverted.', 'error');
    });
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
    const prevDigests = get().digests;
    set((state) => ({
      digests: state.digests.map((d) =>
        d.id === digestId ? { ...d, isAcknowledged: true } : d
      ),
    }));
    useToastStore.getState().addToast('Marked dossier as reviewed', 'success');
    Promise.all([
      digestService.markDigestRead(digestId),
      digestService.viewDigest(digestId),
    ]).catch(() => {
      set({ digests: prevDigests });
      useToastStore.getState().addToast('Failed to acknowledge dossier. Reverted.', 'error');
    });
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
        watchlistService.fetchWatchlist('all').catch(() => null),
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

      // Hydrate backend UserState preferences if present (with localStorage fallback)
      if (userStateRes && (userStateRes as any).preferences && typeof (userStateRes as any).preferences === 'object') {
        const p = (userStateRes as any).preferences;
        if (p.selectedWatchlistId) {
          set({ activeWatchlistId: p.selectedWatchlistId });
          if (typeof localStorage !== 'undefined') localStorage.setItem(SAVED_ACTIVE_WL_KEY, p.selectedWatchlistId);
        }
        if (p.viewMode) {
          set({ watchlistViewMode: p.viewMode });
          if (typeof localStorage !== 'undefined') localStorage.setItem(SAVED_WL_VIEW_MODE_KEY, p.viewMode);
        }
        if (p.range) {
          set({ watchlistRange: p.range });
          if (typeof localStorage !== 'undefined') localStorage.setItem(SAVED_WL_RANGE_KEY, p.range);
        }
        if (p.sortField) {
          set({ watchlistSortField: p.sortField });
          if (typeof localStorage !== 'undefined') localStorage.setItem(SAVED_WL_SORT_KEY, p.sortField);
        }
        if (p.quickFilter) {
          set({ watchlistQuickFilter: p.quickFilter });
          if (typeof localStorage !== 'undefined') localStorage.setItem(SAVED_WL_QUICK_FILTER_KEY, p.quickFilter);
        }
        if (p.dropdownFilter) {
          set({ watchlistDropdownFilter: p.dropdownFilter });
          if (typeof localStorage !== 'undefined') localStorage.setItem(SAVED_WL_DROPDOWN_FILTER_KEY, p.dropdownFilter);
        }
      }

      // Hydrate multi-watchlists and overview in parallel
      get().fetchUserWatchlists().catch(() => {});
      get().fetchWatchlistOverview().catch(() => {});
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
