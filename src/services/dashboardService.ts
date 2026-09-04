import { apiClient } from './apiClient';

export interface DashboardIntelligence {
  awayDuration: string;
  attentionSummary: string;
  criticalEvents: any[];
  topInsights: any[];
  latestDigest: any | null;
  marketMood: string;
  greeting?: string;
  userName?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
  watchlistSummary?: {
    symbols: string[];
    eventsCount: number;
    criticalCount: number;
  };
}

export interface UserStateResponse {
  userId: string;
  userName?: string;
  email?: string;
  lastLoginAt: string;
  lastActivityAt: string;
  unreadEvents: number;
  unreadDigests: number;
  lastDigestViewedId?: string;
  lastDigestAcknowledgedId?: string;
}

export class DashboardService {
  async getDashboard(): Promise<DashboardIntelligence | null> {
    const res = await apiClient.get<DashboardIntelligence>('/dashboard');
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  async getUserState(): Promise<UserStateResponse | null> {
    const res = await apiClient.get<UserStateResponse>('/user/state');
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }
}

export const dashboardService = new DashboardService();
