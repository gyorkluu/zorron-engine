/**
 * FlowBuilder - translates a ScenarioIntent (declarative DSL) into a FlowData
 * (nodes + edges + settings) that the GameEngine can execute.
 *
 * Design:
 * - Steps are sequential by default (step[i] → step[i+1]).
 * - Branching is expressed via `choices[].nextStep` or logic `nextStepTrue/False`.
 * - A settlement node is always created at the end.
 * - If `dimensions` are provided, the vector space is enabled and anchors are set.
 */

import type { ScenarioIntent, ScenarioStep } from './agent.schema';
import type { FlowData } from '../project/flow-data.schema';
import { resolveVisualBlocks } from './visualBlocks';

// ── Types (mirrors frontend types/flow.ts, kept local to avoid cross-app deps) ──

interface BuiltNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface BuiltEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}

const SETTLEMENT_NODE_ID = 'settlement_0';
const START_NODE_ID = 'start_0';

/** Build a complete FlowData from a ScenarioIntent. */
export function buildFlow(intent: ScenarioIntent): FlowData {
  const nodes: BuiltNode[] = [];
  const edges: BuiltEdge[] = [];

  // ── 1. Start node ──
  nodes.push({
    id: START_NODE_ID,
    type: 'start',
    position: { x: 0, y: 0 },
    data: {
      label: intent.title,
      title: intent.title,
      intro: intent.description ?? '',
    },
  });

  // ── 2. Step nodes ──
  const stepIds: string[] = [];
  for (let i = 0; i < intent.steps.length; i++) {
    const step = intent.steps[i];
    const stepId = step.id || `step_${i}`;
    stepIds.push(stepId);
    const node = buildStepNode(step, stepId, i);
    nodes.push(node);
  }

  // ── 3. Settlement node ──
  // Resolve visual block ids/configs into concrete blocks (ECO-002).
  const resolvedBlocks = resolveVisualBlocks(intent.settlement.visualBlocks);
  const settlementData: Record<string, unknown> = {
    label: '结算',
    strategy: intent.settlement.strategy,
    strategyConfig: intent.settlement.strategyConfig ?? {},
    resultMapping:
      intent.settlement.resultMapping ??
      intent.anchors?.map((a) => ({
        resultId: a.id,
        title: a.title ?? a.name,
        description: a.description,
        coverUrl: a.coverUrl,
      })) ??
      [{ resultId: 'default', title: '完成' }],
    buttons: [],
    variableModifiers: [],
    visualBlocks: resolvedBlocks,
  };
  nodes.push({
    id: SETTLEMENT_NODE_ID,
    type: 'settlement',
    position: { x: 0, y: (intent.steps.length + 1) * 150 },
    data: settlementData,
  });

  // ── 4. Wire edges ──
  // start → first step
  edges.push(makeEdge('e_start', START_NODE_ID, stepIds[0] ?? SETTLEMENT_NODE_ID, null));

  // step → next
  for (let i = 0; i < intent.steps.length; i++) {
    const step = intent.steps[i];
    const sourceId = stepIds[i];
    const defaultTarget =
      i + 1 < intent.steps.length ? stepIds[i + 1] : SETTLEMENT_NODE_ID;

    wireStepEdges(step, sourceId, defaultTarget, stepIds, SETTLEMENT_NODE_ID, edges);
  }

  // ── 5. Settings ──
  const hasDimensions = intent.dimensions && Object.keys(intent.dimensions).length > 0;
  const variables: Record<string, string | number | boolean> = {};

  // Collect initial variables from setter steps.
  for (const step of intent.steps) {
    if (step.kind === 'setter' && step.assignments) {
      for (const a of step.assignments) {
        if (a.operator === 'set' && !(a.variable in variables)) {
          variables[a.variable] = a.value;
        }
      }
    }
    // Calculator steps may write to a target variable.
    if (step.kind === 'calculator' && step.targetVariable) {
      if (!(step.targetVariable in variables)) {
        variables[step.targetVariable] = 0;
      }
    }
  }

  const flowData: Record<string, unknown> = {
    nodes,
    edges,
    variables,
    settings: {
      title: intent.title,
      description: intent.description,
      vectorSpace: {
        enabled: hasDimensions ?? false,
        dimensions: intent.dimensions ?? { x: 'x', y: 'y', z: 'z' },
        sects: intent.anchors ?? [],
      },
    },
    version: '1.0.0',
  };

  return flowData as unknown as FlowData;
}

// ── Node Builders ──────────────────────────────────────────

function buildStepNode(step: ScenarioStep, stepId: string, index: number): BuiltNode {
  const position = { x: 0, y: (index + 1) * 150 };
  switch (step.kind) {
    case 'scene':
      return {
        id: stepId,
        type: 'scene',
        position,
        data: {
          label: step.id,
          dialogue: step.dialogue ?? '',
          speaker: step.speaker,
          backgroundUrl: step.backgroundUrl,
          characterUrl: step.characterUrl,
          choices: (step.choices ?? []).map((c, ci) => ({
            id: c.dropFragmentId ?? `c_${stepId}_${ci}`,
            text: c.text,
            interaction: c.interaction ?? 'tap',
            holdDuration: c.holdDuration,
            slashDirection: c.slashDirection,
            vector: c.vector,
            dropFragmentId: c.dropFragmentId,
          })),
        },
      };

    case 'video':
      return {
        id: stepId,
        type: 'video',
        position,
        data: {
          label: step.id,
          videoUrl: step.videoUrl ?? '',
          autoPlay: true,
          skipAllowed: step.skipAllowed ?? true,
        },
      };

    case 'setter':
      return {
        id: stepId,
        type: 'setter',
        position,
        data: {
          label: step.id,
          assignments: step.assignments ?? [],
        },
      };

    case 'logic':
      return {
        id: stepId,
        type: 'logic',
        position,
        data: {
          label: step.id,
          checkType: step.checkType ?? 'variable',
          varName: step.varName,
          operator: step.operator ?? '>=',
          value: step.value ?? 0,
          countThreshold: step.countThreshold,
          targetFragmentId: step.targetFragmentId,
        },
      };

    case 'calculator':
      return {
        id: stepId,
        type: 'calculator',
        position,
        data: {
          label: step.id,
          vector: {},
          targetVariable: step.targetVariable,
        },
      };

    default:
      throw new Error(`Unknown step kind: ${(step as { kind: string }).kind}`);
  }
}

// ── Edge Wiring ─────────────────────────────────────────────

function wireStepEdges(
  step: ScenarioStep,
  sourceId: string,
  defaultTarget: string,
  allStepIds: string[],
  settlementId: string,
  edges: BuiltEdge[],
): void {
  if (step.kind === 'scene' && step.choices && step.choices.length > 0) {
    // Each choice gets its own edge with sourceHandle = choice id.
    step.choices.forEach((choice, ci) => {
      const choiceId = choice.dropFragmentId ?? `c_${sourceId}_${ci}`;
      const target = resolveTarget(choice.nextStep, defaultTarget, allStepIds, settlementId);
      edges.push(makeEdge(`e_${sourceId}_${ci}`, sourceId, target, choiceId));
    });
  } else if (step.kind === 'logic') {
    // Logic has true/false handles.
    const trueTarget = resolveTarget(step.nextStepTrue, defaultTarget, allStepIds, settlementId);
    const falseTarget = resolveTarget(
      step.nextStepFalse,
      defaultTarget,
      allStepIds,
      settlementId,
    );
    edges.push(makeEdge(`e_${sourceId}_true`, sourceId, trueTarget, 'true'));
    edges.push(makeEdge(`e_${sourceId}_false`, sourceId, falseTarget, 'false'));
  } else {
    // Simple sequential edge.
    const target = resolveTarget(step.nextStep, defaultTarget, allStepIds, settlementId);
    edges.push(makeEdge(`e_${sourceId}`, sourceId, target, null));
  }
}

function resolveTarget(
  nextStep: string | undefined,
  defaultTarget: string,
  allStepIds: string[],
  settlementId: string,
): string {
  if (!nextStep) return defaultTarget;
  if (nextStep === 'settlement') return settlementId;
  if (allStepIds.includes(nextStep)) return nextStep;
  return defaultTarget;
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle: string | null,
): BuiltEdge {
  return { id, source, target, sourceHandle, targetHandle: null };
}
