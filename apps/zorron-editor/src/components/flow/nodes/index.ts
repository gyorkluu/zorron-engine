/**
 * Node type registry - maps node types to their React components.
 *
 * Built from the NodeDefinition registry. Importing `./definitions` registers
 * all built-in node types as a side effect before the map is built.
 */
import type { NodeTypes } from '@xyflow/react';
import './definitions';
import { buildReactFlowNodeTypes } from '@/engine/nodeRegistry';

/** React Flow node type → component mapping, derived from the registry. */
export const nodeTypes: NodeTypes = buildReactFlowNodeTypes();
