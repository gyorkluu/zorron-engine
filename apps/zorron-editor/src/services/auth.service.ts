/**
 * Auth service: register, login, refresh, logout, me.
 */

import { http } from './api';
import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from '@/types/auth';

/** Register a new account. */
export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return http.post<AuthResponse>('/api/auth/register', payload);
}

/** Login with email/password. */
export function login(payload: LoginPayload): Promise<AuthResponse> {
  return http.post<AuthResponse>('/api/auth/login', payload);
}

/** Refresh the access token using the httpOnly refresh cookie. */
export function refresh(): Promise<{ token: string }> {
  return http.post<{ token: string }>('/api/auth/refresh');
}

/** Logout and clear the refresh cookie. */
export function logout(): Promise<void> {
  return http.post<void>('/api/auth/logout');
}

/** Fetch the current authenticated user. */
export function fetchMe(): Promise<AuthUser> {
  return http.get<AuthUser>('/api/auth/me');
}
