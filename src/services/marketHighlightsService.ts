import { apiClient } from './apiClient';
import { MarketHighlightsData } from '../types/market';

export const marketHighlightsService = {
  async getMarketHighlights(): Promise<MarketHighlightsData> {
    const res = await apiClient.get<MarketHighlightsData>('/market/highlights');
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to retrieve market highlights from backend');
    }
    return res.data;
  },

  async syncUniverse(): Promise<{ success: boolean; stocksSynced: number }> {
    const res = await apiClient.post<{ success: boolean; stocksSynced: number }>('/market/sync', {});
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to sync universe');
    }
    return res.data;
  },
};
