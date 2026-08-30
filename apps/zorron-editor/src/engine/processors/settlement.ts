/**
 * Settlement node processor.
 *
 * Resolves the player's accumulated state into a final result via the
 * settlement strategy registry. Vector-specific work (magnitude, quadrant,
 * anchor matching) is skipped entirely when the project disables the vector
 * space, keeping pure quiz / survey scenarios clean.
 */

import type { SettlementNodeData } from '@/types/flow';
import type { GameState, SettlementResult } from '@/engine/GameEngine';
import { settlementStrategyRegistry } from '@/engine/settlementStrategies';
import { magnitude, quadrant } from '@/engine/vectorMath';
import type { NodeProcessor } from './types';

/** Visual block declarations attached to a settlement node's data. */
interface VisualBlockDeclaration {
  type: string;
  props?: Record<string, unknown>;
}

export const settlementProcessor: NodeProcessor = (ctx) => {
  const data = ctx.node.data as SettlementNodeData;

  const finalVector = ctx.vectorEnabled ? { ...ctx.currentVector } : {};
  const mag = ctx.vectorEnabled ? magnitude(finalVector) : 0;
  const playerQuadrant = ctx.vectorEnabled ? quadrant(finalVector) : '';
  const anchors = ctx.vectorEnabled ? ctx.anchors : [];

  const strategy = settlementStrategyRegistry.resolve(data.strategy);
  const output = strategy.execute({
    finalVector,
    magnitude: mag,
    quadrant: playerQuadrant,
    variables: { ...ctx.variables },
    fragments: new Set(ctx.fragments),
    anchors,
    nodeData: data,
  });

  const result: SettlementResult = {
    anchor: output.anchor,
    distance: output.distance,
    finalVector,
    ...(ctx.vectorEnabled && { magnitude: mag, quadrant: playerQuadrant }),
    title:
      output.mapping?.title ??
      output.anchor?.name ??
      data.title ??
      data.label ??
      'Settlement',
    description:
      output.mapping?.description ??
      output.anchor?.description ??
      data.description,
    coverUrl: output.mapping?.coverUrl ?? output.anchor?.coverUrl,
    resultTexts: output.anchor?.resultTexts,
    buttons: data.buttons,
    mapping: output.mapping,
    visualBlocks: (data as unknown as { visualBlocks?: VisualBlockDeclaration[] })
      .visualBlocks,
    variables: { ...ctx.variables },
  };

  const state: Partial<GameState> = {
    currentNodeId: ctx.node.id,
    currentNodeType: 'settlement',
    settlementResult: result,
    choices: [],
    isFinished: true,
  };
  return { state };
};
