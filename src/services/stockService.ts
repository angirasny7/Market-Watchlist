import { apiClient } from './apiClient';
import { StockQuote } from '../types/stock';

export type StockChartRange = '1D' | '1W' | '1M' | '1Y' | 'ALL';

export interface StockHistoryDataPoint {
  time: number; // Unix timestamp in seconds for lightweight-charts
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockHistoryData {
  symbol: string;
  range: StockChartRange;
  currency: string;
  currentPrice: number;
  changePercent: number;
  dataPoints: StockHistoryDataPoint[];
}

export interface StockDetailsExtended extends StockQuote {
  events?: Array<{
    id: string;
    headline: string;
    priority: string;
    timestamp: string;
    metricsDelta?: any;
    insights?: Array<{
      id: string;
      title: string;
      explanation: string;
    }>;
  }>;
  news?: Array<{
    id: string;
    title: string;
    source: string;
    publishedAt: string;
    url?: string;
  }>;
}

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

  async getStockBySymbol(symbol: string): Promise<StockDetailsExtended | null> {
    const res = await apiClient.get<StockDetailsExtended>(`/stocks/${symbol}`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async getStockHistory(
    symbol: string,
    range: StockChartRange = '1M'
  ): Promise<StockHistoryData | null> {
    const res = await apiClient.get<StockHistoryData>(`/stocks/${symbol}/history?range=${range}`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }
}

export const stockService = new StockService();
