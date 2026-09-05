import { apiClient } from './apiClient';
import { ArchivedMarketEvent, MemoryQueryParams } from '../types/memory';

export class FrontendMemoryService {
  async fetchArchivedEvents(params?: MemoryQueryParams): Promise<ArchivedMarketEvent[]> {
    const qs = new URLSearchParams();
    if (params?.memoryType) qs.append('memoryType', params.memoryType);
    if (params?.dateRange) qs.append('dateRange', params.dateRange);
    if (params?.startDate) qs.append('startDate', params.startDate);
    if (params?.endDate) qs.append('endDate', params.endDate);
    if (params?.symbol) qs.append('symbol', params.symbol);
    if (params?.watchlistOnly) qs.append('watchlistOnly', 'true');
    if (params?.eventType) qs.append('eventType', params.eventType);
    if (params?.marketMood) qs.append('marketMood', params.marketMood);
    if (params?.search) qs.append('search', params.search);
    if (params?.limit) qs.append('limit', params.limit.toString());

    const queryString = qs.toString() ? `?${qs.toString()}` : '';
    const res = await apiClient.get<ArchivedMarketEvent[]>(`/memory/events${queryString}`);
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  }

  async fetchMemoryCounts(): Promise<{ archivedCount: number; savedCount: number; totalCount: number } | null> {
    const res = await apiClient.get<{ archivedCount: number; savedCount: number; totalCount: number }>('/memory/counts');
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async fetchArchivedDigests(params?: { search?: string; limit?: number }): Promise<any[]> {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    if (params?.limit) qs.append('limit', params.limit.toString());

    const queryString = qs.toString() ? `?${qs.toString()}` : '';
    const res = await apiClient.get<any[]>(`/memory/digests${queryString}`);
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  }
}

export const memoryService = new FrontendMemoryService();
