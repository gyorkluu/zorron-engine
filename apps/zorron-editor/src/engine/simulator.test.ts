/**
 * Unit tests for the Monte Carlo simulator.
 */

import { describe, it, expect } from 'vitest';
import {
  runMonteCarlo,
  SeededRandom,
  DEFAULT_SIMULATION_CONFIG,
  type SimulationConfig,
} from './simulator';
import type { FlowData, FlowNode, FlowEdge } from '@/types/flow';

/** Build a node with default position. */
function node(
  id: string,
  type: FlowNode['type'],
  data: FlowNode['data'],
  position = { x: 0, y: 0 },
): FlowNode {
  return { id, type, position, data } as FlowNode;
}

/** Build an edge. */
function edge(
  id: string,
  source: string,
  target: string,
  sourceHandle: string | null = null,
): FlowEdge {
  return { id, source, target, sourceHandle, targetHandle: null };
}

/** A flow with a branching scene that leads to two settlements.
 *
 * Calculator nodes are inserted between the scene and each settlement so the
 * choice vectors are actually applied to the player vector. Per the GameEngine
 * design, `pendingVector` deltas from choices are only committed when a
 * calculator node is traversed; without one the final vector stays at zero.
 */
function branchingFlow(): FlowData {
  const nodes: FlowNode[] = [
    node('start', 'start', { label: 'Start', title: 'T', intro: 'I' }),
    node('scene', 'scene', {
      label: 'Scene',
      dialogue: 'Pick',
      choices: [
        { id: 'c1', text: 'A', interaction: 'tap', vector: { x: 2, y: 0, z: 0 } },
        { id: 'c2', text: 'B', interaction: 'tap', vector: { x: -2, y: 0, z: 0 } },
      ],
    }),
    node('calcA', 'calculator', { label: 'Calc A', vector: { x: 0, y: 0, z: 0 } }),
    node('calcB', 'calculator', { label: 'Calc B', vector: { x: 0, y: 0, z: 0 } }),
    node('endA', 'settlement', {
      label: 'End A',
      resultMapping: [{ resultId: 'ra', title: 'Path A' }],
    }),
    node('endB', 'settlement', {
      label: 'End B',
      resultMapping: [{ resultId: 'rb', title: 'Path B' }],
    }),
  ];
  const edges: FlowEdge[] = [
    edge('e1', 'start', 'scene'),
    edge('e2', 'scene', 'calcA', 'c1'),
    edge('e3', 'scene', 'calcB', 'c2'),
    edge('e4', 'calcA', 'endA'),
    edge('e5', 'calcB', 'endB'),
  ];
  return {
    nodes,
    edges,
    variables: {},
    settings: { vectorSpace: { enabled: false, dimensions: { x: 'x', y: 'y', z: 'z' } } },
    version: '1.0.0',
  };
}

describe('SeededRandom', () => {
  it('produces deterministic output for the same seed', () => {
    const r1 = new SeededRandom('test-seed');
    const r2 = new SeededRandom('test-seed');
    const seq1 = [r1.next(), r1.next(), r1.next()];
    const seq2 = [r2.next(), r2.next(), r2.next()];
    expect(seq1).toEqual(seq2);
  });

  it('produces different output for different seeds', () => {
    const r1 = new SeededRandom('seed-a');
    const r2 = new SeededRandom('seed-b');
    const seq1 = [r1.next(), r1.next()];
    const seq2 = [r2.next(), r2.next()];
    expect(seq1).not.toEqual(seq2);
  });

  it('returns floats in [0, 1)', () => {
    const rng = new SeededRandom('range-test');
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('pickIndex returns valid indices', () => {
    const rng = new SeededRandom('pick-test');
    for (let i = 0; i < 100; i++) {
      const idx = rng.pickIndex(5);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(5);
    }
  });
});

describe('runMonteCarlo', () => {
  const config: SimulationConfig = { runs: 100, seed: 'unit-test', strategy: 'random' };

  it('runs the requested number of runs', () => {
    const report = runMonteCarlo(branchingFlow(), config);
    expect(report.totalRuns).toBe(100);
    expect(report.runs).toHaveLength(100);
  });

  it('records settlement hits for both branches', () => {
    const report = runMonteCarlo(branchingFlow(), config);
    const total = (report.settlementHits['endA'] ?? 0) + (report.settlementHits['endB'] ?? 0);
    expect(total).toBe(100);
  });

  it('records settlement result titles', () => {
    const report = runMonteCarlo(branchingFlow(), config);
    expect(report.settlementResultHits['Path A']).toBeGreaterThan(0);
    expect(report.settlementResultHits['Path B']).toBeGreaterThan(0);
    expect(
      (report.settlementResultHits['Path A'] ?? 0) +
        (report.settlementResultHits['Path B'] ?? 0),
    ).toBe(100);
  });

  it('produces deterministic results for the same seed', () => {
    const r1 = runMonteCarlo(branchingFlow(), { ...config, seed: 'deterministic' });
    const r2 = runMonteCarlo(branchingFlow(), { ...config, seed: 'deterministic' });
    expect(r1.settlementHits).toEqual(r2.settlementHits);
    expect(r1.runs.map((r) => r.settlementNodeId)).toEqual(
      r2.runs.map((r) => r.settlementNodeId),
    );
  });

  it('records node hit counts and rates', () => {
    const report = runMonteCarlo(branchingFlow(), config);
    // The start and scene nodes should be hit in every run.
    expect(report.nodeHits['start']).toBe(100);
    expect(report.nodeHits['scene']).toBe(100);
    expect(report.nodeHitRates['start']).toBe(1);
    expect(report.nodeHitRates['scene']).toBe(1);
    // The end nodes should sum to 100.
    const endHits = (report.nodeHits['endA'] ?? 0) + (report.nodeHits['endB'] ?? 0);
    expect(endHits).toBe(100);
  });

  it('computes mean and std dev of final vectors', () => {
    const report = runMonteCarlo(branchingFlow(), config);
    // The mean X should be near 0 (since choices are +/-2 with equal probability).
    expect(Math.abs(report.meanVector.x)).toBeLessThan(1);
    expect(report.stdDevVector.x).toBeGreaterThan(0);
  });

  it('counts dead ends when a flow has no settlement', () => {
    const flow = branchingFlow();
    // Remove the settlement nodes so all runs dead-end.
    flow.nodes = flow.nodes.filter((n) => n.type !== 'settlement');
    flow.edges = flow.edges.filter((e) => e.target !== 'endA' && e.target !== 'endB');
    const report = runMonteCarlo(flow, config);
    expect(report.deadEnds).toBe(100);
    expect(Object.keys(report.settlementHits)).toHaveLength(0);
  });

  it('respects the maxStepsPerRun limit', () => {
    // Build a flow that loops forever (scene -> scene).
    const flow: FlowData = {
      nodes: [
        node('start', 'start', { label: 'Start' }),
        node('loop', 'scene', {
          label: 'Loop',
          dialogue: 'Loop',
          choices: [{ id: 'c1', text: 'again', interaction: 'tap' }],
        }),
      ],
      edges: [
        edge('e1', 'start', 'loop'),
        edge('e2', 'loop', 'loop', 'c1'),
      ],
      variables: {},
      settings: { vectorSpace: { enabled: false, dimensions: { x: 'x', y: 'y', z: 'z' } } },
      version: '1.0.0',
    };
    const report = runMonteCarlo(flow, { ...config, runs: 5, maxStepsPerRun: 10 });
    expect(report.timedOuts).toBe(5);
  });

  it('uses the default config when none is provided', () => {
    const report = runMonteCarlo(branchingFlow(), { ...DEFAULT_SIMULATION_CONFIG, runs: 10 });
    expect(report.totalRuns).toBe(10);
  });
});
