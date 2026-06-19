import { Elysia } from 'elysia';
import * as controller from './auth.controller';
import { AppError } from '../../shared/errors';
import { authPlugin } from '../../middleware/auth';
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  AuthResponseSchema,
  RefreshResponseSchema,
  UserResponseSchema,
} from './auth.schema';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

interface CookieSet {
  cookie?: Record<string, unknown>;
}

interface CookieValue {
  value?: string;
}

/**
 * Sets the httpOnly refresh token cookie.
 */
function setRefreshCookie(set: CookieSet, token: string): void {
  if (!set.cookie) {
    set.cookie = {};
  }
  set.cookie[REFRESH_COOKIE_NAME] = {
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: '/',
  };
}

/**
 * Clears the refresh token cookie on logout.
 */
function clearRefreshCookie(set: CookieSet): void {
  if (!set.cookie) {
    set.cookie = {};
  }
  set.cookie[REFRESH_COOKIE_NAME] = {
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  };
}

/**
 * Reads the raw refresh token from the request cookie.
 */
function readRefreshCookie(
  cookie: Record<string, CookieValue | undefined>,
): string | undefined {
  return cookie[REFRESH_COOKIE_NAME]?.value;
}

/**
 * [Elysia]: authentication routes.
 */
export const authRoute = new Elysia({ prefix: '/api/auth' })
  .use(authPlugin)
  .post(
    '/register',
    async ({ body, set }) => {
      const result = await controller.register(body);
      set.status = 201;
      setRefreshCookie(set, result.refreshToken);
      return { user: result.user, token: result.accessToken };
    },
    {
      body: RegisterRequestSchema,
      response: AuthResponseSchema,
    },
  )
  .post(
    '/login',
    async ({ body, set }) => {
      const result = await controller.login(body);
      setRefreshCookie(set, result.refreshToken);
      return { user: result.user, token: result.accessToken };
    },
    {
      body: LoginRequestSchema,
      response: AuthResponseSchema,
    },
  )
  .post(
    '/refresh',
    async ({ cookie, set }) => {
      const rawToken = readRefreshCookie(cookie as Record<string, CookieValue | undefined>);
      if (!rawToken) {
        throw new AppError('AUTH_002', 'Invalid refresh token', 401);
      }
      const result = await controller.refresh(rawToken);
      setRefreshCookie(set, result.refreshToken);
      return { token: result.accessToken };
    },
    {
      response: RefreshResponseSchema,
    },
  )
  .post(
    '/logout',
    async ({ cookie, set }) => {
      const rawToken = readRefreshCookie(cookie as Record<string, CookieValue | undefined>);
      await controller.logout(rawToken);
      clearRefreshCookie(set);
      return new Response(null, { status: 204 });
    },
  )
  .get(
    '/me',
    async ({ user }) => {
      if (!user) {
        throw new AppError('AUTH_001', 'Unauthorized', 401);
      }
      return controller.me(user.id);
    },
    {
      response: UserResponseSchema,
    },
  );
