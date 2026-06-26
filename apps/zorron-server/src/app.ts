import { Elysia } from 'elysia';
import swagger from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { loggerPlugin } from './middleware/logger';
import { rateLimitPlugin } from './middleware/rateLimit';
import { authPlugin } from './middleware/auth';

import { healthRoute } from './modules/health/health.route';
import { authRoute } from './modules/auth/auth.route';
import { projectRoute } from './modules/project/project.route';
import { assetRoute } from './modules/asset/asset.route';

/**
 * [Elysia]: assembled application instance with global middleware and routes.
 *
 * @returns Configured Elysia application
 */
export function createApp() {
  return (
    new Elysia()
      // Global middleware (order matters)
      .use(errorHandler)
      .use(loggerPlugin)
      .use(rateLimitPlugin())
      .use(authPlugin)
      // Custom CORS middleware supporting multiple comma-separated origins.
      .onRequest(({ request, set }) => {
        const allowed = env.CORS_ORIGIN.split(',').map((o) => o.trim());
        const origin = request.headers.get('origin') ?? '';
        const allowOrigin = allowed.includes(origin) ? origin : allowed[0] ?? '';
        set.headers['Access-Control-Allow-Origin'] = allowOrigin;
        set.headers['Access-Control-Allow-Credentials'] = 'true';
        set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, PUT, DELETE, OPTIONS';
        set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, x-request-id';
        if (request.method === 'OPTIONS') {
          set.status = 204;
          return new Response(null, { status: 204 });
        }
      })
      .use(
        swagger({
          documentation: {
            info: {
              title: 'Zorron Engine API',
              version: '0.1.0',
            },
          },
        }),
      )
      .use(
        staticPlugin({
          assets: env.STORAGE_LOCAL_ROOT,
          prefix: '/uploads',
        }),
      )
      // Routes
      .use(healthRoute)
      .use(authRoute)
      .use(projectRoute)
      .use(assetRoute)
      .get('/', () => ({ message: 'Zorron Engine API' }))
  );
}
