import { config } from 'dotenv';
import path from 'node:path';

/**
 * Load environment variables from `.env` before any test runs.
 */
config({ path: path.resolve(import.meta.dirname, '../../.env') });

/**
 * Reset the in-memory rate limit buckets before every test so that
 * accumulated requests from one test do not cause 429s in the next.
 *
 * Uses a dynamic import so that `env.ts` validation runs after `dotenv`
 * has populated `process.env`.
 */
beforeEach(async () => {
  const { resetRateLimitBuckets } = await import('../middleware/rateLimit');
  resetRateLimitBuckets();
});
