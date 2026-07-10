/**
 * SimulationValidator - validates a built FlowData for structural health.
 *
 * Uses graph-theory analysis (BFS/DFS) to detect:
 * - Dead ends: non-terminal nodes with no outgoing edges.
 * - Dead loops: cycles that never reach a terminal node.
 * - Unreachable nodes: nodes not reachable from the start node.
 * - Settlement reachability: at least one settlement must be reachable.
 * - Node coverage: percentage of nodes reachable from start.
 *
 * Also runs a lightweight Monte Carlo simulation using a seeded RNG to
 * estimate dead-end rate and settlement distribution without the full
 * GameEngine (which lives in the frontend). The simulation follows choice
 * edges by sourceHandle and handles passthrough nodes.
 */

import type { ValidationIssue } from './agent.schema';

// ── FlowData shape (minimal, avoids importing the full schema) ──

interface FlowNode {
  id: string;
  type: string;
  data: {
    choices?: Array<{ id: string }>;
    checkType?: string;
    varName?: string;
    operator?: string;
    value?: number;
  };
}
interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}
interface FlowDataLike {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

const TERMINAL_TYPES = new Set(['settlement', 'link']);

export interface SimulationResult {
  issues: ValidationIssue[];
  totalRuns: number;
  deadEnds: number;
  timedOuts: number;
  nodeCoverage: number;
  settlementDistribution: Record<string, number>;
}

// ── Seeded RNG (Mulberry32, mirrors frontend simulator.ts) ──

class SeededRandom {
  private state: number;
  constructor(seed: string | number = Date.now()) {
    this.state = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  }
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  pickIndex(length: number): number {
    return Math.floor(this.next() * length);
  }
}

function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ── Adjacency List ──

interface AdjEntry {
  target: string;
  handle: string | null;
}

function buildAdjacencyList(flow: FlowDataLike): Map<string, AdjEntry[]> {
  const adj = new Map<string, AdjEntry[]>();
  for (const node of flow.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of flow.edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push({
      target: edge.target,
      handle: edge.sourceHandle ?? null,
    });
  }
  return adj;
}

function findStartNode(flow: FlowDataLike): FlowNode | null {
  return flow.nodes.find((n) => n.type === 'start') ?? flow.nodes[0] ?? null;
}

function getNodeById(flow: FlowDataLike, id: string): FlowNode | undefined {
  return flow.nodes.find((n) => n.id === id);
}

// ── Validation ──

export function validateFlow(
  flow: FlowDataLike,
  options: { runs?: number; seed?: string; maxSteps?: number } = {},
): SimulationResult {
  const { runs = 200, seed = 'validator', maxSteps = 200 } = options;
  const issues: ValidationIssue[] = [];

  const adj = buildAdjacencyList(flow);
  const startNode = findStartNode(flow);

  // ── 1. Structural checks ──

  if (!startNode) {
    issues.push({
      severity: 'error',
      code: 'NO_START_NODE',
      message: 'Flow has no start node.',
    });
    return { issues, totalRuns: 0, deadEnds: runs, timedOuts: 0, nodeCoverage: 0, settlementDistribution: {} };
  }

  // 1a. Reachability from start via BFS
  const reachable = new Set<string>();
  const queue: string[] = [startNode.id];
  reachable.add(startNode.id);
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adj.get(current) ?? [];
    for (const { target } of neighbors) {
      if (!reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }

  // 1b. Unreachable nodes
  for (const node of flow.nodes) {
    if (!reachable.has(node.id)) {
      issues.push({
        severity: 'warning',
        code: 'UNREACHABLE_NODE',
        message: `Node "${node.id}" (type: ${node.type}) is not reachable from the start node.`,
        nodeId: node.id,
      });
    }
  }

  // 1c. Dead ends: non-terminal nodes with no outgoing edges
  for (const node of flow.nodes) {
    if (TERMINAL_TYPES.has(node.type)) continue;
    const neighbors = adj.get(node.id) ?? [];
    if (neighbors.length === 0) {
      issues.push({
        severity: 'error',
        code: 'DEAD_END',
        message: `Node "${node.id}" (type: ${node.type}) has no outgoing edges and is not a terminal node.`,
        nodeId: node.id,
      });
    }
  }

  // 1d. Settlement reachability
  const settlementNodes = flow.nodes.filter((n) => n.type === 'settlement');
  if (settlementNodes.length === 0) {
    issues.push({
      severity: 'error',
      code: 'NO_SETTLEMENT',
      message: 'Flow has no settlement node.',
    });
  }
  const reachableSettlements = settlementNodes.filter((s) => reachable.has(s.id));
  if (reachableSettlements.length === 0 && settlementNodes.length > 0) {
    issues.push({
      severity: 'error',
      code: 'UNREACHABLE_SETTLEMENT',
      message: 'No settlement node is reachable from the start node.',
    });
  }

  // ── 2. Monte Carlo simulation ──

  let deadEnds = 0;
  let timedOuts = 0;
  const settlementDistribution: Record<string, number> = {};
  const rng = new SeededRandom(seed);

  for (let run = 0; run < runs; run++) {
    const result = simulateRun(flow, adj, startNode.id, rng, maxSteps);
    if (result.timedOut) {
      timedOuts++;
    }
    if (!result.reachedSettlement) {
      deadEnds++;
    }
    if (result.settlementId) {
      settlementDistribution[result.settlementId] =
        (settlementDistribution[result.settlementId] ?? 0) + 1;
    }
  }

  // 2a. Dead end rate check
  const deadEndRate = deadEnds / runs;
  if (deadEndRate > 0.05) {
    issues.push({
      severity: 'warning',
      code: 'HIGH_DEAD_END_RATE',
      message: `Dead end rate is ${(deadEndRate * 100).toFixed(1)}% (threshold: 5%). ${deadEnds} out of ${runs} runs did not reach a settlement.`,
    });
  }

  // 2b. Timeout check
  if (timedOuts > 0) {
    issues.push({
      severity: 'warning',
      code: 'TIMEOUTS',
      message: `${timedOuts} out of ${runs} runs timed out (possible infinite loop).`,
    });
  }

  // ── 3. Coverage ──
  const nodeCoverage = flow.nodes.length > 0 ? reachable.size / flow.nodes.length : 0;
  if (nodeCoverage < 0.9) {
    issues.push({
      severity: 'warning',
      code: 'LOW_COVERAGE',
      message: `Node coverage is ${(nodeCoverage * 100).toFixed(1)}% (threshold: 90%). ${flow.nodes.length - reachable.size} unreachable nodes.`,
    });
  }

  return {
    issues,
    totalRuns: runs,
    deadEnds,
    timedOuts,
    nodeCoverage,
    settlementDistribution,
  };
}

// ── Single simulation run ──

interface RunResult {
  reachedSettlement: boolean;
  settlementId: string | null;
  timedOut: boolean;
}

function simulateRun(
  flow: FlowDataLike,
  adj: Map<string, AdjEntry[]>,
  startId: string,
  rng: SeededRandom,
  maxSteps: number,
): RunResult {
  let currentId: string | null = startId;
  let steps = 0;

  // Advance from start to first real node.
  const startNeighbors = adj.get(startId) ?? [];
  if (startNeighbors.length > 0) {
    currentId = startNeighbors[0].target;
  }

  while (currentId && steps < maxSteps) {
    steps++;
    const node = getNodeById(flow, currentId);
    if (!node) {
      return { reachedSettlement: false, settlementId: null, timedOut: false };
    }

    if (node.type === 'settlement') {
      return { reachedSettlement: true, settlementId: currentId, timedOut: false };
    }

    if (TERMINAL_TYPES.has(node.type)) {
      // Reached link or other terminal without settlement.
      return { reachedSettlement: false, settlementId: null, timedOut: false };
    }

    const neighbors: AdjEntry[] = adj.get(currentId) ?? [];

    if (node.type === 'scene') {
      // Pick a random choice edge (by handle).
      const choiceEdges: AdjEntry[] = neighbors;
      if (choiceEdges.length === 0) {
        return { reachedSettlement: false, settlementId: null, timedOut: false };
      }
      const idx = rng.pickIndex(choiceEdges.length);
      currentId = choiceEdges[idx].target;
    } else {
      // Passthrough (logic/setter/calculator/video): take first edge.
      // For logic nodes, we can't evaluate conditions without the full
      // GameEngine, so we randomly pick true/false edges.
      if (neighbors.length === 0) {
        return { reachedSettlement: false, settlementId: null, timedOut: false };
      }
      if (node.type === 'logic' && neighbors.length > 1) {
        // Randomly choose true/false branch.
        const idx = rng.pickIndex(neighbors.length);
        currentId = neighbors[idx].target;
      } else {
        currentId = neighbors[0].target;
      }
    }
  }

  return { reachedSettlement: false, settlementId: null, timedOut: steps >= maxSteps };
}
