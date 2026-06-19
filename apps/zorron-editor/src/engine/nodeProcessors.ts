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
  SectAnchor,
  SettlementResultMapping,
} from '@/types/flow';
import { add, magnitude, distance, quadrant, findNearestSect, ZERO_VECTOR } from './vectorMath';

/** Context passed to every processor. */
export interface ProcessorContext {
  variables: Variables;
  fragments: Set<string>;
  currentVector: PersonalityVector;
  pendingVector: PersonalityVector;
  sects: SectAnchor[];
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

  if (
    pendingVector.x !== 0 ||
    pendingVector.y !== 0 ||
    pendingVector.z !== 0
  ) {
    currentVector = add(currentVector, pendingVector);
    pendingVector = { ...ZERO_VECTOR };
  }
  if (data.targetVariable) {
    variables[data.targetVariable] = magnitude(currentVector);
  }
  return { currentVector, pendingVector, variables };
}

/** Apply a scene choice's side effects (vector delta + fragment). */
export function applyChoice(
  choice: SceneChoice,
  ctx: ProcessorContext,
): { pendingVector: PersonalityVector; fragments: Set<string> } {
  const pendingVector = choice.vector
    ? add(ctx.pendingVector, choice.vector)
    : { ...ctx.pendingVector };
  const fragments = new Set(ctx.fragments);
  if (choice.dropFragmentId) {
    fragments.add(choice.dropFragmentId);
  }
  return { pendingVector, fragments };
}

/** Evaluate a settlement node and return the result. */
export function evaluateSettlement(
  data: SettlementNodeData,
  ctx: ProcessorContext,
): {
  sect: SectAnchor | null;
  distance: number;
  magnitude: number;
  finalVector: PersonalityVector;
  quadrant: string;
  mapping: SettlementResultMapping | undefined;
} {
  const finalVector = { ...ctx.currentVector };
  const mag = magnitude(finalVector);
  const q = quadrant(finalVector);
  const { sect, distance: nearest } = findNearestSect(finalVector, ctx.sects);
  const mapping = data.resultMapping?.[0];
  return {
    sect,
    distance: nearest,
    magnitude: mag,
    finalVector,
    quadrant: q,
    mapping,
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
export { add, magnitude, distance, quadrant, findNearestSect, ZERO_VECTOR };
