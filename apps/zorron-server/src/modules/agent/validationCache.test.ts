/**
 * SCALE-004: Validation cache + benchmark tests.
 *
 * Verifies:
 * - Cached validation returns an identical result for the same inputs.
 * - Cache hit/miss accounting is correct.
 * - Different options (runs/seed/maxSteps) produce distinct keys.
 * - LRU eviction drops the least-recently-used entry.
 * - clear() resets all counters.
 * - benchmark() reports sane cold/warm timing metrics.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationCache, validationCache } from './validationCache';
import { benchmark } from './agent.service';
import type { ScenarioIntent } from './agent.schema';
import { buildFlow } from './flowBuilder';
import { validateFlow } from './simulationValidator';

// ── Fixtures ──

function makeIntent(): ScenarioIntent {
  return {
    type: 'personality-test',
    title: 'Cache Test',
    steps: [
      {
        id: 's1',
        kind: 'scene',
        dialogue: 'Choose',
        choices: [
          { text: 'A', interaction: 'tap' },
          { text: 'B', interaction: 'tap' },
        ],
      },
    ],
    settlement: {
      strategy: 'vector-nearest',
      resultMapping: [
        { resultId: 'r1', title: 'Result 1' },
        { resultId: 'r2', title: 'Result 2' },
      ],
      visualBlocks: ['badge', 'title', 'layered-texts'],
    },
  };
}

function makeFlow() {
  return buildFlow(makeIntent()) as unknown as Parameters<typeof validateFlow>[0];
}

// ── ValidationCache ──

describe('ValidationCache', () => {
  let cache: ValidationCache;

  beforeEach(() => {
    cache = new ValidationCache({ maxEntries: 3 });
  });

  it('returns the same result object shape for identical inputs', () => {
    const flow = makeFlow();
    const opts = { runs: 50, seed: 'cache-test', maxSteps: 100 };

    const r1 = cache.get(flow, opts);
    const r2 = cache.get(flow, opts);

    // Same structural result (deterministic simulation).
    expect(r2.totalRuns).toBe(r1.totalRuns);
    expect(r2.deadEnds).toBe(r1.deadEnds);
    expect(r2.settlementDistribution).toEqual(r1.settlementDistribution);
    // Second call is a cache hit.
    expect(cache.getStats().hits).toBe(1);
    expect(cache.getStats().misses).toBe(1);
  });

  it('records a miss for different options', () => {
    const flow = makeFlow();

    cache.get(flow, { runs: 50, seed: 'a' });
    cache.get(flow, { runs: 50, seed: 'b' }); // different seed → miss

    expect(cache.getStats().misses).toBe(2);
    expect(cache.getStats().hits).toBe(0);
  });

  it('evicts the least-recently-used entry when full', () => {
    const flow = makeFlow();
    // maxEntries = 3
    cache.get(flow, { runs: 10, seed: '1' });
    cache.get(flow, { runs: 10, seed: '2' });
    cache.get(flow, { runs: 10, seed: '3' });
    expect(cache.getStats().size).toBe(3);

    // Access '1' to mark it recent, then add '4' → should evict '2' (LRU).
    cache.get(flow, { runs: 10, seed: '1' });
    cache.get(flow, { runs: 10, seed: '4' });

    expect(cache.getStats().size).toBe(3);
    // '1' was a hit, '4' was a miss → hits=1, misses=4
    expect(cache.getStats().hits).toBe(1);
    expect(cache.getStats().misses).toBe(4);
    // '2' should now be evicted → fetching it is a miss.
    const beforeMisses = cache.getStats().misses;
    cache.get(flow, { runs: 10, seed: '2' });
    expect(cache.getStats().misses).toBe(beforeMisses + 1);
  });

  it('clear() resets all counters and entries', () => {
    const flow = makeFlow();
    cache.get(flow, { runs: 10, seed: 'x' });
    expect(cache.getStats().size).toBe(1);

    cache.clear();

    expect(cache.getStats().size).toBe(0);
    expect(cache.getStats().hits).toBe(0);
    expect(cache.getStats().misses).toBe(0);
    expect(cache.getStats().hitRate).toBe(0);
  });

  it('computes hitRate correctly', () => {
    const flow = makeFlow();
    cache.get(flow, { runs: 10, seed: 'a' }); // miss
    cache.get(flow, { runs: 10, seed: 'a' }); // hit
    cache.get(flow, { runs: 10, seed: 'a' }); // hit

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(2 / 3, 5);
  });
});

// ── benchmark() ──

describe('benchmark', () => {
  beforeEach(() => {
    validationCache.clear();
  });

  it('returns sane timing metrics for a valid flow', () => {
    const flow = buildFlow(makeIntent());
    const result = benchmark({
      flowData: flow as unknown as Record<string, unknown>,
      simulation: { runs: 200, maxStepsPerRun: 200 },
    });

    expect(result.runs).toBe(200);
    expect(result.coldMs).toBeGreaterThan(0);
    expect(result.cachedMs).toBeGreaterThanOrEqual(0);
    expect(result.perRunMs).toBeGreaterThan(0);
    expect(result.opsPerSecond).toBeGreaterThan(0);
    // Cached path should be faster (or at least not slower within timer noise).
    expect(result.cachedMs).toBeLessThanOrEqual(result.coldMs);
    expect(result.cacheStats.size).toBe(1); // one entry cached
    expect(result.cacheStats.misses).toBe(1); // cold path = 1 miss
    expect(result.cacheStats.hits).toBe(1); // warm path = 1 hit
  });

  it('respects custom simulation config', () => {
    const flow = buildFlow(makeIntent());
    const result = benchmark({
      flowData: flow as unknown as Record<string, unknown>,
      simulation: { runs: 50, seed: 'custom', maxStepsPerRun: 50 },
    });

    expect(result.runs).toBe(50);
  });
});

