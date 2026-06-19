/**
 * Node type registry - maps node types to their React components.
 *
 * Used by React Flow's `nodeTypes` prop. Centralized so the FlowCanvas and
 * tests can share the same mapping.
 */

import type { NodeTypes } from '@xyflow/react';
import { StartNode } from './StartNode';
import { SceneNode } from './SceneNode';
import { LogicNode } from './LogicNode';
import { SetterNode } from './SetterNode';
import { CalculatorNode } from './CalculatorNode';
import { SettlementNode } from './SettlementNode';
import { VideoNode } from './VideoNode';
import { LinkNode } from './LinkNode';

/** React Flow node type -> component mapping for all 8 node types. */
export const nodeTypes: NodeTypes = {
  start: StartNode,
  scene: SceneNode,
  logic: LogicNode,
  setter: SetterNode,
  calculator: CalculatorNode,
  settlement: SettlementNode,
  video: VideoNode,
  link: LinkNode,
};
