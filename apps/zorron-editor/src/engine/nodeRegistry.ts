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

/** High-level functional category grouping for nodes. */
export type NodeCategory = 'narrative' | 'interaction' | 'logic' | 'gameplay' | 'output';

export interface CategoryInfo {
  id: NodeCategory;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  color: string;
}

export const NODE_CATEGORIES: CategoryInfo[] = [
  { id: 'narrative', labelKey: 'category.narrative', descKey: 'category.narrative.desc', color: '#38bdf8' },
  { id: 'interaction', labelKey: 'category.interaction', descKey: 'category.interaction.desc', color: '#a78bfa' },
  { id: 'logic', labelKey: 'category.logic', descKey: 'category.logic.desc', color: '#f59e0b' },
  { id: 'gameplay', labelKey: 'category.gameplay', descKey: 'category.gameplay.desc', color: '#10b981' },
  { id: 'output', labelKey: 'category.output', descKey: 'category.output.desc', color: '#f472b6' },
];

/**
 * Complete metadata for a single node type.
 *
 * Aggregates: identity (type/label/icon), category grouping, canvas rendering,
 * inspection, defaults, and connection rules.
 */
export interface NodeDefinition<TData extends BaseNodeData = BaseNodeData> {
  /** React Flow node type discriminator. */
  type: NodeType;
  /** High-level functional category grouping. */
  category?: NodeCategory;
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

import { CustomNode } from '@/components/flow/nodes/CustomNode';
import { CustomNodeForm } from '@/components/inspector/CustomNodeForm';
import { Sparkles } from 'lucide-react';

const registry = new Map<NodeType | string, NodeDefinition>();

/** Register a node definition. Idempotent for the same `type`. */
export function registerNode<TData extends BaseNodeData>(
  def: NodeDefinition<TData>,
): void {
  registry.set(def.type, def as NodeDefinition);
}

/** Dynamically register a custom AI-created node type at runtime. */
export function registerCustomNodeType(
  customType: string,
  label: string,
  accent = '#ec4899',
  defaultData: Record<string, unknown> = {},
): void {
  if (registry.has(customType as NodeType)) return;

  const customDef: NodeDefinition = {
    type: customType as NodeType,
    labelKey: 'node.scene.label' as TranslationKey,
    descKey: 'node.scene.desc' as TranslationKey,
    icon: Sparkles,
    accent,
    CanvasComponent: CustomNode,
    InspectorForm: CustomNodeForm,
    createDefault: () => ({
      label,
      customName: label,
      description: `AI 动态创建的节点类型: ${customType}`,
      ...defaultData,
    }),
  };

  registry.set(customType as NodeType, customDef);
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

/** Look up all node definitions belonging to a specific category. */
export function getNodesByCategory(category: NodeCategory): NodeDefinition[] {
  return getAllNodeDefinitions().filter((d) => (d.category ?? 'narrative') === category);
}

/** Look up a node's category, defaulting to 'narrative'. */
export function getNodeCategory(type: NodeType): NodeCategory {
  return getNodeDefinition(type)?.category ?? 'narrative';
}

