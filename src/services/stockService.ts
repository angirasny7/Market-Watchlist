import { apiClient } from './apiClient';
import { StockQuote } from '../types/stock';

export class StockService {
  async getAllStocks(query?: { sector?: string; search?: string }): Promise<StockQuote[] | null> {
    const params = new URLSearchParams();
    if (query?.sector) params.append('sector', query.sector);
    if (query?.search) params.append('search', query.search);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<StockQuote[]>(`/stocks${qs}`);

    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async getStockBySymbol(symbol: string): Promise<StockQuote | null> {
    const res = await apiClient.get<StockQuote>(`/stocks/${symbol}`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }
}

export const stockService = new StockService();
