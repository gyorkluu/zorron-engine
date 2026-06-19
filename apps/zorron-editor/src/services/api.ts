/**
 * Unified HTTP client for the Zorron Editor.
 *
 * Wraps axios with:
 * - Base URL from `VITE_API_BASE_URL` (never hardcoded).
 * - Request interceptor: injects `Authorization: Bearer <token>` from localStorage.
 * - Response interceptor: unwraps data, normalizes errors into `AppError`.
 * - Refresh-token rotation on 401 (best-effort, single-flight).
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  AxiosError,
} from 'axios';
import { AppError, type AppErrorShape } from '@/lib/errors';

/** Base API URL injected at build time. Never hardcode. */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

/** localStorage keys for auth persistence. */
export const AUTH_TOKEN_KEY = 'zorron.auth.token';
export const AUTH_USER_KEY = 'zorron.auth.user';

/** Re-export the error shape for consumers. */
export type { AppErrorShape as AppError };

/** Token accessor used by the interceptor. Decoupled from authStore to avoid cycles. */
let cachedToken: string | null = null;

/** Cache the access token in memory for the interceptor. */
export function setAuthToken(token: string | null): void {
  cachedToken = token;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

/** Read the cached token (falls back to localStorage on cold start). */
export function getAuthToken(): string | null {
  if (cachedToken) return cachedToken;
  cachedToken = localStorage.getItem(AUTH_TOKEN_KEY);
  return cachedToken;
}

/** Convert an axios error into a normalized AppError instance. */
function toAppError(error: unknown): AppError {
  if (error instanceof AxiosError && error.response) {
    const body = error.response.data as Partial<AppErrorShape> | undefined;
    return new AppError({
      code: body?.code ?? 'HTTP_ERROR',
      message: body?.message ?? error.message,
      details: body?.details,
      requestId: body?.requestId ?? (error.response.headers['x-request-id'] as string) ?? '',
      status: error.response.status,
    });
  }
  if (error instanceof AxiosError && error.request) {
    return new AppError({
      code: 'NETWORK_ERROR',
      message: '网络错误：无法连接到服务器。',
      requestId: '',
      status: 0,
    });
  }
  return new AppError({
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : '未知错误',
    requestId: '',
    status: 0,
  });
}

/** Singleton axios instance. */
const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send httpOnly refresh-token cookie
});

// Request interceptor: attach bearer token.
client.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: unwrap data, normalize errors.
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (AxiosRequestConfig & { _retried?: boolean })
      | undefined;

    // Attempt a single token refresh on 401 when not already retried and not on the auth endpoints.
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !original.url?.includes('/api/auth/')
    ) {
      original._retried = true;
      try {
        const refreshRes = await axios.post<{ token: string }>(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const newToken = refreshRes.data.token;
        setAuthToken(newToken);
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization =
          `Bearer ${newToken}`;
        return client(original);
      } catch {
        setAuthToken(null);
      }
    }

    return Promise.reject(toAppError(error));
  },
);

/** Typed request helpers that unwrap the axios response. */
export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    client.get<T>(url, config).then((r: AxiosResponse<T>) => r.data),

  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    client.post<T>(url, body, config).then((r: AxiosResponse<T>) => r.data),

  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    client.patch<T>(url, body, config).then((r: AxiosResponse<T>) => r.data),

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    client.delete<T>(url, config).then((r: AxiosResponse<T>) => r.data),
};

export { client as axiosClient };
