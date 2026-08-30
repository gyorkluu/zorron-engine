/**
 * Passthrough node processors.
 *
 * Passthrough nodes never render a frame. They mutate engine state and hand
 * back the next node id, so the engine recurses straight into it. Extracted
 * from `GameEngine.processLogic / processSetter / processCalculator`.
 */

import type {
  LogicNodeData,
  SetterNodeData,
  CalculatorNodeData,
  Variables,
} from '@/types/flow';
import {
  evaluateLogic,
  applySetter,
  applyCalculator,
} from '@/engine/nodeProcessors';
import type {
  NodeProcessor,
  NodeProcessorContext,
} from './types';

/** Build the `ProcessorContext` expected by the extracted pure helpers. */
function toHelperContext(ctx: NodeProcessorContext) {
  return {
    variables: ctx.variables,
    fragments: ctx.fragments,
    currentVector: ctx.currentVector,
    pendingVector: ctx.pendingVector,
    sects: ctx.anchors,
    vectorEnabled: ctx.vectorEnabled,
  };
}

/**
 * Logic node: evaluate the condition and branch on the `true` / `false` handle.
 * Falls back to the default handle when the specific branch is unconnected.
 */
export const logicProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as LogicNodeData;
  const passed = evaluateLogic(data, toHelperContext(ctx));
  const handleId = passed ? 'true' : 'false';
  const nextId =
    ctx.findTargetNodeId(ctx.node.id, handleId) ??
    ctx.findTargetNodeId(ctx.node.id, null);

  if (!nextId) return { finish: true };
  return { nextNodeId: nextId };
};

/** Setter node: apply variable assignments, then continue. */
export const setterProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as SetterNodeData;
  const variables = applySetter(data, toHelperContext(ctx));
  const nextId = ctx.findTargetNodeId(ctx.node.id, null);

  if (!nextId) return { variables, finish: true };
  return { variables, nextNodeId: nextId };
};

/**
 * Calculator node: fold `pendingVector` into `currentVector` and optionally
 * write the resulting magnitude into a variable.
 */
export const calculatorProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as CalculatorNodeData;
  const { variables } = applyCalculator(data, toHelperContext(ctx));
  const nextId = ctx.findTargetNodeId(ctx.node.id, null);

  // `flushVector` folds pendingVector into currentVector and clears it, which
  // is exactly what applyCalculator did for the vector half of its work.
  if (!nextId) return { variables, flushVector: true, finish: true };
  return { variables, flushVector: true, nextNodeId: nextId };
};

/** Convenience: variables merged by the engine are always a fresh object. */
export function emptyVariables(): Variables {
  return {};
}
