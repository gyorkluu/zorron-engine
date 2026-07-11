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
  | 'link'
  | 'minigame'
  | 'rating'
  | 'multi-select'
  | 'media';

/** Interaction modes for scene choices. */
export type InteractionType = 'tap' | 'hold' | 'slash';

/** Slash directions for slash-type choices. */
export type SlashDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Axis identifier — the key of a vector component.
 *
 * Axis ids are project-defined: a project may use 2 axes (`a`, `b`),
 * the legacy 3 axes (`x`, `y`, `z`), or any N-dimensional space. Axis ids
 * are paired with human-readable labels via `VectorSpaceConfig.dimensions`.
 */
export type AxisId = string;

/**
 * Generalized N-dimensional vector.
 *
 * Each key is an `AxisId`, each value is the component along that axis.
 * The legacy 3D personality vector `{ x, y, z }` is a valid `Vector`
 * (axis ids `x`, `y`, `z`), so existing project data needs no migration.
 */
export type Vector = Record<AxisId, number>;

/**
 * Personality vector — legacy alias for {@link Vector}.
 *
 * Kept as a type alias so existing imports continue to work while the
 * codebase migrates from the hardcoded 3D `{ x, y, z }` shape to the
 * generalized N-dimensional `Record<AxisId, number>` shape.
 */
export type PersonalityVector = Vector;

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
  /** Pending vector deltas. Optional — non-vector scenarios don't use this. */
  vector?: PersonalityVector;
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
  /** Settlement strategy id. Defaults to 'vector-nearest'. */
  strategy?: string;
  /** Strategy-specific configuration (shape depends on the strategy). */
  strategyConfig?: Record<string, unknown>;
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

/** Minigame node data — interactive game embedded in the flow. */
export interface MinigameNodeData extends BaseNodeData {
  /** URL to the minigame HTML/iframe, or inline game config. */
  gameUrl: string;
  /** Variable to store the resulting score. */
  scoreVariable?: string;
  /** Minimum score required to advance (0 = any score). */
  passingScore?: number;
}

/** Rating node data — user rates on a scale. */
export interface RatingNodeData extends BaseNodeData {
  /** Variable to store the rating value. */
  variable?: string;
  min: number;
  max: number;
  step?: number;
  /** Question prompt displayed to the user (canonical field). */
  question?: string;
  /** Legacy alias for `question`. */
  prompt?: string;
  /** Optional labels for the slider endpoints. */
  minLabel?: string;
  maxLabel?: string;
}

/** Multi-select node data — user selects multiple options. */
export interface MultiSelectNodeData extends BaseNodeData {
  /** Variable to store selected option ids (comma-separated). */
  variable?: string;
  /** Question prompt displayed to the user. */
  question?: string;
  /** Available options. */
  options: Array<{ id: string; label: string; description?: string }>;
  /** Minimum selections required (canonical backend field). */
  minSelected?: number;
  /** Maximum selections allowed (canonical backend field). */
  maxSelected?: number;
  /** Legacy alias for minSelected. */
  minSelect?: number;
  /** Legacy alias for maxSelected. */
  maxSelect?: number;
  /** Whether selected options map to tags (for survey settlement). */
  tagMode?: boolean;
}

/** Media node data — display image/audio/video then advance. */
export interface MediaNodeData extends BaseNodeData {
  mediaType: 'image' | 'audio' | 'video';
  url: string;
  /** Auto-advance after media ends (for audio/video). */
  autoAdvance?: boolean;
  /** Duration in ms before auto-advancing (for images). 0 = manual continue. */
  durationMs?: number;
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
  | LinkNodeData
  | MinigameNodeData
  | RatingNodeData
  | MultiSelectNodeData
  | MediaNodeData;

/** Variable value type stored in the flow. */
export type VariableValue = string | number | boolean;

/** Variables map. */
export type Variables = Record<string, VariableValue>;

/** A result anchor used by the settlement matcher (e.g. a personality archetype). */
export interface SectResultTexts {
  layerA?: string;
  layerB?: string;
}

export interface ResultAnchor {
  id: string;
  name: string;
  vector: PersonalityVector;
  title: string;
  description?: string;
  coverUrl?: string;
  resultTexts?: SectResultTexts;
}

/** @deprecated Use ResultAnchor instead. Kept for backward compatibility. */
export type SectAnchor = ResultAnchor;

/**
 * Vector space configuration stored in project settings.
 *
 * `dimensions` maps each `AxisId` to a human-readable label. The number of
 * keys defines the vector space dimensionality (2 for `{a, b}`, 3 for the
 * legacy `{x, y, z}`, etc.). Axis ids are stable identifiers; labels are
 * display-only.
 */
export interface VectorSpaceConfig {
  enabled: boolean;
  dimensions: Record<AxisId, string>;
  sects?: ResultAnchor[];
}

/** Project-level settings stored inside FlowData. */
export interface ProjectSettings {
  title?: string;
  description?: string;
  coverUrl?: string;
  bgmUrl?: string;
  /** Optional — non-vector scenarios don't need vector space config. */
  vectorSpace?: VectorSpaceConfig;
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
    settings: {},
    version: '1.0.0',
  };
}

/** Type guard: narrow a FlowNode's data to a specific node data shape. */
export function getNodeData<T extends GameNodeData>(node: FlowNode): T {
  return node.data as T;
}

/** React Flow position helper. */
export type { XYPosition };
