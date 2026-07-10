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
  /** Legacy Vue editor field, kept for migration compatibility. */
  cover?: string;
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
  /** Primary background image URL (mapped from legacy `background`). */
  backgroundUrl?: string;
  /** Legacy background image field, kept for migration compatibility. */
  background?: string;
  /** Character portrait / spirit guide image URL. */
  characterUrl?: string;
  /** Legacy character field alias. */
  character?: string;
  /** Legacy spirit guide image field. */
  spiritGuide?: string;
  /** Legacy focus object / item image field. */
  focusObject?: string;
  speaker?: string;
  choices: SceneChoice[];
  bgm?: string;
  sfx?: string;
  stageWeight?: number;
  interactionType?: InteractionType;
  interaction?: InteractionType;
  isBackgroundRemote?: boolean;
  isSpiritGuideRemote?: boolean;
  isFocusObjectRemote?: boolean;
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

/** A single action performed when a settlement button is clicked. */
export interface SettlementButtonAction {
  varName?: string;
  variableName?: string;
  action?: 'set' | 'add' | 'sub';
  operation?: 'set' | 'add' | 'sub';
  value?: string | number | boolean;
}

/** A button shown on the settlement stage. */
export interface SettlementButton {
  id: string;
  label: string;
  actions?: SettlementButtonAction[];
  outputHandleId?: string | null;
}

/** A variable modifier applied by the settlement node. */
export interface SettlementVariableModifier {
  variableName?: string;
  varName?: string;
  operation?: 'set' | 'add' | 'sub';
  action?: 'set' | 'add' | 'sub';
  value?: string | number | boolean;
  useVariable?: boolean;
  sourceVariable?: string;
}

/** Settlement node data. */
export interface SettlementNodeData extends BaseNodeData {
  resultMapping: SettlementResultMapping[];
  buttons?: SettlementButton[];
  variableModifiers?: SettlementVariableModifier[];
  modifiers?: SettlementVariableModifier[];
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
export interface SectResultTexts {
  layerA?: string;
  layerB?: string;
}

export interface SectAnchor {
  id: string;
  name: string;
  vector: PersonalityVector;
  title: string;
  description?: string;
  coverUrl?: string;
  resultTexts?: SectResultTexts;
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

/** Type guard: narrow a FlowNode's data to a specific node data shape. */
export function getNodeData<T extends GameNodeData>(node: FlowNode): T {
  return node.data as T;
}

/** React Flow position helper. */
export type { XYPosition };
