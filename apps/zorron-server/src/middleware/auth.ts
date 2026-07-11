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
  /** SCALE-001: Tenant this user belongs to (null for platform admins). */
  tenantId?: string | null;
}

/**
 * Default dev user injected when AUTH_DEV_BYPASS is enabled and no valid
 * token is present. Allows local development / demos without logging in.
 */
const DEV_USER: AuthUser = Object.freeze({
  id: env.AUTH_DEV_USER_ID,
  email: env.AUTH_DEV_USER_EMAIL,
  tenantId: null,
});

/**
 * [Elysia derive]: validates the optional Bearer access token and injects a
 * `user` object into the request context. Protected routes should check that
 * `user` is not null and throw `AUTH_001` when it is missing.
 *
 * Dev bypass: when `AUTH_DEV_BYPASS=true`, requests without a valid token are
 * assigned the default dev user identity. A valid Bearer token always takes
 * precedence. This must NEVER be enabled in production.
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
      // Dev bypass: no token → default dev user.
      if (env.AUTH_DEV_BYPASS) {
        return { user: DEV_USER };
      }
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
      const tenantId =
        typeof payload.tenantId === 'string' ? payload.tenantId : null;

      if (typeof userId !== 'string' || typeof email !== 'string') {
        throw new AppError('AUTH_002', 'Invalid access token', 401);
      }

      return { user: { id: userId, email, tenantId } };
    } catch {
      // Dev bypass: invalid token → fall back to dev user instead of 401.
      if (env.AUTH_DEV_BYPASS) {
        return { user: DEV_USER };
      }
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
