import { apiClient } from './apiClient';
import { detectCurrentDevice } from '../lib/deviceUtils';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
  isOnboarded?: boolean;
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
  userState?: {
    lastLoginAt: string;
    lastLogoutAt?: string | null;
    lastActivityAt: string;
    previousSessionAt?: string | null;
    currentDeviceType?: string;
    currentDeviceName?: string;
    previousDeviceType?: string | null;
    previousDeviceName?: string | null;
    lastDigestViewedId?: string;
    lastDigestAcknowledgedId?: string;
  };
  watchlists?: any[];
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
  isOnboarded?: boolean;
  userState?: any;
  defaultWatchlistId?: string;
}

export class AuthService {
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const device = detectCurrentDevice();
    const res = await apiClient.post<AuthResponse>('/auth/login', {
      ...credentials,
      deviceInfo: { type: device.type, name: device.name },
    });
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Login failed');
    }
    apiClient.setToken(res.data.token);
    return res.data;
  }

  async register(data: { name: string; email: string; password: string }): Promise<AuthResponse> {
    const device = detectCurrentDevice();
    const res = await apiClient.post<AuthResponse>('/auth/register', {
      ...data,
      deviceInfo: { type: device.type, name: device.name },
    });
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Registration failed');
    }
    apiClient.setToken(res.data.token);
    return res.data;
  }

  async getCurrentUser(): Promise<UserProfile> {
    const res = await apiClient.get<UserProfile>('/auth/me');
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to fetch user profile');
    }
    return res.data;
  }

  removeToken(): void {
    apiClient.removeToken();
  }

  async logout(): Promise<void> {
    try {
      const device = detectCurrentDevice();
      // Send authenticated logout request while token is still attached
      await apiClient.post('/auth/logout', {
        deviceInfo: { type: device.type, name: device.name },
      });
    } catch (err) {
      // Ignore network errors during logout
      console.warn('[AuthService] Logout notification warning:', err);
    } finally {
      // Reliably purge token from localStorage and apiClient memory
      apiClient.removeToken();
    }
  }

  async heartbeat(): Promise<void> {
    await apiClient.patch('/auth/heartbeat');
  }

  isAuthenticated(): boolean {
    return Boolean(apiClient.getToken());
  }

  getToken(): string | null {
    return apiClient.getToken();
  }
}

export const authService = new AuthService();
