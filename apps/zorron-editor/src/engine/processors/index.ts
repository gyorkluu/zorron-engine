/**
 * Node processor barrel.
 *
 * `DEFAULT_PROCESSORS` is the built-in catalogue. Node types registered via
 * `registerNode()` can override or extend it, so adding a node type becomes a
 * single `registerNode({ ...processor })` call with no engine edits.
 */

import type { NodeProcessor } from './types';
import {
  logicProcessor,
  setterProcessor,
  calculatorProcessor,
} from './passthrough';
import {
  startProcessor,
  sceneProcessor,
  stageProcessor,
  videoProcessor,
  linkProcessor,
  mediaProcessor,
} from './narrative';
import {
  minigameProcessor,
  ratingProcessor,
  multiSelectProcessor,
  textInputProcessor,
  rankOrderProcessor,
  numberPickerProcessor,
} from './input';
import { settlementProcessor } from './settlement';

export * from './types';
export * from './passthrough';
export * from './narrative';
export * from './input';
export * from './settlement';

/** Built-in processors keyed by React Flow node type. */
export const DEFAULT_PROCESSORS: Record<string, NodeProcessor> = {
  // Narrative & presentation
  start: startProcessor,
  scene: sceneProcessor,
  stage: stageProcessor,
  video: videoProcessor,
  link: linkProcessor,
  media: mediaProcessor,
  // Interaction & input
  minigame: minigameProcessor,
  rating: ratingProcessor,
  'multi-select': multiSelectProcessor,
  'text-input': textInputProcessor,
  'rank-order': rankOrderProcessor,
  'number-picker': numberPickerProcessor,
  // Logic & flow control
  logic: logicProcessor,
  setter: setterProcessor,
  calculator: calculatorProcessor,
  // Output
  settlement: settlementProcessor,
};

/** Look up a built-in processor by node type. */
export function getDefaultProcessor(type: string): NodeProcessor | undefined {
  return DEFAULT_PROCESSORS[type];
}
