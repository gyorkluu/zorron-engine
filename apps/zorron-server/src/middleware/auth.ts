import { Elysia } from 'elysia';
import { jwtVerify } from 'jose';
import { env } from '../config/env';
import { AppError } from '../shared/errors';

/**
 * Authenticated user context injected by the auth plugin.
 */
export interface AuthUser {
  id: string;
  email: string;
}

/**
 * [Elysia derive]: validates the optional Bearer access token and injects a
 * `user` object into the request context. Protected routes should check that
 * `user` is not null and throw `AUTH_001` when it is missing.
 */
export const authPlugin = new Elysia({ name: 'auth' }).derive(
  { as: 'global' },
  async ({ headers }): Promise<{ user: AuthUser | null }> => {
    const authHeader = headers?.authorization ?? headers?.Authorization;
    const token =
      typeof authHeader === 'string'
        ? authHeader.replace(/^Bearer\s+/i, '')
        : undefined;

    if (!token) {
      return { user: null };
    }

    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(env.JWT_SECRET),
        {
          algorithms: ['HS256'],
        },
      );

      const userId = payload.sub;
      const email = payload.email;

      if (typeof userId !== 'string' || typeof email !== 'string') {
        throw new AppError('AUTH_002', 'Invalid access token', 401);
      }

      return { user: { id: userId, email } };
    } catch {
      throw new AppError('AUTH_002', 'Invalid access token', 401);
    }
  },
);

/**
 * Route-level guard that enforces an authenticated user context.
 */
export function requireAuth({ user }: { user: AuthUser | null }) {
  if (!user) {
    throw new AppError('AUTH_001', 'Unauthorized', 401);
  }
}
