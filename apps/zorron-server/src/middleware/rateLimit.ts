import { Elysia } from 'elysia';
import { env } from '../config/env';
import { logger } from '../shared/logger';

/**
 * In-memory rate limit bucket keyed by `${ip}:${scope}`.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Cleanup interval for expired buckets (5 minutes). */
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Starts the periodic cleanup of expired buckets. Safe to call multiple times.
 * The timer is `unref`'d so it does not keep the process alive.
 */
function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }
}

/**
 * Returns the bucket for `key`, creating a fresh one if missing or expired.
 */
function getBucket(key: string, windowMs: number): Bucket {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  return bucket;
}

/**
 * Clears all rate limit buckets. Intended for use in tests.
 */
export function resetRateLimitBuckets(): void {
  buckets.clear();
}

/**
 * Extracts the client IP from common proxy headers, falling back to
 * `'unknown'` when no proxy metadata is present (e.g. direct test calls).
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/** Rate limit plugin options. */
export interface RateLimitOptions {
  /** Window duration in milliseconds. Defaults to `env.RATE_LIMIT_WINDOW_MS`. */
  windowMs?: number;
  /** Max requests per window for non-auth routes. Defaults to `env.RATE_LIMIT_MAX`. */
  max?: number;
  /** Paths that bypass rate limiting entirely. */
  skipPaths?: ReadonlySet<string>;
}

/**
 * [Elysia plugin]: in-memory per-IP rate limiter.
 *
 * Uses a fixed-window bucket keyed by `${ip}:${scope}`. Auth routes
 * (`/api/auth/*`) get a stricter limit via `env.RATE_LIMIT_AUTH_MAX`.
 * Health probes and documentation endpoints bypass the limiter.
 *
 * When the limit is exceeded the plugin responds with `429 Too Many Requests`
 * and a `Retry-After` header, returning the standard application error shape.
 *
 * @param options - Optional per-instance overrides
 */
export function rateLimitPlugin(options?: RateLimitOptions) {
  const windowMs = options?.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const max = options?.max ?? env.RATE_LIMIT_MAX;
  const skipPaths =
    options?.skipPaths ?? new Set<string>(['/health', '/ready']);

  startCleanup();

  return new Elysia({ name: 'rate-limit' }).onBeforeHandle(
    { as: 'global' },
    ({ request, set, path }) => {
      // Skip health checks and documentation endpoints.
      if (
        skipPaths.has(path) ||
        path.startsWith('/swagger') ||
        path.startsWith('/docs')
      ) {
        return;
      }

      const ip = getClientIp(request);
      const isAuthRoute = path.startsWith('/api/auth');
      const routeMax = isAuthRoute ? env.RATE_LIMIT_AUTH_MAX : max;
      const scope = isAuthRoute ? 'auth' : 'default';
      const key = `${ip}:${scope}`;

      const bucket = getBucket(key, windowMs);
      bucket.count += 1;

      const remaining = Math.max(0, routeMax - bucket.count);
      const retryAfter = Math.ceil((bucket.resetAt - Date.now()) / 1000);

      set.headers['X-RateLimit-Limit'] = String(routeMax);
      set.headers['X-RateLimit-Remaining'] = String(remaining);
      set.headers['X-RateLimit-Reset'] = String(bucket.resetAt);

      if (bucket.count > routeMax) {
        logger.warn(
          { ip, path, count: bucket.count, max: routeMax },
          'rate limit exceeded',
        );
        set.status = 429;
        set.headers['Retry-After'] = String(retryAfter);
        return {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter,
        };
      }

      return;
    },
  );
}
