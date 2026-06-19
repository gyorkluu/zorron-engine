/**
 * Auth store (Zustand) - holds the authenticated user and access token.
 */

import { create } from 'zustand';
import type { AuthUser } from '@/types/auth';
import {
  getAuthToken,
  setAuthToken,
  AUTH_USER_KEY,
} from '@/services/api';
import * as authService from '@/services/auth.service';
import type { LoginPayload, RegisterPayload } from '@/types/auth';
import { AppError } from '@/lib/errors';

/** Auth store state shape. */
interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  clearError: () => void;
}

/** Read a cached user from localStorage (best-effort). */
function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

/** Persist a user to localStorage. */
function writeCachedUser(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: readCachedUser(),
  token: getAuthToken(),
  isAuthenticated: getAuthToken() !== null,
  isLoading: false,
  error: null,

  login: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.login(payload);
      setAuthToken(res.token);
      writeCachedUser(res.user);
      set({ user: res.user, token: res.token, isAuthenticated: true, isLoading: false });
      return res.user;
    } catch (err) {
      const message = err instanceof AppError ? err.message : '登录失败';
      set({ isLoading: false, error: message, isAuthenticated: false });
      throw err;
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.register(payload);
      setAuthToken(res.token);
      writeCachedUser(res.user);
      set({ user: res.user, token: res.token, isAuthenticated: true, isLoading: false });
      return res.user;
    } catch (err) {
      const message = err instanceof AppError ? err.message : '注册失败';
      set({ isLoading: false, error: message, isAuthenticated: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // Best-effort: clear local state even if the server call fails.
    }
    setAuthToken(null);
    writeCachedUser(null);
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  bootstrap: async () => {
    const token = getAuthToken();
    if (!token) {
      set({ isAuthenticated: false });
      return;
    }
    set({ isLoading: true });
    try {
      const user = await authService.fetchMe();
      writeCachedUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      setAuthToken(null);
      writeCachedUser(null);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
