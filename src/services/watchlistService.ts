import { apiClient } from './apiClient';
import { StockQuote } from '../types/stock';
import { WatchlistStockItem } from '../lib/watchlistFilters';

export interface UserWatchlist {
  id: string;
  name: string;
  isDefault: boolean;
  stockCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistOverviewSummary {
  totalStocks: number;
  needAttention: number;
  upcomingEvents: number;
  activeAlerts: number;
  unseenUpdates: number;
}

export interface WatchlistOverviewData {
  watchlist?: {
    id: string;
    name: string;
    isDefault: boolean;
  };
  stocks: WatchlistStockItem[];
  summary: WatchlistOverviewSummary;
  dataFreshness: {
    lastSyncedAt: string | null;
    isStale: boolean;
  };
}

export interface WatchlistApiResponse {
  id: string;
  name: string;
  isDefault: boolean;
  stocks: Array<{
    id: string;
    stockSymbol: string;
    isPinned: boolean;
    addedAt: string;
    stock: StockQuote;
  }>;
}

export class WatchlistService {
  // ==========================================
  // Modern Multi-Watchlist API (Phase 1 & 2)
  // ==========================================

  /**
   * Fetch all user watchlists with stock counts
   */
  async fetchUserWatchlists(): Promise<UserWatchlist[]> {
    const res = await apiClient.get<UserWatchlist[]>('/watchlists');
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  }

  /**
   * Create a new named watchlist
   */
  async createWatchlist(name: string): Promise<UserWatchlist | null> {
    const res = await apiClient.post<UserWatchlist>('/watchlists', { name });
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  /**
   * Rename an existing watchlist
   */
  async renameWatchlist(id: string, name: string): Promise<UserWatchlist | null> {
    const res = await apiClient.patch<UserWatchlist>(`/watchlists/${id}`, { name });
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  /**
   * Delete a watchlist
   */
  async deleteWatchlist(id: string): Promise<boolean> {
    const res = await apiClient.delete(`/watchlists/${id}`);
    return res.success;
  }

  /**
   * Fetch complete watchlist overview (all or specific watchlist) with range
   */
  async fetchOverview(
    watchlistId: string | 'all' = 'all',
    range: '1D' | '1W' | '1M' = '1D'
  ): Promise<WatchlistOverviewData | null> {
    const endpoint =
      watchlistId === 'all'
        ? `/watchlists/all/overview?range=${range}`
        : `/watchlists/${watchlistId}/overview?range=${range}`;

    const res = await apiClient.get<WatchlistOverviewData>(endpoint);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  /**
   * Lightweight price polling — returns price/change/updatedAt for a watchlist.
   * Use for 30-60s polling during market hours instead of full overview refresh.
   * Prices from DB are Yahoo Finance sourced (15-min delayed for NSE/BSE).
   */
  async fetchQuotes(watchlistId: string | 'all' = 'all'): Promise<{
    quotes: Array<{
      symbol: string;
      price: number | null;
      changeAmount: number | null;
      changePercent: number | null;
      exchange: string;
      currency: string;
      updatedAt: string;
      isDelayed: boolean;
    }>;
    providerName: string;
    timestamp: string;
  } | null> {
    const endpoint =
      watchlistId === 'all'
        ? '/watchlists/all/quotes'
        : `/watchlists/${watchlistId}/quotes`;

    const res = await apiClient.get<any>(endpoint);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  /**
   * Add a stock to a specific watchlist
   */
  async addStockToWatchlist(watchlistId: string, symbol: string): Promise<boolean> {
    const res = await apiClient.post(`/watchlists/${watchlistId}/stocks`, { symbol });
    return res.success;
  }

  /**
   * Remove a stock from a specific watchlist
   */
  async removeStockFromWatchlist(watchlistId: string, symbol: string): Promise<boolean> {
    const res = await apiClient.delete(`/watchlists/${watchlistId}/stocks/${symbol}`);
    return res.success;
  }

  /**
   * Toggle pin status for a stock in a specific watchlist
   */
  async togglePinInWatchlist(watchlistId: string, symbol: string): Promise<boolean> {
    const res = await apiClient.patch(`/watchlists/${watchlistId}/stocks/${symbol}/pin`, {});
    return res.success;
  }

  // ==========================================
  // Legacy Watchlist Methods (Backward Compatibility)
  // ==========================================

  async fetchWatchlist(watchlistId?: string): Promise<StockQuote[] | null> {
    if (!watchlistId || watchlistId === 'all') {
      const overview = await this.fetchOverview('all');
      if (overview && Array.isArray(overview.stocks)) {
        return overview.stocks.map((item) => ({
          symbol: item.symbol,
          name: item.companyName,
          companyName: item.companyName,
          sector: item.sector,
          exchange: item.exchange,
          currency: item.currency,
          currentPrice: item.currentPrice,
          changeAmount: item.changeAmount,
          changePercent: item.changePercent,
          isPinned: item.isPinned,
          volume: 0,
          avgVolume20D: 0,
          marketCap: 'N/A',
          high52w: 0,
          low52w: 0,
          sparkline: item.sparkline,
          updatedAt: item.addedAt,
        } as unknown as StockQuote));
      }
    }
    const qs = watchlistId ? `?watchlistId=${watchlistId}` : '';
    const res = await apiClient.get<WatchlistApiResponse>(`/watchlist${qs}`);

    if (res.success && res.data && res.data.stocks) {
      return res.data.stocks.map((item) => ({
        ...item.stock,
        isPinned: item.isPinned,
      }));
    }
    return null;
  }

  async addStock(symbol: string, watchlistId?: string): Promise<boolean> {
    const res = await apiClient.post('/watchlist/add-stock', { symbol, watchlistId });
    return res.success;
  }

  async removeStock(symbol: string, watchlistId?: string): Promise<boolean> {
    const res = await apiClient.delete('/watchlist/remove-stock', { symbol, watchlistId });
    return res.success;
  }

  async setupWatchlist(data: { name?: string; symbols: string[] }): Promise<boolean> {
    const res = await apiClient.post('/watchlist/setup', data);
    return res.success;
  }

  async togglePin(symbol: string, watchlistId?: string): Promise<boolean> {
    const res = await apiClient.patch('/watchlist/pin-stock', { symbol, watchlistId });
    return res.success;
  }
}

export const watchlistService = new WatchlistService();
