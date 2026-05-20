import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  shopId: string | null;
  branchId: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshTokens: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: async (email, password) => {
        const res = await axios.post(`${BASE_URL}/api/v1/auth/login`, { email, password });
        const { accessToken, refreshToken } = res.data.data;
        const meRes = await axios.get(`${BASE_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        set({ accessToken, refreshToken, user: meRes.data.data });
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');
        const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken });
        const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
        set({ accessToken: newAccess, refreshToken: newRefresh });
      },
    }),
    {
      name: 'autoparts-auth',
      partialize: (s) => ({ refreshToken: s.refreshToken, user: s.user }),
    },
  ),
);
