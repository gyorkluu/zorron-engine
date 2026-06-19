import { Elysia } from 'elysia';
import { isRedisHealthy } from '../../config/redis';
import { pool } from '../../config/database';

/**
 * [Elysia]: health and readiness probe routes.
 *
 * `/health` returns a simple liveness check.
 * `/ready` verifies PostgreSQL and Redis connectivity.
 */
export const healthRoute = new Elysia()
  .get(
    '/health',
    () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }),
    {
      detail: {
        summary: 'Liveness probe',
        tags: ['Health'],
      },
    },
  )
  .get(
    '/ready',
    async ({ set }) => {
      const [database, redis] = await Promise.all([
        pool
          .query('SELECT 1')
          .then(() => 'ok')
          .catch(() => 'error'),
        isRedisHealthy().then((ok) => (ok ? 'ok' : 'error')),
      ]);

      const isReady = database === 'ok' && redis === 'ok';

      set.status = isReady ? 200 : 503;

      return {
        status: isReady ? 'ready' : 'not_ready',
        checks: { database, redis },
        timestamp: new Date().toISOString(),
      };
    },
    {
      detail: {
        summary: 'Readiness probe',
        tags: ['Health'],
      },
    },
  );
