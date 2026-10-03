import { apiClient } from './apiClient';
import {
  FeedItem,
  FeedItemDetails,
  FeedSummary,
  FeedTimeWindow,
} from '../types/feed';

export class FeedApiService {
  async getFeed(options?: {
    cursor?: string;
    limit?: number;
    window?: FeedTimeWindow;
    watchlistId?: string;
    symbol?: string;
    priority?: string;
    type?: string;
    unreadOnly?: boolean;
    savedOnly?: boolean;
    q?: string;
  }): Promise<{ items: FeedItem[]; nextCursor: string | null; hasMore: boolean; total: number; unreadCount: number } | null> {
    const params = new URLSearchParams();
    if (options?.cursor) params.append('cursor', options.cursor);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.window) params.append('window', options.window);
    if (options?.watchlistId && options.watchlistId !== 'all') params.append('watchlistId', options.watchlistId);
    if (options?.symbol) params.append('symbol', options.symbol);
    if (options?.priority && options.priority !== 'ALL') params.append('priority', options.priority);
    if (options?.type && options.type !== 'ALL') params.append('type', options.type);
    if (options?.unreadOnly) params.append('unreadOnly', 'true');
    if (options?.savedOnly) params.append('savedOnly', 'true');
    if (options?.q) params.append('q', options.q);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<{ items: FeedItem[]; nextCursor: string | null; hasMore: boolean; total: number; unreadCount: number }>(`/feed${qs}`);

    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async getSummary(): Promise<FeedSummary | null> {
    const res = await apiClient.get<FeedSummary>('/feed/summary');
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async getItemDetails(
    eventId: string,
    tab?: 'happened' | 'why' | 'matters' | 'sources' | 'price' | 'alert' | 'all'
  ): Promise<FeedItemDetails | null> {
    const qs = tab ? `?tab=${tab}` : '';
    const res = await apiClient.get<FeedItemDetails>(`/feed/items/${eventId}/details${qs}`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async markRead(eventIds?: string[]): Promise<boolean> {
    const res = await apiClient.post('/feed/mark-read', { eventIds });
    return res.success;
  }

  async markItemRead(eventId: string): Promise<boolean> {
    const res = await apiClient.post(`/feed/items/${eventId}/mark-read`);
    return res.success;
  }

  async toggleSave(eventId: string): Promise<{ isSaved: boolean } | null> {
    const res = await apiClient.post<{ isSaved: boolean }>(`/feed/items/${eventId}/save`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async markCaughtUp(): Promise<{ success: boolean; unreadClusters: number } | null> {
    const res = await apiClient.post<{ success: boolean; unreadClusters: number }>('/feed/caught-up');
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }
}

export const feedApiService = new FeedApiService();
