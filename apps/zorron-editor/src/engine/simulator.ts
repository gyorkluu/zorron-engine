/**
 * Monte Carlo simulator for narrative flow graphs.
 *
 * Runs N random traversals of a FlowData using the GameEngine, recording:
 * - Per-node hit counts (how often each node was reached).
 * - Per-settlement-result hit counts (which settlement node ended each run).
 * - Final personality vectors (for distribution analysis).
 * - Dead-end counts (runs that ended without reaching a settlement).
 *
 * The simulator is deterministic when a `seed` is provided: the same seed
 * always produces the same sequence of random choices. This is critical for
 * reproducible QA reports.
 *
 * The simulator is a pure module (no DOM, no React) so it can run inside a
 * Web Worker without polyfills.
 */

import { GameEngine, type GameState } from './GameEngine';
import type { FlowData, PersonalityVector } from '@/types/flow';

/** Simulation configuration. */
export interface SimulationConfig {
  /** Number of runs. Defaults to 1000. */
  runs: number;
  /** Optional random seed for reproducibility. */
  seed?: string;
  /** Choice selection strategy. */
  strategy: 'random' | 'weighted';
  /** Maximum steps per run before bailing out (prevents infinite loops). */
  maxStepsPerRun?: number;
}

/** Default simulation config. */
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  runs: 1000,
  strategy: 'random',
  maxStepsPerRun: 200,
};

/** Result of a single simulation run. */
export interface RunResult {
  /** Whether the run reached a settlement node. */
  reachedSettlement: boolean;
  /** The settlement node id that ended the run (null if dead-end). */
  settlementNodeId: string | null;
  /** The settlement result title (null if dead-end). */
  settlementTitle: string | null;
  /** The final personality vector. */
  finalVector: PersonalityVector;
  /** Number of steps taken. */
  steps: number;
  /** Whether the run hit the step limit (potential infinite loop). */
  timedOut: boolean;
  /** Ordered list of node ids visited during the run (for hit counting). */
  visitedNodes: string[];
}

/** Aggregated simulation report. */
export interface SimulationReport {
  /** Number of runs completed. */
  totalRuns: number;
  /** Per-node hit counts (nodeId -> count). */
  nodeHits: Record<string, number>;
  /** Per-node hit rates (nodeId -> 0..1). */
  nodeHitRates: Record<string, number>;
  /** Per-settlement-node hit counts (nodeId -> count). */
  settlementHits: Record<string, number>;
  /** Per-settlement-result hit counts (title -> count). */
  settlementResultHits: Record<string, number>;
  /** Final vectors from all runs (for distribution analysis). */
  finalVectors: PersonalityVector[];
  /** Mean of the final vectors. */
  meanVector: PersonalityVector;
  /** Standard deviation of the final vectors. */
  stdDevVector: PersonalityVector;
  /** Number of runs that ended without reaching a settlement. */
  deadEnds: number;
  /** Number of runs that hit the step limit. */
  timedOuts: number;
  /** Per-run results (for detailed inspection). */
  runs: RunResult[];
}

/**
 * A seeded pseudo-random number generator (Mulberry32).
 *
 * Deterministic and fast. Given the same seed, produces the same sequence.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: string | number = Date.now()) {
    this.state = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
  }

  /** Next float in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Pick a random index in [0, length). */
  pickIndex(length: number): number {
    if (length <= 0) return 0;
    return Math.floor(this.next() * length);
  }
}

/** Hash a string into a 32-bit unsigned integer (for seeding). */
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The empty zero vector (identity for vector addition). */
const ZERO: PersonalityVector = {};

/**
 * Run a single simulation traversal.
 *
 * Drives the GameEngine by randomly selecting choices at scene nodes. Returns
 * the run result including the final state and step count.
 */
function runSingle(
  flowData: FlowData,
  rng: SeededRandom,
  maxSteps: number,
): RunResult {
  const engine = new GameEngine(flowData);
  engine.start();

  let steps = 0;
  let state: GameState = engine.getState();
  let timedOut = false;

  // Advance from the start node.
  if (state.currentNodeType === 'start') {
    state = engine.advanceFromStart();
    steps++;
  }

  // Drive the engine until it finishes or hits the step limit.
  while (!state.isFinished && steps < maxSteps) {
    if (state.currentNodeType === 'scene' && state.choices.length > 0) {
      const idx = rng.pickIndex(state.choices.length);
      const choice = state.choices[idx];
      state = engine.selectChoice(choice.id);
      steps++;
    } else if (state.currentNodeType === 'video') {
      state = engine.skipVideo();
      steps++;
    } else {
      // No interactive choice available; bail out.
      break;
    }
  }

  if (!state.isFinished && steps >= maxSteps) {
    timedOut = true;
  }

  const reachedSettlement = state.currentNodeType === 'settlement';
  return {
    reachedSettlement,
    settlementNodeId: reachedSettlement ? state.currentNodeId : null,
    settlementTitle: reachedSettlement
      ? (state.settlementResult?.title ?? null)
      : null,
    finalVector: { ...state.vector },
    steps,
    timedOut,
    // Capture the engine's visited-node history so the aggregator can count
    // node hits in a single pass without re-running the simulation.
    visitedNodes: [...state.history],
  };
}

/** Compute the mean of a list of vectors across all axes. */
function meanVector(vectors: PersonalityVector[]): PersonalityVector {
  if (vectors.length === 0) return { ...ZERO };
  // Collect the union of all axis ids so missing axes default to 0.
  const axisSet = new Set<string>();
  for (const v of vectors) {
    for (const k of Object.keys(v)) axisSet.add(k);
  }
  const out: PersonalityVector = {};
  for (const axis of axisSet) {
    let s = 0;
    for (const v of vectors) {
      s += v[axis] ?? 0;
    }
    out[axis] = s / vectors.length;
  }
  return out;
}

/** Compute the standard deviation of a list of vectors across all axes. */
function stdDevVector(
  vectors: PersonalityVector[],
  mean: PersonalityVector,
): PersonalityVector {
  if (vectors.length === 0) return { ...ZERO };
  const axisSet = new Set<string>();
  for (const v of vectors) {
    for (const k of Object.keys(v)) axisSet.add(k);
  }
  const n = vectors.length;
  const out: PersonalityVector = {};
  for (const axis of axisSet) {
    let s = 0;
    const m = mean[axis] ?? 0;
    for (const v of vectors) {
      const d = (v[axis] ?? 0) - m;
      s += d * d;
    }
    out[axis] = Math.sqrt(s / n);
  }
  return out;
}

/**
 * Run a Monte Carlo simulation on the given flow data.
 *
 * @param flowData - The narrative flow to simulate.
 * @param config - Simulation configuration.
 * @returns The aggregated simulation report.
 */
export function runMonteCarlo(
  flowData: FlowData,
  config: SimulationConfig = DEFAULT_SIMULATION_CONFIG,
): SimulationReport {
  const rng = new SeededRandom(config.seed ?? Date.now().toString());
  const maxSteps = config.maxStepsPerRun ?? 200;

  const nodeHits: Record<string, number> = {};
  const settlementHits: Record<string, number> = {};
  const settlementResultHits: Record<string, number> = {};
  const finalVectors: PersonalityVector[] = [];
  const runs: RunResult[] = [];
  let deadEnds = 0;
  let timedOuts = 0;

  // Initialize node hit counts for all known nodes.
  for (const node of flowData.nodes ?? []) {
    nodeHits[node.id] = 0;
  }

  for (let i = 0; i < config.runs; i++) {
    const result = runSingle(flowData, rng, maxSteps);
    runs.push(result);

    // Count node hits from the run's visited-node history. This is a single
    // pass: the settlement node is included in `visitedNodes`, so we must NOT
    // increment `nodeHits` again below (that was the double-counting bug).
    for (const nodeId of result.visitedNodes) {
      nodeHits[nodeId] = (nodeHits[nodeId] ?? 0) + 1;
    }

    if (result.settlementNodeId) {
      settlementHits[result.settlementNodeId] =
        (settlementHits[result.settlementNodeId] ?? 0) + 1;
    }
    if (result.settlementTitle) {
      settlementResultHits[result.settlementTitle] =
        (settlementResultHits[result.settlementTitle] ?? 0) + 1;
    }
    if (!result.reachedSettlement && !result.timedOut) {
      deadEnds++;
    }
    if (result.timedOut) {
      timedOuts++;
    }
    finalVectors.push(result.finalVector);
  }

  const mean = meanVector(finalVectors);
  const std = stdDevVector(finalVectors, mean);

  // Compute hit rates.
  const nodeHitRates: Record<string, number> = {};
  for (const [id, count] of Object.entries(nodeHits)) {
    nodeHitRates[id] = config.runs > 0 ? count / config.runs : 0;
  }

  return {
    totalRuns: config.runs,
    nodeHits,
    nodeHitRates,
    settlementHits,
    settlementResultHits,
    finalVectors,
    meanVector: mean,
    stdDevVector: std,
    deadEnds,
    timedOuts,
    runs,
  };
}
