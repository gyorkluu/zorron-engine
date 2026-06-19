import { Redis } from 'ioredis';
import { env } from './env';
import { logger } from '../shared/logger';

/**
 * [ioredis]: shared Redis client for sessions, rate-limiting, and caching.
 */
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  connectTimeout: 2000,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('error', (err) => {
  logger.error({ err }, 'redis connection error');
});

/**
 * Attempts to ping Redis and returns whether the connection is alive.
 * Rejects quickly when Redis is unreachable so readiness probes do not hang.
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis ping timeout')), 1500),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}
