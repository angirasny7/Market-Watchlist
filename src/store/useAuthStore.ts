import { create } from 'zustand';
import { authService, UserProfile } from '../services/authService';
import { useMarketStore } from './useMarketStore';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  setOnboarded: (status: boolean) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: authService.getToken(),
  isAuthenticated: Boolean(authService.getToken()),
  isLoading: Boolean(authService.getToken()),
  error: null,

  loadCurrentUser: async () => {
    const token = authService.getToken();
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      const user = await authService.getCurrentUser();

      // Guard: Ensure user did not log out while this async request was in flight!
      const currentToken = authService.getToken();
      if (!currentToken) {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null });
        return;
      }

      set({
        user,
        token: currentToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch {
      // Token is invalid or expired
      authService.removeToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const res = await authService.login({ email, password });
      set({
        user: res.user,
        token: res.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err: any) {
      set({
        error: err.message || 'Invalid email or password',
        isLoading: false,
      });
      return false;
    }
  },

  register: async (name: string, email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const res = await authService.register({ name, email, password });
      set({
        user: res.user,
        token: res.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch (err: any) {
      set({
        error: err.message || 'Registration failed',
        isLoading: false,
      });
      return false;
    }
  },

  logout: async () => {
    // 1. Notify backend with authenticated token before clearing local state
    try {
      await authService.logout();
    } catch {
      // Ignore network errors during logout
    }

    // 2. Ensure token is cleared synchronously
    authService.removeToken();

    // 3. Synchronously clear auth state
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    // 4. Synchronously purge market store session intelligence data
    try {
      useMarketStore.getState().resetMarketStore();
    } catch {
      // Ignore
    }
  },

  setOnboarded: (status: boolean) => {
    set((state) => ({
      user: state.user ? { ...state.user, isOnboarded: status } : null,
    }));
  },

  clearError: () => set({ error: null }),
}));
