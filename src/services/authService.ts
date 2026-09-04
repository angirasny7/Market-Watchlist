import { apiClient } from './apiClient';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
  userState?: {
    lastLoginAt: string;
    lastActivityAt: string;
    lastDigestViewedId?: string;
    lastDigestAcknowledgedId?: string;
  };
  watchlists?: any[];
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
  userState?: any;
  defaultWatchlistId?: string;
}

export class AuthService {
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Login failed');
    }
    apiClient.setToken(res.data.token);
    return res.data;
  }

  async register(data: { name: string; email: string; password: string }): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
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

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
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
