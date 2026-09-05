import { apiClient } from './apiClient';
import { StockQuote } from '../types/stock';

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
  async fetchWatchlist(watchlistId?: string): Promise<StockQuote[] | null> {
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
