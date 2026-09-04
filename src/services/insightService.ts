import { apiClient } from './apiClient';
import { Insight } from '../types/insight';

export class InsightService {
  async fetchInsights(minConfidence?: number): Promise<Insight[] | null> {
    const qs = minConfidence ? `?minConfidence=${minConfidence}` : '';
    const res = await apiClient.get<Insight[]>(`/insights${qs}`);

    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async fetchInsightsByEvent(eventId: string): Promise<Insight[] | null> {
    const res = await apiClient.get<Insight[]>(`/insights/${eventId}`);

    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }
}

export const insightService = new InsightService();
