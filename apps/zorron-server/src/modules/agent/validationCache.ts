/**
 * SCALE-004: Validation result cache.
 *
 * The Monte Carlo simulation is deterministic for a given (flow, runs, seed,
 * maxSteps) tuple. Iterative agent workflows frequently re-validate an
 * unchanged flow (e.g. re-compiling the same intent, toggling a non-flow flag).
 * This LRU cache skips redundant computation and returns the identical prior
 * result, with O(1) lookup.
 *
 * The cache is bounded (default 256 entries) and evicts the least-recently-used
 * entry when full. `Map` iteration order reflects insertion/recency, so we
 * re-insert on hit to mark recency.
 */
import { validateFlow, type SimulationResult } from './simulationValidator';

const DEFAULT_MAX_ENTRIES = 256;

interface CacheConfig {
  maxEntries: number;
}

export class ValidationCache {
  private readonly maxEntries: number;
  private readonly store = new Map<string, SimulationResult>();
  private hits = 0;
  private misses = 0;

  constructor(config: CacheConfig = { maxEntries: DEFAULT_MAX_ENTRIES }) {
    this.maxEntries = config.maxEntries;
  }

  /** Compute or fetch the cached validation result. */
  get(
    flow: Parameters<typeof validateFlow>[0],
    options: { runs?: number; seed?: string; maxSteps?: number } = {},
  ): SimulationResult {
    const key = hashKey(flow, options);
    const hit = this.store.get(key);
    if (hit) {
      this.hits++;
      // Re-insert to mark as most-recently-used.
      this.store.delete(key);
      this.store.set(key, hit);
      return hit;
    }
    this.misses++;
    const result = validateFlow(flow, options);
    this.store.set(key, result);
    if (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    return result;
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): { size: number; maxEntries: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }
}

// Module-level shared instance used by the agent service.
export const validationCache = new ValidationCache();

// ── Key hashing (FNV-1a over canonicalized input) ──

function hashKey(
  flow: unknown,
  options: { runs?: number; seed?: string; maxSteps?: number },
): string {
  const canonical = JSON.stringify({
    f: flow,
    r: options.runs ?? 200,
    s: options.seed ?? 'validator',
    m: options.maxSteps ?? 200,
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
