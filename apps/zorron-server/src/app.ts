import { Elysia } from 'elysia';
import cors from '@elysiajs/cors';
import swagger from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { loggerPlugin } from './middleware/logger';
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
      .use(authPlugin)
      .use(
        cors({
          origin: env.CORS_ORIGIN,
          credentials: true,
        }),
      )
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
