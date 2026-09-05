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
  lastLoginAt?: string | null;
  previousLoginAt?: string | null;
  previousSessionAt?: string | null;
  lastLogoutAt?: string | null;
  currentDevice?: {
    deviceType: string;
    deviceName: string;
  };
  previousDevice?: {
    deviceType: string;
    deviceName: string;
  } | null;
  eventsAwayCount?: number;
  insightsAwayCount?: number;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    lastLoginAt?: string | null;
    previousLoginAt?: string | null;
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
  previousLoginAt?: string | null;
  previousSessionAt?: string | null;
  lastLogoutAt?: string | null;
  lastActivityAt: string;
  currentDevice?: {
    deviceType: string;
    deviceName: string;
  };
  previousDevice?: {
    deviceType: string;
    deviceName: string;
  } | null;
  unreadEvents: number;
  unreadDigests: number;
  archivedEventsCount?: number;
  savedEventsCount?: number;
  totalMemoryCount?: number;
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
