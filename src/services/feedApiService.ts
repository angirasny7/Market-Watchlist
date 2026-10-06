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

  async getSummary(window?: FeedTimeWindow): Promise<FeedSummary | null> {
    const qs = window ? `?window=${window}` : '';
    const res = await apiClient.get<FeedSummary>(`/feed/summary${qs}`);
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

  async markRead(eventIds?: string[]): Promise<{ success: boolean; count: number; undoToken?: string } | null> {
    const res = await apiClient.post<{ success: boolean; count: number; undoToken?: string }>('/feed/mark-read', { eventIds });
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async markItemRead(eventId: string): Promise<{ success: boolean; undoToken?: string } | null> {
    const res = await apiClient.post<{ success: boolean; undoToken?: string }>(`/feed/items/${eventId}/mark-read`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async saveItem(eventId: string): Promise<{ success: boolean; isSaved: boolean; undoToken?: string } | null> {
    const res = await apiClient.post<{ success: boolean; isSaved: boolean; undoToken?: string }>(`/feed/items/${eventId}/save`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async toggleSave(eventId: string): Promise<{ isSaved: boolean; undoToken?: string } | null> {
    const res = await apiClient.post<{ isSaved: boolean; undoToken?: string }>(`/feed/items/${eventId}/save`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async unsaveItem(eventId: string): Promise<{ success: boolean; isSaved: boolean; undoToken?: string } | null> {
    const res = await apiClient.post<{ success: boolean; isSaved: boolean; undoToken?: string }>(`/feed/items/${eventId}/unsave`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async recordFeedViewed(): Promise<{ viewedAt: string } | null> {
    const res = await apiClient.post<{ viewedAt: string }>('/feed/viewed');
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async deleteItem(eventId: string): Promise<{ success: boolean; count: number; undoToken?: string } | null> {
    const res = await apiClient.post<{ success: boolean; count: number; undoToken?: string }>(`/feed/items/${eventId}/delete`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async restoreItem(eventId: string): Promise<{ success: boolean; undoToken?: string } | null> {
    const res = await apiClient.post<{ success: boolean; undoToken?: string }>(`/feed/items/${eventId}/restore`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async undoAction(undoToken: string): Promise<{ success: boolean; action?: string; reversedCount?: number } | null> {
    const res = await apiClient.post<{ success: boolean; action?: string; reversedCount?: number }>('/feed/undo', { undoToken });
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async getCounts(): Promise<any | null> {
    const res = await apiClient.get<any>('/feed/counts');
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async markCaughtUp(): Promise<{ success: boolean; count: number; undoToken?: string } | null> {
    const res = await apiClient.post<{ success: boolean; count: number; undoToken?: string }>('/feed/caught-up');
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }
}

export const feedApiService = new FeedApiService();
