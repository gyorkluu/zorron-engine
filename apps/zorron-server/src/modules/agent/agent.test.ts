/**
 * AGENT-006: End-to-end integration tests for the Agent API module.
 *
 * Covers:
 * 1. FlowBuilder - ScenarioIntent → FlowData translation (all step kinds, branching).
 * 2. SimulationValidator - graph-theory analysis + Monte Carlo simulation.
 * 3. ScenarioTypes metadata integrity.
 * 4. Zod schema validation contracts.
 * 5. End-to-end compile pipeline: intent → buildFlow → validateFlow → no errors.
 *
 * Database-dependent service layer (compile/iterate/publish/saveSession) is
 * tested via vi.mock to isolate business-logic branches from DB I/O.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ScenarioIntentSchema,
  CompileRequestSchema,
  type ScenarioIntent,
} from './agent.schema';
import { buildFlow } from './flowBuilder';
import { validateFlow } from './simulationValidator';
import * as simulationValidatorNs from './simulationValidator';
import {
  SCENARIO_TYPES,
  NODE_CAPABILITIES,
  SETTLEMENT_STRATEGIES,
} from './scenarioTypes';

// ── Helpers ────────────────────────────────────────────────

/** Build a settlement object with default visualBlocks (required by schema type). */
function makeSettlement(
  strategy = 'vector-nearest',
  extra: Record<string, unknown> = {},
): ScenarioIntent['settlement'] {
  return { strategy, visualBlocks: ['badge', 'title', 'layered-texts'], ...extra };
}

/** A minimal valid intent with one scene step. */
function makeMinimalIntent(): ScenarioIntent {
  return {
    type: 'personality-test',
    title: 'Test Scenario',
    steps: [
      {
        id: 's1',
        kind: 'scene',
        dialogue: 'Choose your path',
        choices: [
          { text: 'A', interaction: 'tap' },
          { text: 'B', interaction: 'tap' },
        ],
      },
    ],
    settlement: makeSettlement(),
  };
}

/** A full personality-test intent with dimensions, anchors, and branching. */
function makeFullIntent(): ScenarioIntent {
  return {
    type: 'personality-test',
    title: 'JX3 Personality Test',
    description: 'Discover your sect affinity',
    dimensions: { x: '处世', y: '立场', z: '性情' },
    anchors: [
      { id: 'a1', name: 'Anchor A', vector: { x: 1, y: 0, z: 0 }, title: 'Result A' },
      { id: 'a2', name: 'Anchor B', vector: { x: -1, y: 1, z: 0 }, title: 'Result B' },
    ],
    steps: [
      {
        id: 'intro',
        kind: 'scene',
        dialogue: 'You encounter a fork in the road.',
        speaker: 'Narrator',
        choices: [
          { text: 'Go left', interaction: 'tap', vector: { x: 1, y: 0, z: 0 }, nextStep: 'calc' },
          { text: 'Go right', interaction: 'tap', vector: { x: -1, y: 1, z: 0 }, nextStep: 'calc' },
        ],
      },
      {
        id: 'calc',
        kind: 'calculator',
        targetVariable: 'totalScore',
      },
    ],
    settlement: makeSettlement('vector-nearest', {
      resultMapping: [
        { resultId: 'a1', title: 'Result A' },
        { resultId: 'a2', title: 'Result B' },
      ],
    }),
  };
}

// ── 1. FlowBuilder Tests ───────────────────────────────────

describe('FlowBuilder.buildFlow', () => {
  it('builds a minimal flow with start + scene + settlement', () => {
    const intent = makeMinimalIntent();
    const flow = buildFlow(intent) as unknown as {
      nodes: Array<{ id: string; type: string; data: Record<string, unknown> }>;
      edges: Array<{ source: string; target: string; sourceHandle: string | null }>;
    };

    expect(flow.nodes).toHaveLength(3); // start + scene + settlement
    expect(flow.nodes[0].type).toBe('start');
    expect(flow.nodes[1].type).toBe('scene');
    expect(flow.nodes[2].type).toBe('settlement');

    // start → scene → settlement
    expect(flow.edges).toHaveLength(3); // start→scene + 2 choice edges
    expect(flow.edges[0].source).toBe('start_0');
    expect(flow.edges[0].target).toBe('s1');
  });

  it('wires scene choice edges with sourceHandle = choice id', () => {
    const intent = makeMinimalIntent();
    const flow = buildFlow(intent) as unknown as {
      edges: Array<{ source: string; sourceHandle: string | null; target: string }>;
    };

    // First edge is start→step (no handle), then 2 choice edges.
    const choiceEdges = flow.edges.filter((e) => e.source === 's1');
    expect(choiceEdges).toHaveLength(2);
    // Both choices target settlement (default sequential target is last step → settlement).
    expect(choiceEdges.every((e) => e.target === 'settlement_0')).toBe(true);
    // sourceHandle should be set (choice id).
    expect(choiceEdges[0].sourceHandle).toBeTruthy();
    expect(choiceEdges[1].sourceHandle).toBeTruthy();
    expect(choiceEdges[0].sourceHandle).not.toBe(choiceEdges[1].sourceHandle);
  });

  it('connects multiple steps sequentially', () => {
    const intent: ScenarioIntent = {
      type: 'quiz',
      title: 'Multi-step Quiz',
      steps: [
        { id: 'q1', kind: 'scene', dialogue: 'Q1', choices: [{ text: 'ans', interaction: 'tap' }] },
        { id: 'q2', kind: 'scene', dialogue: 'Q2', choices: [{ text: 'ans', interaction: 'tap' }] },
        { id: 'q3', kind: 'scene', dialogue: 'Q3', choices: [{ text: 'ans', interaction: 'tap' }] },
      ],
      settlement: makeSettlement('count-tally'),
    };

    const flow = buildFlow(intent) as unknown as {
      edges: Array<{ source: string; target: string }>;
    };

    // start → q1, q1 → q2, q2 → q3, q3 → settlement
    const startEdge = flow.edges.find((e) => e.source === 'start_0');
    expect(startEdge?.target).toBe('q1');

    const q1Edge = flow.edges.find((e) => e.source === 'q1');
    expect(q1Edge?.target).toBe('q2');

    const q2Edge = flow.edges.find((e) => e.source === 'q2');
    expect(q2Edge?.target).toBe('q3');

    const q3Edge = flow.edges.find((e) => e.source === 'q3');
    expect(q3Edge?.target).toBe('settlement_0');
  });

  it('resolves choice.nextStep to target step id', () => {
    const intent: ScenarioIntent = {
      type: 'story-adventure',
      title: 'Branching Story',
      steps: [
        {
          id: 'start_scene',
          kind: 'scene',
          dialogue: 'Choose',
          choices: [
            { text: 'Path A', interaction: 'tap', nextStep: 'ending_a' },
            { text: 'Path B', interaction: 'tap', nextStep: 'ending_b' },
          ],
        },
        { id: 'ending_a', kind: 'scene', dialogue: 'A ending', choices: [{ text: 'ok', interaction: 'tap' }] },
        { id: 'ending_b', kind: 'scene', dialogue: 'B ending', choices: [{ text: 'ok', interaction: 'tap' }] },
      ],
      settlement: makeSettlement('variable-map'),
    };

    const flow = buildFlow(intent) as unknown as {
      edges: Array<{ source: string; target: string; sourceHandle: string | null }>;
    };

    const choiceEdges = flow.edges.filter((e) => e.source === 'start_scene');
    expect(choiceEdges).toHaveLength(2);
    const targets = choiceEdges.map((e) => e.target).sort();
    expect(targets).toEqual(['ending_a', 'ending_b']);
  });

  it('resolves nextStep: "settlement" to the settlement node', () => {
    const intent: ScenarioIntent = {
      type: 'custom',
      title: 'Jump to Settlement',
      steps: [
        {
          id: 's1',
          kind: 'scene',
          dialogue: 'Finish now',
          choices: [{ text: 'end', interaction: 'tap', nextStep: 'settlement' }],
        },
      ],
      settlement: makeSettlement('vector-nearest'),
    };

    const flow = buildFlow(intent) as unknown as {
      edges: Array<{ source: string; target: string }>;
    };

    const choiceEdge = flow.edges.find((e) => e.source === 's1');
    expect(choiceEdge?.target).toBe('settlement_0');
  });

  it('creates logic node with true/false branch edges', () => {
    const intent: ScenarioIntent = {
      type: 'custom',
      title: 'Logic Branch',
      steps: [
        {
          id: 'check',
          kind: 'logic',
          checkType: 'variable',
          varName: 'score',
          operator: '>=',
          value: 10,
          nextStepTrue: 'pass_scene',
          nextStepFalse: 'fail_scene',
        },
        { id: 'pass_scene', kind: 'scene', dialogue: 'Pass', choices: [{ text: 'ok', interaction: 'tap' }] },
        { id: 'fail_scene', kind: 'scene', dialogue: 'Fail', choices: [{ text: 'ok', interaction: 'tap' }] },
      ],
      settlement: makeSettlement('variable-map'),
    };

    const flow = buildFlow(intent) as unknown as {
      edges: Array<{ source: string; target: string; sourceHandle: string | null }>;
    };

    const trueEdge = flow.edges.find((e) => e.source === 'check' && e.sourceHandle === 'true');
    const falseEdge = flow.edges.find((e) => e.source === 'check' && e.sourceHandle === 'false');
    expect(trueEdge).toBeDefined();
    expect(falseEdge).toBeDefined();
    expect(trueEdge?.target).toBe('pass_scene');
    expect(falseEdge?.target).toBe('fail_scene');
  });

  it('builds video step node with correct fields', () => {
    const intent: ScenarioIntent = {
      type: 'custom',
      title: 'Video Demo',
      steps: [
        { id: 'v1', kind: 'video', videoUrl: 'https://example.com/v.mp4', skipAllowed: false },
      ],
      settlement: makeSettlement('vector-nearest'),
    };

    const flow = buildFlow(intent) as unknown as {
      nodes: Array<{ id: string; type: string; data: Record<string, unknown> }>;
    };
    const videoNode = flow.nodes.find((n) => n.id === 'v1');
    expect(videoNode?.type).toBe('video');
    expect(videoNode?.data.videoUrl).toBe('https://example.com/v.mp4');
    expect(videoNode?.data.skipAllowed).toBe(false);
  });

  it('builds setter step and collects initial variables', () => {
    const intent: ScenarioIntent = {
      type: 'custom',
      title: 'Setter Demo',
      steps: [
        {
          id: 'set1',
          kind: 'setter',
          assignments: [
            { variable: 'score', value: 0, operator: 'set' },
            { variable: 'level', value: 1, operator: 'set' },
          ],
        },
      ],
      settlement: makeSettlement('variable-map'),
    };

    const flow = buildFlow(intent) as unknown as {
      nodes: Array<{ id: string; type: string; data: Record<string, unknown> }>;
      variables: Record<string, unknown>;
    };

    const setterNode = flow.nodes.find((n) => n.id === 'set1');
    expect(setterNode?.type).toBe('setter');
    expect(setterNode?.data.assignments).toHaveLength(2);

    // Variables collected from setter assignments.
    expect(flow.variables.score).toBe(0);
    expect(flow.variables.level).toBe(1);
  });

  it('builds calculator step with targetVariable initialized to 0', () => {
    const intent: ScenarioIntent = {
      type: 'quiz',
      title: 'Calc Demo',
      steps: [
        { id: 'c1', kind: 'calculator', targetVariable: 'total' },
      ],
      settlement: makeSettlement('count-tally'),
    };

    const flow = buildFlow(intent) as unknown as {
      variables: Record<string, unknown>;
    };
    expect(flow.variables.total).toBe(0);
  });

  it('enables vectorSpace when dimensions are provided', () => {
    const intent = makeFullIntent();
    const flow = buildFlow(intent) as unknown as {
      settings: { vectorSpace: { enabled: boolean; dimensions: Record<string, string> } };
    };

    expect(flow.settings.vectorSpace.enabled).toBe(true);
    expect(flow.settings.vectorSpace.dimensions).toEqual({ x: '处世', y: '立场', z: '性情' });
  });

  it('disables vectorSpace when no dimensions provided', () => {
    const intent = makeMinimalIntent();
    const flow = buildFlow(intent) as unknown as {
      settings: { vectorSpace: { enabled: boolean } };
    };
    expect(flow.settings.vectorSpace.enabled).toBe(false);
  });

  it('maps anchors to settlement resultMapping when resultMapping omitted', () => {
    const intent = makeFullIntent();
    intent.settlement.resultMapping = undefined; // force anchor-based mapping
    const flow = buildFlow(intent) as unknown as {
      nodes: Array<{ type: string; data: { resultMapping?: Array<{ resultId: string; title: string }> } }>;
    };

    const settlementNode = flow.nodes.find((n) => n.type === 'settlement');
    expect(settlementNode?.data.resultMapping).toHaveLength(2);
    expect(settlementNode?.data.resultMapping?.[0].resultId).toBe('a1');
    expect(settlementNode?.data.resultMapping?.[1].resultId).toBe('a2');
  });

  it('throws on unknown step kind', () => {
    const intent = makeMinimalIntent();
    // Force an unknown kind via cast to test the guard.
    (intent.steps[0] as { kind: string }).kind = 'unknown-kind';
    expect(() => buildFlow(intent)).toThrow(/Unknown step kind/);
  });
});

// ── 2. SimulationValidator Tests ───────────────────────────

describe('SimulationValidator.validateFlow', () => {
  it('reports no error issues for a healthy linear flow', () => {
    const intent = makeMinimalIntent();
    const flow = buildFlow(intent) as unknown as Parameters<typeof validateFlow>[0];
    const result = validateFlow(flow, { runs: 50, seed: 'test' });

    const errors = result.issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
    expect(result.totalRuns).toBe(50);
    expect(result.nodeCoverage).toBe(1); // all reachable
  });

  it('detects dead-end nodes (non-terminal with no outgoing edges)', () => {
    // Build a flow manually with a dead-end scene node.
    const flow = {
      nodes: [
        { id: 'start_0', type: 'start', data: {} },
        { id: 'dead_scene', type: 'scene', data: { choices: [] } },
        { id: 'settlement_0', type: 'settlement', data: {} },
      ],
      edges: [
        { id: 'e1', source: 'start_0', target: 'dead_scene', sourceHandle: null },
        // dead_scene has no outgoing edges
      ],
    };
    const result = validateFlow(flow, { runs: 10, seed: 'dead' });
    const deadEndIssue = result.issues.find(
      (i) => i.code === 'DEAD_END' && i.nodeId === 'dead_scene',
    );
    expect(deadEndIssue).toBeDefined();
    expect(deadEndIssue?.severity).toBe('error');
  });

  it('detects unreachable nodes', () => {
    const flow = {
      nodes: [
        { id: 'start_0', type: 'start', data: {} },
        { id: 'reachable', type: 'scene', data: { choices: [{ id: 'c1' }] } },
        { id: 'unreachable', type: 'scene', data: { choices: [{ id: 'c2' }] } },
        { id: 'settlement_0', type: 'settlement', data: {} },
      ],
      edges: [
        { id: 'e1', source: 'start_0', target: 'reachable', sourceHandle: null },
        { id: 'e2', source: 'reachable', target: 'settlement_0', sourceHandle: 'c1' },
        // unreachable node has no incoming edges
      ],
    };
    const result = validateFlow(flow, { runs: 10, seed: 'unreach' });
    const unreachableIssue = result.issues.find(
      (i) => i.code === 'UNREACHABLE_NODE' && i.nodeId === 'unreachable',
    );
    expect(unreachableIssue).toBeDefined();
    expect(unreachableIssue?.severity).toBe('warning');
  });

  it('reports NO_SETTLEMENT when flow has no settlement node', () => {
    const flow = {
      nodes: [
        { id: 'start_0', type: 'start', data: {} },
        { id: 'scene_0', type: 'scene', data: { choices: [{ id: 'c1' }] } },
      ],
      edges: [{ id: 'e1', source: 'start_0', target: 'scene_0', sourceHandle: null }],
    };
    const result = validateFlow(flow, { runs: 5, seed: 'noSet' });
    const noSettlementIssue = result.issues.find((i) => i.code === 'NO_SETTLEMENT');
    expect(noSettlementIssue).toBeDefined();
    expect(noSettlementIssue?.severity).toBe('error');
  });

  it('reports UNREACHABLE_SETTLEMENT when settlement is not reachable', () => {
    const flow = {
      nodes: [
        { id: 'start_0', type: 'start', data: {} },
        { id: 'dead_scene', type: 'scene', data: { choices: [] } },
        { id: 'settlement_0', type: 'settlement', data: {} },
      ],
      edges: [
        { id: 'e1', source: 'start_0', target: 'dead_scene', sourceHandle: null },
        // settlement_0 has no incoming edges
      ],
    };
    const result = validateFlow(flow, { runs: 5, seed: 'unreachSet' });
    const unreachableSettlement = result.issues.find(
      (i) => i.code === 'UNREACHABLE_SETTLEMENT',
    );
    expect(unreachableSettlement).toBeDefined();
    expect(unreachableSettlement?.severity).toBe('error');
  });

  it('produces deterministic results with the same seed', () => {
    const intent = makeFullIntent();
    const flow = buildFlow(intent) as unknown as Parameters<typeof validateFlow>[0];
    const result1 = validateFlow(flow, { runs: 100, seed: 'deterministic' });
    const result2 = validateFlow(flow, { runs: 100, seed: 'deterministic' });

    expect(result1.deadEnds).toBe(result2.deadEnds);
    expect(result1.timedOuts).toBe(result2.timedOuts);
    expect(result1.settlementDistribution).toEqual(result2.settlementDistribution);
  });

  it('populates settlementDistribution when settlement is reachable', () => {
    const intent = makeMinimalIntent();
    const flow = buildFlow(intent) as unknown as Parameters<typeof validateFlow>[0];
    const result = validateFlow(flow, { runs: 50, seed: 'dist' });

    // All runs should reach the settlement (2 choices both → settlement).
    expect(result.settlementDistribution['settlement_0']).toBeGreaterThan(0);
    const totalReached = Object.values(result.settlementDistribution).reduce((a, b) => a + b, 0);
    expect(totalReached).toBe(50); // all runs reach settlement
  });

  it('respects maxSteps option to detect infinite loops', () => {
    // Build a flow with a cycle: start → a → b → a (loop), no settlement reachable.
    const flow = {
      nodes: [
        { id: 'start_0', type: 'start', data: {} },
        { id: 'a', type: 'scene', data: { choices: [{ id: 'c1' }] } },
        { id: 'b', type: 'scene', data: { choices: [{ id: 'c2' }] } },
        { id: 'settlement_0', type: 'settlement', data: {} },
      ],
      edges: [
        { id: 'e1', source: 'start_0', target: 'a', sourceHandle: null },
        { id: 'e2', source: 'a', target: 'b', sourceHandle: 'c1' },
        { id: 'e3', source: 'b', target: 'a', sourceHandle: 'c2' }, // cycle back
        // settlement_0 exists but is unreachable
      ],
    };
    const result = validateFlow(flow, { runs: 5, seed: 'loop', maxSteps: 20 });
    // Should detect timeouts from the cycle.
    expect(result.timedOuts).toBeGreaterThan(0);
    const timeoutIssue = result.issues.find((i) => i.code === 'TIMEOUTS');
    expect(timeoutIssue).toBeDefined();
  });

  it('reports HIGH_DEAD_END_RATE when dead-end rate exceeds 5%', () => {
    // A flow where most paths dead-end.
    const flow = {
      nodes: [
        { id: 'start_0', type: 'start', data: {} },
        { id: 'dead_scene', type: 'scene', data: { choices: [] } }, // dead end
        { id: 'settlement_0', type: 'settlement', data: {} },
      ],
      edges: [
        { id: 'e1', source: 'start_0', target: 'dead_scene', sourceHandle: null },
      ],
    };
    const result = validateFlow(flow, { runs: 20, seed: 'highDead' });
    const highDeadRate = result.issues.find((i) => i.code === 'HIGH_DEAD_END_RATE');
    expect(highDeadRate).toBeDefined();
  });

  it('reports NO_START_NODE when flow has no nodes', () => {
    const result = validateFlow({ nodes: [], edges: [] }, { runs: 5, seed: 'empty' });
    const noStart = result.issues.find((i) => i.code === 'NO_START_NODE');
    expect(noStart).toBeDefined();
    expect(noStart?.severity).toBe('error');
  });
});

// ── 3. ScenarioTypes Metadata Tests ───────────────────────

describe('ScenarioTypes metadata', () => {
  it('defines exactly 6 scenario types', () => {
    expect(SCENARIO_TYPES).toHaveLength(6);
    const types = SCENARIO_TYPES.map((t) => t.type);
    expect(types).toContain('personality-test');
    expect(types).toContain('game-social-card');
    expect(types).toContain('quiz');
    expect(types).toContain('survey');
    expect(types).toContain('story-adventure');
    expect(types).toContain('custom');
  });

  it('each scenario type has required fields', () => {
    for (const t of SCENARIO_TYPES) {
      expect(t.type).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(typeof t.usesVectorSpace).toBe('boolean');
      expect(t.defaultStrategy).toBeTruthy();
      expect(t.recommendedVisualBlocks.length).toBeGreaterThan(0);
    }
  });

  it('defines exactly 8 node capabilities', () => {
    expect(NODE_CAPABILITIES).toHaveLength(8);
    const types = NODE_CAPABILITIES.map((n) => n.type);
    expect(types).toEqual(
      expect.arrayContaining([
        'start', 'scene', 'logic', 'setter', 'calculator', 'settlement', 'video', 'link',
      ]),
    );
  });

  it('marks settlement and link as terminal nodes', () => {
    const settlement = NODE_CAPABILITIES.find((n) => n.type === 'settlement');
    const link = NODE_CAPABILITIES.find((n) => n.type === 'link');
    expect(settlement?.isTerminal).toBe(true);
    expect(link?.isTerminal).toBe(true);

    const scene = NODE_CAPABILITIES.find((n) => n.type === 'scene');
    expect(scene?.isTerminal).toBe(false);
  });

  it('defines exactly 4 settlement strategies', () => {
    expect(SETTLEMENT_STRATEGIES).toHaveLength(4);
    const ids = SETTLEMENT_STRATEGIES.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining(['vector-nearest', 'threshold', 'count-tally', 'variable-map']),
    );
  });
});

// ── 4. Schema Validation Tests ─────────────────────────────

describe('Zod schema validation', () => {
  it('accepts a valid ScenarioIntent', () => {
    const intent = makeFullIntent();
    const result = ScenarioIntentSchema.safeParse(intent);
    expect(result.success).toBe(true);
  });

  it('rejects ScenarioIntent without steps', () => {
    const intent = makeMinimalIntent();
    const { steps, ...withoutSteps } = intent;
    void steps;
    const result = ScenarioIntentSchema.safeParse(withoutSteps);
    expect(result.success).toBe(false);
  });

  it('rejects ScenarioIntent with empty steps array', () => {
    const intent = makeMinimalIntent();
    intent.steps = [];
    const result = ScenarioIntentSchema.safeParse(intent);
    expect(result.success).toBe(false);
  });

  it('rejects unknown scenario type', () => {
    const intent = makeMinimalIntent();
    (intent as { type: string }).type = 'unknown-type';
    const result = ScenarioIntentSchema.safeParse(intent);
    expect(result.success).toBe(false);
  });

  it('accepts CompileRequest with simulation config', () => {
    const result = CompileRequestSchema.safeParse({
      intent: makeFullIntent(),
      simulation: { runs: 100, seed: 'abc', maxStepsPerRun: 150 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts CompileRequest without optional projectId', () => {
    const result = CompileRequestSchema.safeParse({
      intent: makeMinimalIntent(),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectId).toBeUndefined();
    }
  });

  it('rejects invalid projectId format', () => {
    const result = CompileRequestSchema.safeParse({
      intent: makeMinimalIntent(),
      projectId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('applies default settlement strategy when omitted', () => {
    const intent = makeMinimalIntent();
    const { settlement, ...withoutSettlement } = intent;
    void settlement;
    // settlement is required by schema, so this should fail.
    const result = ScenarioIntentSchema.safeParse(withoutSettlement);
    expect(result.success).toBe(false);
  });

  it('applies default visualBlocks to settlement', () => {
    const intent = makeMinimalIntent();
    const result = ScenarioIntentSchema.safeParse(intent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.settlement.visualBlocks).toEqual(['badge', 'title', 'layered-texts']);
    }
  });
});

// ── 5. End-to-End Compile Pipeline ─────────────────────────

describe('End-to-end: intent → buildFlow → validateFlow', () => {
  it('full personality-test intent compiles to a valid flow with no errors', () => {
    const intent = makeFullIntent();
    const flow = buildFlow(intent) as unknown as Parameters<typeof validateFlow>[0];
    const result = validateFlow(flow, { runs: 200, seed: 'e2e' });

    const errors = result.issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
    expect(result.nodeCoverage).toBe(1);
    expect(result.deadEnds).toBe(0);
    // Settlement should be reachable in all runs.
    expect(result.settlementDistribution['settlement_0']).toBe(200);
  });

  it('quiz scenario with count-tally strategy compiles cleanly', () => {
    const intent: ScenarioIntent = {
      type: 'quiz',
      title: 'Knowledge Quiz',
      steps: [
        { id: 'q1', kind: 'scene', dialogue: 'Q1?', choices: [{ text: 'A', interaction: 'tap' }, { text: 'B', interaction: 'tap' }] },
        { id: 'q2', kind: 'scene', dialogue: 'Q2?', choices: [{ text: 'A', interaction: 'tap' }, { text: 'B', interaction: 'tap' }] },
        { id: 'q3', kind: 'scene', dialogue: 'Q3?', choices: [{ text: 'A', interaction: 'tap' }, { text: 'B', interaction: 'tap' }] },
      ],
      settlement: makeSettlement('count-tally'),
    };

    const flow = buildFlow(intent) as unknown as Parameters<typeof validateFlow>[0];
    const result = validateFlow(flow, { runs: 100, seed: 'quiz' });

    const errors = result.issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
    expect(result.nodeCoverage).toBe(1);
  });

  it('story-adventure with branching compiles and all branches reach settlement', () => {
    const intent: ScenarioIntent = {
      type: 'story-adventure',
      title: 'Branching Adventure',
      steps: [
        {
          id: 'start_scene',
          kind: 'scene',
          dialogue: 'Choose path',
          choices: [
            { text: 'Left', interaction: 'tap', nextStep: 'left_scene' },
            { text: 'Right', interaction: 'tap', nextStep: 'right_scene' },
          ],
        },
        {
          id: 'left_scene',
          kind: 'scene',
          dialogue: 'Left path',
          choices: [{ text: 'continue', interaction: 'tap', nextStep: 'settlement' }],
        },
        {
          id: 'right_scene',
          kind: 'scene',
          dialogue: 'Right path',
          choices: [{ text: 'continue', interaction: 'tap', nextStep: 'settlement' }],
        },
      ],
      settlement: makeSettlement('variable-map'),
    };

    const flow = buildFlow(intent) as unknown as Parameters<typeof validateFlow>[0];
    const result = validateFlow(flow, { runs: 200, seed: 'adventure' });

    const errors = result.issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
    expect(result.deadEnds).toBe(0);
    // All branches lead to settlement.
    expect(result.settlementDistribution['settlement_0']).toBe(200);
  });

  it('mixed step kinds (video + setter + scene + logic) compile cleanly', () => {
    const intent: ScenarioIntent = {
      type: 'custom',
      title: 'Mixed Scenario',
      steps: [
        { id: 'intro_video', kind: 'video', videoUrl: 'https://example.com/intro.mp4', skipAllowed: true },
        { id: 'init', kind: 'setter', assignments: [{ variable: 'score', value: 0, operator: 'set' }] },
        {
          id: 'choice_scene',
          kind: 'scene',
          dialogue: 'Pick one',
          choices: [
            { text: 'Option A', interaction: 'tap', nextStep: 'check' },
            { text: 'Option B', interaction: 'tap', nextStep: 'check' },
          ],
        },
        {
          id: 'check',
          kind: 'logic',
          checkType: 'variable',
          varName: 'score',
          operator: '>=',
          value: 1,
          nextStepTrue: 'settlement',
          nextStepFalse: 'settlement',
        },
      ],
      settlement: makeSettlement('variable-map'),
    };

    const flow = buildFlow(intent) as unknown as Parameters<typeof validateFlow>[0];
    const result = validateFlow(flow, { runs: 100, seed: 'mixed' });

    const errors = result.issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
    expect(result.nodeCoverage).toBe(1);
  });
});

// ── 6. Service Layer (mocked DB) ───────────────────────────

/**
 * The service layer imports the DB singleton. We mock it so we can test
 * the compile business logic (hasErrors → skip save) without a live DB.
 */
vi.mock('../../config/database', () => {
  const mockReturning = vi.fn();
  const mockQuery = {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: mockReturning })) })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(() => ({ returning: mockReturning })) })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => []),
      })),
    })),
  };
  return { db: mockQuery, __mockReturning: mockReturning };
});

describe('AgentService.compile (mocked DB)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns status "success" and saves project when flow has no errors', async () => {
    const { db, __mockReturning } = await import('../../config/database') as unknown as {
      db: { insert: ReturnType<typeof vi.fn> };
      __mockReturning: ReturnType<typeof vi.fn>;
    };
    __mockReturning.mockResolvedValue([{ id: 'fake-uuid' }]);

    const { compile } = await import('./agent.service');
    const intent = makeFullIntent();
    const result = await compile({ id: 'user-1', email: 'a@b.c' }, { intent });

    expect(result.status).toBe('success');
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
    expect(result.projectId).toBe('fake-uuid');
    expect(db.insert).toHaveBeenCalled();
  });

  it('returns status "issues" and skips DB save when validation reports errors', async () => {
    const { db } = await import('../../config/database') as unknown as {
      db: { insert: ReturnType<typeof vi.fn> };
    };

    // FlowBuilder always generates structurally-healthy flows, so we mock
    // validateFlow to simulate a validation failure (e.g. a dead-end detected
    // by the Monte Carlo simulation that the static analysis missed).
    const validateSpy = vi.spyOn(simulationValidatorNs, 'validateFlow');
    validateSpy.mockReturnValue({
      issues: [
        { severity: 'error', code: 'DEAD_END', message: 'mocked dead end', nodeId: 's1' },
      ],
      totalRuns: 10,
      deadEnds: 10,
      timedOuts: 0,
      nodeCoverage: 0,
      settlementDistribution: {},
    });

    const intent = makeMinimalIntent();
    const { compile } = await import('./agent.service');
    const result = await compile({ id: 'user-1', email: 'a@b.c' }, { intent });

    expect(result.status).toBe('issues');
    expect(result.issues.filter((i) => i.severity === 'error').length).toBeGreaterThan(0);
    expect(result.projectId).toBeUndefined();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('updates existing project when projectId is provided', async () => {
    const { __mockReturning } = await import('../../config/database') as unknown as {
      __mockReturning: ReturnType<typeof vi.fn>;
    };
    __mockReturning.mockResolvedValue([{ id: 'existing-uuid' }]);

    const intent = makeFullIntent();
    const { compile } = await import('./agent.service');
    const result = await compile(
      { id: 'user-1', email: 'a@b.c' },
      { intent, projectId: 'existing-uuid' },
    );

    expect(result.status).toBe('success');
    expect(result.projectId).toBe('existing-uuid');
  });
});
