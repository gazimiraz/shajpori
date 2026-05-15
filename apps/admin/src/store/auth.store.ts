import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setAuthToken } from '@/lib/api';
import type { AuthUser } from '@shaj/types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  updateUser: (user: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isInitialized: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const { user, accessToken, refreshToken } = data.data;
          setAuthToken(accessToken);
          set({ user, accessToken, refreshToken, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {}
        setAuthToken(null);
        set({ user: null, accessToken: null, refreshToken: null });
      },

      initialize: async () => {
        const { accessToken, refreshToken } = get();
        if (!accessToken) {
          set({ isInitialized: true });
          return;
        }
        try {
          setAuthToken(accessToken);
          const { data } = await api.get('/auth/me');
          set({ user: data.data, isInitialized: true });
        } catch {
          if (refreshToken) {
            try {
              await get().refreshTokens();
              set({ isInitialized: true });
            } catch {
              set({ user: null, accessToken: null, refreshToken: null, isInitialized: true });
            }
          } else {
            set({ user: null, accessToken: null, refreshToken: null, isInitialized: true });
          }
        }
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await api.post('/auth/refresh', { refreshToken });
        const { accessToken: newAccess, refreshToken: newRefresh } = data.data;
        setAuthToken(newAccess);
        set({ accessToken: newAccess, refreshToken: newRefresh });
        const { data: meData } = await api.get('/auth/me');
        set({ user: meData.data });
      },

      updateUser: (updates) => {
        set(state => ({ user: state.user ? { ...state.user, ...updates } : null }));
      },
    }),
    {
      name: 'shaj-admin-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
);
