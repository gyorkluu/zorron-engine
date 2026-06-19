/**
 * Zorron Engine - Flow type definitions.
 *
 * Mirrors the backend `FlowDataSchema` (apps/zorron-server/src/modules/project/flow-data.schema.ts)
 * so the editor and server share an identical data contract.
 */

import type { Node, Edge, XYPosition } from '@xyflow/react';

/** Supported narrative node types in Zorron Engine. */
export type NodeType =
  | 'start'
  | 'scene'
  | 'logic'
  | 'setter'
  | 'calculator'
  | 'settlement'
  | 'video'
  | 'link';

/** All node types as an array for UI iteration. */
export const NODE_TYPES: NodeType[] = [
  'start',
  'scene',
  'logic',
  'setter',
  'calculator',
  'settlement',
  'video',
  'link',
];

/** Human-readable labels for each node type, used in the palette and inspector. */
export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  start: '开始',
  scene: '场景',
  logic: '逻辑',
  setter: '赋值器',
  calculator: '计算器',
  settlement: '结算',
  video: '视频',
  link: '外部链接',
};

/** Short descriptions for the node palette. */
export const NODE_TYPE_DESCRIPTIONS: Record<NodeType, string> = {
  start: '叙事流程的入口',
  scene: '带选项和媒体的对话场景',
  logic: '基于变量或碎片分支流程',
  setter: '修改变量',
  calculator: '应用待处理的人格向量增量',
  settlement: '最终结果与原型匹配',
  video: '全屏视频播放节点',
  link: '打开外部链接',
};

/** Accent color per node type for canvas visuals. */
export const NODE_TYPE_ACCENTS: Record<NodeType, string> = {
  start: '#22d3ee',
  scene: '#a78bfa',
  logic: '#f59e0b',
  setter: '#34d399',
  calculator: '#60a5fa',
  settlement: '#f472b6',
  video: '#fb7185',
  link: '#94a3b8',
};

/** Interaction modes for scene choices. */
export type InteractionType = 'tap' | 'hold' | 'slash';

/** Slash directions for slash-type choices. */
export type SlashDirection = 'left' | 'right' | 'up' | 'down';

/** 3D personality vector. */
export interface PersonalityVector {
  x: number;
  y: number;
  z: number;
}

/** Base data shared by all node types. */
export interface BaseNodeData {
  label?: string;
}

/** Start node data. */
export interface StartNodeData extends BaseNodeData {
  coverUrl?: string;
  title?: string;
  intro?: string;
}

/** A single choice inside a scene node. */
export interface SceneChoice {
  id: string;
  text: string;
  targetNodeId?: string;
  interaction: InteractionType;
  holdDuration?: number;
  slashDirection?: SlashDirection;
  /** Personality vector delta applied when this choice is selected. */
  vector?: PersonalityVector;
  /** Fragment id dropped into the player's fragment collection. */
  dropFragmentId?: string;
}

/** Scene node data. */
export interface SceneNodeData extends BaseNodeData {
  dialogue?: string;
  backgroundUrl?: string;
  characterUrl?: string;
  speaker?: string;
  choices: SceneChoice[];
  bgm?: string;
  sfx?: string;
}

/** Logic node data. */
export interface LogicNodeData extends BaseNodeData {
  condition?: string;
  checkType?: 'count' | 'has-specific' | 'variable';
  countThreshold?: number;
  operator?: '>=' | '<=' | '==' | '>' | '<';
  targetFragmentId?: string;
  varName?: string;
  value?: number;
}

/** A single assignment inside a setter node. */
export interface SetterAssignment {
  variable: string;
  value: string | number | boolean;
  operator: 'set' | 'add' | 'sub';
}

/** Setter node data. */
export interface SetterNodeData extends BaseNodeData {
  assignments: SetterAssignment[];
}

/** Calculator node data. */
export interface CalculatorNodeData extends BaseNodeData {
  vector: PersonalityVector;
  targetVariable?: string;
  description?: string;
}

/** A single result mapping inside a settlement node. */
export interface SettlementResultMapping {
  resultId: string;
  condition?: string;
  title: string;
  description?: string;
  coverUrl?: string;
}

/** Settlement node data. */
export interface SettlementNodeData extends BaseNodeData {
  resultMapping: SettlementResultMapping[];
}

/** Video node data. */
export interface VideoNodeData extends BaseNodeData {
  videoUrl: string;
  autoPlay: boolean;
  skipAllowed: boolean;
}

/** External link node data. */
export interface LinkNodeData extends BaseNodeData {
  url: string;
  title?: string;
  description?: string;
}

/** Discriminated union of all node data payloads. */
export type GameNodeData =
  | StartNodeData
  | SceneNodeData
  | LogicNodeData
  | SetterNodeData
  | CalculatorNodeData
  | SettlementNodeData
  | VideoNodeData
  | LinkNodeData;

/** Variable value type stored in the flow. */
export type VariableValue = string | number | boolean;

/** Variables map. */
export type Variables = Record<string, VariableValue>;

/** A sect anchor used by the settlement matcher. */
export interface SectAnchor {
  id: string;
  name: string;
  vector: PersonalityVector;
  title: string;
  description?: string;
  coverUrl?: string;
}

/** Vector space configuration stored in project settings. */
export interface VectorSpaceConfig {
  enabled: boolean;
  dimensions: { x: string; y: string; z: string };
  sects?: SectAnchor[];
}

/** Project-level settings stored inside FlowData. */
export interface ProjectSettings {
  title?: string;
  description?: string;
  coverUrl?: string;
  bgmUrl?: string;
  vectorSpace: VectorSpaceConfig;
}

/** A node in the flow graph (React Flow compatible). */
export type FlowNode = Node<GameNodeData>;

/** An edge in the flow graph (React Flow compatible). */
export type FlowEdge = Edge;

/** The complete flow data persisted to the backend. */
export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: Variables;
  settings: ProjectSettings;
  version: string;
}

/** Default empty flow data. */
export function createEmptyFlowData(): FlowData {
  return {
    nodes: [],
    edges: [],
    variables: {},
    settings: {
      vectorSpace: {
        enabled: false,
        dimensions: { x: '处世', y: '立场', z: '性情' },
      },
    },
    version: '1.0.0',
  };
}

/** Default data factory per node type. Returns the initial `data` payload for a new node. */
export function createDefaultNodeData(type: NodeType): GameNodeData {
  switch (type) {
    case 'start':
      return { label: '开始', title: '新故事', intro: '' };
    case 'scene':
      return { label: '场景', dialogue: '', choices: [] };
    case 'logic':
      return { label: '逻辑', condition: '', checkType: 'variable' };
    case 'setter':
      return { label: '赋值器', assignments: [] };
    case 'calculator':
      return { label: '计算器', vector: { x: 0, y: 0, z: 0 } };
    case 'settlement':
      return { label: '结算', resultMapping: [] };
    case 'video':
      return { label: '视频', videoUrl: '', autoPlay: true, skipAllowed: true };
    case 'link':
      return { label: '链接', url: '', title: '' };
  }
}

/** Type guard: narrow a FlowNode's data to a specific node data shape. */
export function getNodeData<T extends GameNodeData>(node: FlowNode): T {
  return node.data as T;
}

/** React Flow position helper. */
export type { XYPosition };
