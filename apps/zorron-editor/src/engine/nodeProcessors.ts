/**
 * Node processors - pure functions for each node type's side effects.
 *
 * These are extracted from the GameEngine so they can be unit-tested in
 * isolation and reused by the simulator (MIG-013). The GameEngine delegates
 * to these for variable mutations and vector accumulation.
 */

import type {
  LogicNodeData,
  SetterNodeData,
  CalculatorNodeData,
  SettlementNodeData,
  SceneChoice,
  Variables,
  PersonalityVector,
  ResultAnchor,
  SettlementResultMapping,
} from '@/types/flow';
import { add, magnitude, distance, quadrant, ZERO_VECTOR } from './vectorMath';
import { settlementStrategyRegistry } from './settlementStrategies';

/** Context passed to every processor. */
export interface ProcessorContext {
  variables: Variables;
  fragments: Set<string>;
  currentVector: PersonalityVector;
  pendingVector: PersonalityVector;
  sects: ResultAnchor[];
  /** Whether the vector space is enabled. When false, vector deltas are ignored. */
  vectorEnabled: boolean;
}

/** Result of evaluating a logic node. */
export function evaluateLogic(
  data: LogicNodeData,
  ctx: ProcessorContext,
): boolean {
  const checkType = data.checkType ?? 'variable';
  if (checkType === 'count') {
    return compare(ctx.fragments.size, data.operator ?? '>=', data.countThreshold ?? 0);
  }
  if (checkType === 'has-specific') {
    return ctx.fragments.has(data.targetFragmentId ?? '');
  }
  const current = Number(ctx.variables[data.varName ?? ''] ?? 0);
  return compare(current, data.operator ?? '>=', data.value ?? 0);
}

/** Apply a setter node's assignments, returning the new variables map. */
export function applySetter(
  data: SetterNodeData,
  ctx: ProcessorContext,
): Variables {
  const next: Variables = { ...ctx.variables };
  for (const assignment of data.assignments ?? []) {
    if (assignment.operator === 'set') {
      next[assignment.variable] = assignment.value;
    } else {
      const current = Number(next[assignment.variable] ?? 0);
      const delta = Number(assignment.value);
      next[assignment.variable] =
        assignment.operator === 'add' ? current + delta : current - delta;
    }
  }
  return next;
}

/** Apply a calculator node: merge pending vector into current, optional target variable. */
export function applyCalculator(
  data: CalculatorNodeData,
  ctx: ProcessorContext,
): { currentVector: PersonalityVector; pendingVector: PersonalityVector; variables: Variables } {
  let currentVector = { ...ctx.currentVector };
  let pendingVector = { ...ctx.pendingVector };
  const variables = { ...ctx.variables };

  // Apply pending deltas when vectors are enabled and any axis is non-zero.
  if (ctx.vectorEnabled && Object.values(pendingVector).some((v) => v !== 0)) {
    currentVector = add(currentVector, pendingVector);
    pendingVector = { ...ZERO_VECTOR };
  }
  if (ctx.vectorEnabled && data.targetVariable) {
    variables[data.targetVariable] = magnitude(currentVector);
  }
  return { currentVector, pendingVector, variables };
}

/** Apply a scene choice's side effects (vector delta + fragment). */
export function applyChoice(
  choice: SceneChoice | { vector?: PersonalityVector; dropFragmentId?: string },
  ctx: ProcessorContext,
): { pendingVector: PersonalityVector; fragments: Set<string> } {
  const pendingVector = (ctx.vectorEnabled && choice.vector)
    ? add(ctx.pendingVector, choice.vector)
    : { ...ctx.pendingVector };
  const fragments = new Set(ctx.fragments);
  if (choice.dropFragmentId) {
    fragments.add(choice.dropFragmentId);
  }
  return { pendingVector, fragments };
}

/** Apply variable mutations from a Stage node's flow configuration. */
export function applyStageMutations(
  mutations: Array<{ variable: string; operator: 'set' | 'add' | 'sub'; value: any }> | undefined,
  ctx: ProcessorContext,
): Variables {
  if (!mutations || mutations.length === 0) return ctx.variables;
  const next: Variables = { ...ctx.variables };
  for (const m of mutations) {
    if (m.operator === 'set') {
      next[m.variable] = m.value;
    } else {
      const current = Number(next[m.variable] ?? 0);
      const delta = Number(m.value);
      next[m.variable] = m.operator === 'add' ? current + delta : current - delta;
    }
  }
  return next;
}

/** Evaluate a settlement node and return the result. */
export function evaluateSettlement(
  data: SettlementNodeData,
  ctx: ProcessorContext,
): {
  anchor: ResultAnchor | null;
  distance: number;
  magnitude: number;
  finalVector: PersonalityVector;
  quadrant: string;
  mapping: SettlementResultMapping | undefined;
} {
  const finalVector = { ...ctx.currentVector };
  const mag = magnitude(finalVector);
  const q = quadrant(finalVector);

  const strategy = settlementStrategyRegistry.resolve(data.strategy);
  const output = strategy.execute({
    finalVector,
    magnitude: mag,
    quadrant: q,
    variables: { ...ctx.variables },
    fragments: new Set(ctx.fragments),
    anchors: ctx.vectorEnabled ? ctx.sects : [],
    nodeData: data,
  });

  return {
    anchor: output.anchor,
    distance: output.distance,
    magnitude: mag,
    finalVector,
    quadrant: q,
    mapping: output.mapping,
  };
}

/** Compare two numbers with a string operator. */
function compare(
  a: number,
  op: NonNullable<LogicNodeData['operator']>,
  b: number,
): boolean {
  switch (op) {
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    case '==':
      return a === b;
    case '>':
      return a > b;
    case '<':
      return a < b;
    default:
      return false;
  }
}

/** Re-export vector math for convenience. */
export { add, magnitude, distance, quadrant, ZERO_VECTOR };
