/**
 * NodeDefinition registry - the single source of truth for node metadata.
 *
 * Replaces the scattered `NODE_TYPE_*` Records in `types/flow.ts`, the
 * `nodeTypes` component map in `components/flow/nodes/index.ts`, the
 * `NODE_ICONS` map in `components/brand/NodeIcon.tsx`, the Inspector form
 * dispatch in `InspectorPanel.tsx`, and the `TERMINAL_TYPES` set in
 * `FlowCanvas.tsx`.
 *
 * Adding a new node type now only requires one `registerNode()` call in
 * `components/flow/nodes/definitions.ts` (plus the node's component files).
 */

import type { ComponentType } from 'react';
import type { NodeTypes, NodeProps } from '@xyflow/react';
import type { LucideIcon } from 'lucide-react';
import type {
  BaseNodeData,
  FlowNode,
  GameNodeData,
  NodeType,
} from '@/types/flow';
import type { TranslationKey } from '@/i18n/translations';

/** Props passed to a node's Inspector form. */
export interface InspectorFormProps<TData extends BaseNodeData = BaseNodeData> {
  node: FlowNode;
  /** Apply a partial data update to the node. */
  update: (data: Partial<TData>) => void;
}

/**
 * Complete metadata for a single node type.
 *
 * Aggregates: identity (type/label/icon), canvas rendering (CanvasComponent),
 * inspection (InspectorForm), defaults (createDefault), and connection rules
 * (isTerminal / canConnectTo). The `processor` field is reserved for the
 * generalized engine execution layer (GEN-004) and is intentionally optional.
 */
export interface NodeDefinition<TData extends BaseNodeData = BaseNodeData> {
  /** React Flow node type discriminator. */
  type: NodeType;
  /** i18n key for the human-readable label. */
  labelKey: TranslationKey;
  /** i18n key for the palette description. */
  descKey: TranslationKey;
  /** Lucide icon component. */
  icon: LucideIcon;
  /** Accent color (hex) used by canvas, shell, palette and inspector header. */
  accent: string;
  /** React Flow canvas node component. */
  CanvasComponent: ComponentType<NodeProps>;
  /** Right-panel inspector form for editing this node's data. */
  InspectorForm: ComponentType<InspectorFormProps>;
  /** Factory returning the default `data` payload for a newly created node. */
  createDefault: () => TData;
  /** Whether this node cannot have outgoing connections (terminal). */
  isTerminal?: boolean;
  /**
   * Connection predicate. When omitted, the node may connect to any
   * non-terminal target (the legacy behavior).
   */
  canConnectTo?: (targetType: NodeType) => boolean;
  /**
   * Optional pure-function processor for the generalized engine (GEN-004).
   * Not consumed by the current GameEngine switch dispatch yet.
   */
  processor?: (node: FlowNode, ctx: unknown) => unknown;
}

const registry = new Map<NodeType, NodeDefinition>();

/** Register a node definition. Idempotent for the same `type`. */
export function registerNode<TData extends BaseNodeData>(
  def: NodeDefinition<TData>,
): void {
  registry.set(def.type, def as NodeDefinition);
}

/** Look up a node definition by type. */
export function getNodeDefinition(type: NodeType): NodeDefinition | undefined {
  return registry.get(type);
}

/** All registered node definitions, in registration order. */
export function getAllNodeDefinitions(): NodeDefinition[] {
  return Array.from(registry.values());
}

/** All registered node types, in registration order. */
export function getNodeTypes(): NodeType[] {
  return getAllNodeDefinitions().map((d) => d.type);
}

/** The set of terminal node types (cannot have outgoing edges). */
export function getTerminalTypes(): ReadonlySet<NodeType> {
  return new Set(
    getAllNodeDefinitions().filter((d) => d.isTerminal).map((d) => d.type),
  );
}

/** Accent color for a node type, with a neutral fallback. */
export function getNodeAccent(type: NodeType): string {
  return getNodeDefinition(type)?.accent ?? '#64748b';
}

/** Lucide icon for a node type. */
export function getNodeIcon(type: NodeType): LucideIcon | undefined {
  return getNodeDefinition(type)?.icon;
}

/** Label i18n key for a node type. */
export function getNodeLabelKey(type: NodeType): TranslationKey | undefined {
  return getNodeDefinition(type)?.labelKey;
}

/** Description i18n key for a node type. */
export function getNodeDescKey(type: NodeType): TranslationKey | undefined {
  return getNodeDefinition(type)?.descKey;
}

/** Create the default data payload for a new node of the given type. */
export function createDefaultNodeData(type: NodeType): GameNodeData {
  const def = getNodeDefinition(type);
  if (!def) {
    throw new Error(`[nodeRegistry] Unknown node type: "${type}"`);
  }
  return def.createDefault() as GameNodeData;
}

/**
 * Build the `nodeTypes` map expected by React Flow's `nodeTypes` prop.
 * Call once and memoize; rebuilds if registrations change (rare).
 */
export function buildReactFlowNodeTypes(): NodeTypes {
  const map: NodeTypes = {};
  for (const def of getAllNodeDefinitions()) {
    map[def.type] = def.CanvasComponent;
  }
  return map;
}

/**
 * Whether a connection from `sourceType` to `targetType` is allowed.
 * Terminal sources are always rejected; otherwise the source's
 * `canConnectTo` predicate is consulted (defaults to allowing any target).
 */
export function canConnect(sourceType: NodeType, targetType: NodeType): boolean {
  const sourceDef = getNodeDefinition(sourceType);
  if (!sourceDef || sourceDef.isTerminal) return false;
  if (sourceDef.canConnectTo) return sourceDef.canConnectTo(targetType);
  return true;
}
