import { apiClient } from './apiClient';
import { ArchivedMarketEvent, MemoryQueryParams, MemoryCounts } from '../types/memory';

export class FrontendMemoryService {
  /**
   * Primary query method for Market Memory
   */
  async getMemory(params?: MemoryQueryParams): Promise<{
    items: ArchivedMarketEvent[];
    total: number;
    hasMore: boolean;
    nextCursor: string | null;
    counts: MemoryCounts;
  }> {
    const qs = new URLSearchParams();
    if (params?.tab) qs.append('tab', params.tab);
    if (params?.search) qs.append('search', params.search);
    if (params?.stock) qs.append('stock', params.stock);
    if (params?.watchlistId) qs.append('watchlistId', params.watchlistId);
    if (params?.priority) qs.append('priority', params.priority);
    if (params?.eventType) qs.append('eventType', params.eventType);
    if (params?.startDate) qs.append('startDate', params.startDate);
    if (params?.endDate) qs.append('endDate', params.endDate);
    if (params?.dateFilterType) qs.append('dateFilterType', params.dateFilterType);
    if (params?.hasNote !== undefined) qs.append('hasNote', params.hasNote ? 'true' : 'false');
    if (params?.sortBy) qs.append('sortBy', params.sortBy);
    if (params?.cursor) qs.append('cursor', params.cursor);
    if (params?.limit) qs.append('limit', params.limit.toString());

    const queryString = qs.toString() ? `?${qs.toString()}` : '';
    const res = await apiClient.get<any>(`/memory${queryString}`);
    if (res.success && res.data) {
      return {
        items: res.data.items || [],
        total: res.data.total ?? (res.data.items?.length || 0),
        hasMore: Boolean(res.data.hasMore),
        nextCursor: res.data.nextCursor || null,
        counts: res.data.counts || {
          savedCount: 0,
          readCount: 0,
          deletedCount: 0,
          totalCount: 0,
        },
      };
    }
    return {
      items: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
      counts: { savedCount: 0, readCount: 0, deletedCount: 0, totalCount: 0 },
    };
  }

  /**
   * Single source of truth for Memory counters
   */
  async fetchMemoryCounts(): Promise<MemoryCounts | null> {
    const res = await apiClient.get<MemoryCounts>('/memory/counts');
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  /**
   * Update or remove private note on a saved item
   */
  async updateNote(eventId: string, note: string | null): Promise<{ success: boolean; note: string | null }> {
    const res = await apiClient.post<{ success: boolean; note: string | null }>(`/memory/items/${eventId}/note`, { note });
    if (res.success && res.data) {
      return res.data;
    }
    return { success: false, note: null };
  }

  /**
   * Restore item from memory back into unhandled Attention Feed (as unread)
   */
  async restoreToFeed(eventId: string): Promise<{ success: boolean; undoToken?: string }> {
    const res = await apiClient.post<{ success: boolean; undoToken?: string }>(`/memory/items/${eventId}/restore-to-feed`, {});
    if (res.success && res.data) {
      return res.data;
    }
    return { success: false };
  }

  /**
   * Permanently delete item from Deleted section
   */
  async permanentlyDeleteItem(eventId: string): Promise<{ success: boolean; eventId: string }> {
    const res = await apiClient.post<{ success: boolean; eventId: string }>(`/memory/items/${eventId}/permanent-delete`, {});
    if (res.success && res.data) {
      return res.data;
    }
    return { success: false, eventId };
  }

  /**
   * Backward-compatibility aliases
   */
  async fetchArchivedEvents(params?: MemoryQueryParams): Promise<ArchivedMarketEvent[]> {
    const res = await this.getMemory(params);
    return res.items;
  }

  async fetchArchivedDigests(_params?: { search?: string; limit?: number }): Promise<any[]> {
    return [];
  }
}

export const memoryService = new FrontendMemoryService();

