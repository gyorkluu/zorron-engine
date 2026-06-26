import { describe, it, expect, beforeEach } from 'vitest';
import { Elysia } from 'elysia';
import {
  rateLimitPlugin,
  resetRateLimitBuckets,
} from './rateLimit';

/**
 * Builds a minimal Elysia app with the rate limit plugin and a few test
 * routes. Using a dedicated app (instead of `createApp`) avoids database and
 * Redis dependencies, keeping these unit tests fast and isolated.
 */
function buildApp(options?: Parameters<typeof rateLimitPlugin>[0]) {
  return new Elysia()
    .use(rateLimitPlugin(options))
    .get('/health', () => ({ status: 'ok' }))
    .get('/ready', () => ({ status: 'ready' }))
    .get('/api/ping', () => ({ pong: true }))
    .post('/api/auth/login', () => ({ token: 'abc' }))
    .get('/swagger', () => ({ docs: true }))
    .get('/swagger/json', () => ({ openapi: '3.0.3' }));
}

describe('rateLimitPlugin', () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it('allows requests under the limit', async () => {
    const app = buildApp({ max: 5, windowMs: 60_000 });

    const response = await app.handle(new Request('http://localhost/api/ping'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ pong: true });
    expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('4');
  });

  it('returns 429 when the limit is exceeded', async () => {
    const app = buildApp({ max: 2, windowMs: 60_000 });

    const r1 = await app.handle(new Request('http://localhost/api/ping'));
    const r2 = await app.handle(new Request('http://localhost/api/ping'));
    const r3 = await app.handle(new Request('http://localhost/api/ping'));

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(429);

    const body = await r3.json();
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(body.retryAfter).toBeGreaterThan(0);

    expect(r3.headers.get('Retry-After')).toBeTruthy();
    expect(r3.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('skips rate limiting for /health and /ready', async () => {
    const app = buildApp({ max: 1, windowMs: 60_000 });

    // First request consumes the only token for the default scope.
    const ping = await app.handle(new Request('http://localhost/api/ping'));
    expect(ping.status).toBe(200);

    // Health and ready should still succeed even though the default bucket
    // is exhausted, because they bypass the limiter entirely.
    const health = await app.handle(new Request('http://localhost/health'));
    expect(health.status).toBe(200);
    expect(health.headers.get('X-RateLimit-Limit')).toBeNull();

    const ready = await app.handle(new Request('http://localhost/ready'));
    expect(ready.status).toBe(200);
    expect(ready.headers.get('X-RateLimit-Limit')).toBeNull();
  });

  it('skips rate limiting for /swagger and /docs paths', async () => {
    const app = buildApp({ max: 1, windowMs: 60_000 });

    // Exhaust the default bucket.
    await app.handle(new Request('http://localhost/api/ping'));

    const swaggerPage = await app.handle(
      new Request('http://localhost/swagger'),
    );
    expect(swaggerPage.status).toBe(200);
    expect(swaggerPage.headers.get('X-RateLimit-Limit')).toBeNull();

    const swaggerJson = await app.handle(
      new Request('http://localhost/swagger/json'),
    );
    expect(swaggerJson.status).toBe(200);
    expect(swaggerJson.headers.get('X-RateLimit-Limit')).toBeNull();
  });

  it('applies a stricter limit to /api/auth routes', async () => {
    // Default max is high; auth max is low. The plugin reads env for auth max,
    // so we pass a small `max` for the default scope and rely on the env
    // override below by setting `RATE_LIMIT_AUTH_MAX` via the plugin options
    // is not supported — instead we verify the auth scope is tracked
    // separately from the default scope.
    const app = buildApp({ max: 100, windowMs: 60_000 });

    // Hit an auth route once; it should succeed and use the auth scope.
    const authResp = await app.handle(
      new Request('http://localhost/api/auth/login', { method: 'POST' }),
    );
    expect(authResp.status).toBe(200);
    // Auth scope uses env.RATE_LIMIT_AUTH_MAX (default 10).
    expect(authResp.headers.get('X-RateLimit-Limit')).toBe('10');

    // A non-auth route should still use the default max (100).
    const pingResp = await app.handle(new Request('http://localhost/api/ping'));
    expect(pingResp.status).toBe(200);
    expect(pingResp.headers.get('X-RateLimit-Limit')).toBe('100');
  });

  it('isolates buckets per IP', async () => {
    const app = buildApp({ max: 1, windowMs: 60_000 });

    const ipA = await app.handle(
      new Request('http://localhost/api/ping', {
        headers: { 'x-forwarded-for': '1.1.1.1' },
      }),
    );
    const ipB = await app.handle(
      new Request('http://localhost/api/ping', {
        headers: { 'x-forwarded-for': '2.2.2.2' },
      }),
    );

    expect(ipA.status).toBe(200);
    expect(ipB.status).toBe(200);

    // A second request from IP A should be blocked.
    const ipA2 = await app.handle(
      new Request('http://localhost/api/ping', {
        headers: { 'x-forwarded-for': '1.1.1.1' },
      }),
    );
    expect(ipA2.status).toBe(429);
  });
});
