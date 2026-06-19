import pino from 'pino';
import { env } from '../config/env';

/**
 * [pino]: root structured logger instance.
 *
 * Outputs JSON in production and pretty-printed logs in development.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        }
      : undefined,
});
