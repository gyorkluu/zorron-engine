import { Elysia } from 'elysia';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import { logger } from '../shared/logger';

/**
 * Request context shape produced by the logger plugin.
 */
interface LoggerContext {
  requestId: string;
  log: ReturnType<typeof logger.child>;
}

/**
 * [Elysia plugin]: injects a per-request `requestId` and child `log`, then logs
 * structured metadata after each request is handled.
 */
export const loggerPlugin = new Elysia({ name: 'logger' })
  .derive({ as: 'global' }, ({ headers }) => {
    const headerValue = headers?.[env.REQUEST_ID_HEADER.toLowerCase()];
    const requestId =
      (Array.isArray(headerValue) ? headerValue[0] : headerValue) ??
      randomUUID();

    return {
      requestId,
      log: logger.child({ requestId }),
    };
  })
  .onAfterHandle(
    { as: 'global' },
    ({ request, set, requestId, log }) => {
      const ctx = { requestId, log } as unknown as LoggerContext;
      ctx.log.info(
        {
          method: request.method,
          path: new URL(request.url).pathname,
          statusCode: set.status,
        },
        'request handled',
      );
    },
  );
