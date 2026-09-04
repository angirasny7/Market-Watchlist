import { apiClient } from './apiClient';
import { MarketEvent } from '../types/event';

export class EventService {
  async fetchEvents(options?: {
    symbol?: string;
    priority?: string;
    eventType?: string;
    sinceLastVisit?: boolean;
    unreadOnly?: boolean;
    watchlistOnly?: boolean;
  }): Promise<any[] | null> {
    const params = new URLSearchParams();
    if (options?.symbol) params.append('symbol', options.symbol);
    if (options?.priority) params.append('priority', options.priority);
    if (options?.eventType) params.append('eventType', options.eventType);
    if (options?.sinceLastVisit) params.append('sinceLastVisit', 'true');
    if (options?.unreadOnly) params.append('unreadOnly', 'true');
    if (options?.watchlistOnly) params.append('watchlistOnly', 'true');

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<MarketEvent[]>(`/events${qs}`);

    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async markEventRead(id: string): Promise<boolean> {
    const res = await apiClient.patch(`/events/${id}/read`);
    return res.success;
  }

  async acknowledgeEvent(id: string): Promise<boolean> {
    const res = await apiClient.patch(`/events/${id}/acknowledge`);
    return res.success;
  }

  async markAllRead(): Promise<boolean> {
    const res = await apiClient.patch('/events/mark-all-read');
    return res.success;
  }
}

export const eventService = new EventService();
