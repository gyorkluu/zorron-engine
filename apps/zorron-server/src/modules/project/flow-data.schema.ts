import { z } from 'zod';

export const PositionSchema = z.object({ x: z.number(), y: z.number() });

/**
 * Generalized N-dimensional vector.
 *
 * Each key is an axis id, each value is the component along that axis. The
 * legacy 3D shape `{ x, y, z }` is a valid vector, so existing project data
 * needs no migration. Mirrors the frontend `Vector` type.
 */
export const VectorSchema = z.record(z.string(), z.number());

export const NodeTypeSchema = z.enum([
  'start',
  'scene',
  'logic',
  'setter',
  'calculator',
  'settlement',
  'video',
  'link',
  'minigame',
  'rating',
  'multi-select',
  'media',
]);

export const BaseNodeDataSchema = z.object({ label: z.string().optional() });

export const StartNodeDataSchema = BaseNodeDataSchema.extend({
  coverUrl: z.string().optional(),
  cover: z.string().optional(),
  background: z.string().optional(),
  title: z.string().optional(),
  intro: z.string().optional(),
});

/**
 * Scene choice schema - mirrors the frontend SceneChoice interface.
 * Includes personality vector delta and fragment drop support.
 */
export const SceneChoiceSchema = z.object({
  id: z.string(),
  text: z.string(),
  targetNodeId: z.string().optional(),
  interaction: z.enum(['tap', 'hold', 'slash']).default('tap'),
  interactionType: z.enum(['tap', 'hold', 'slash']).optional(),
  holdDuration: z.number().optional(),
  slashDirection: z.enum(['left', 'right', 'up', 'down']).optional(),
  vector: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    })
    .optional(),
  dropFragmentId: z.string().nullable().optional(),
});

export const SceneNodeDataSchema = BaseNodeDataSchema.extend({
  dialogue: z.string().optional(),
  backgroundUrl: z.string().optional(),
  background: z.string().optional(),
  characterUrl: z.string().optional(),
  character: z.string().optional(),
  spiritGuide: z.string().optional(),
  focusObject: z.string().optional(),
  speaker: z.string().optional(),
  choices: z.array(SceneChoiceSchema).default([]),
  bgm: z.string().optional(),
  sfx: z.string().optional(),
  stageWeight: z.number().optional(),
  interactionType: z.enum(['tap', 'hold', 'slash']).optional(),
  interaction: z.enum(['tap', 'hold', 'slash']).optional(),
  isBackgroundRemote: z.boolean().optional(),
  isSpiritGuideRemote: z.boolean().optional(),
  isFocusObjectRemote: z.boolean().optional(),
});

export const LogicNodeDataSchema = BaseNodeDataSchema.extend({
  condition: z.string().optional(),
  checkType: z.enum(['count', 'has-specific', 'variable']).optional(),
  countThreshold: z.number().optional(),
  operator: z.enum(['>=', '<=', '==', '>', '<']).optional(),
  targetFragmentId: z.string().optional(),
  varName: z.string().optional(),
  value: z.number().optional(),
});

export const SetterAssignmentSchema = z.object({
  variable: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  operator: z.enum(['set', 'add', 'sub']).default('set'),
});

export const SetterNodeDataSchema = BaseNodeDataSchema.extend({
  assignments: z.array(SetterAssignmentSchema).default([]),
});

export const CalculatorNodeDataSchema = BaseNodeDataSchema.extend({
  /** Pending vector deltas. Optional — non-vector scenarios don't use this. */
  vector: VectorSchema.optional(),
  targetVariable: z.string().optional(),
  description: z.string().optional(),
});

export const SettlementResultMappingSchema = z.object({
  resultId: z.string(),
  condition: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  coverUrl: z.string().url().optional(),
});

export const SettlementButtonActionSchema = z.object({
  varName: z.string().optional(),
  variableName: z.string().optional(),
  action: z.enum(['set', 'add', 'sub']).optional(),
  operation: z.enum(['set', 'add', 'sub']).optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const SettlementButtonSchema = z.object({
  id: z.string(),
  label: z.string(),
  actions: z.array(SettlementButtonActionSchema).default([]),
  outputHandleId: z.string().nullable().optional(),
});

export const SettlementVariableModifierSchema = z.object({
  variableName: z.string().optional(),
  varName: z.string().optional(),
  operation: z.enum(['set', 'add', 'sub']).optional(),
  action: z.enum(['set', 'add', 'sub']).optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  useVariable: z.boolean().optional(),
  sourceVariable: z.string().optional(),
});

export const SettlementNodeDataSchema = BaseNodeDataSchema.extend({
  resultMapping: z.array(SettlementResultMappingSchema).default([]),
  /**
   * Settlement strategy id. No global default — the FlowBuilder resolves a
   * strategy based on the scenario type. This prevents non-vector scenarios
   * from accidentally using 'vector-nearest'.
   */
  strategy: z.string().optional(),
  strategyConfig: z.record(z.string(), z.unknown()).optional(),
  buttons: z.array(SettlementButtonSchema).default([]),
  modifiers: z.array(SettlementVariableModifierSchema).default([]),
  archetypes: z.array(z.record(z.unknown())).default([]),
  variableModifiers: z.array(SettlementVariableModifierSchema).default([]),
  /**
   * Composed visual blocks for the settlement page (ECO-002).
   * Each entry is `{ type, props }`. Populated by FlowBuilder from the
   * ScenarioIntent's settlement.visualBlocks declaration.
   */
  visualBlocks: z
    .array(
      z.object({
        type: z.string(),
        props: z.record(z.string(), z.unknown()).default({}),
      }),
    )
    .default([]),
});

export const VideoNodeDataSchema = BaseNodeDataSchema.extend({
  videoUrl: z.string().url().or(z.string().max(0)).optional(),
  videoSrc: z.string().optional(),
  autoPlay: z.boolean().default(true),
  skipAllowed: z.boolean().default(true),
  skipable: z.boolean().optional(),
  poster: z.string().optional(),
  loop: z.boolean().optional(),
  muted: z.boolean().optional(),
  isRemote: z.boolean().optional(),
  skipAfter: z.number().optional(),
  externalLink: z.string().optional(),
  externalLinkLabel: z.string().optional(),
});

export const LinkNodeDataSchema = BaseNodeDataSchema.extend({
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
  confirmText: z.string().optional(),
  showConfirm: z.boolean().optional(),
  openInNewTab: z.boolean().optional(),
});

// ── ECO-003: New node types ────────────────────────────────

/** Minigame node: embeds an H5 minigame (e.g. reaction test, puzzle). */
export const MinigameNodeDataSchema = BaseNodeDataSchema.extend({
  gameUrl: z.string(),
  gameType: z.string().optional(),
  /** Variable name to store the resulting score. */
  scoreVariable: z.string().optional(),
  /** Optional time limit in seconds. */
  duration: z.number().positive().optional(),
  /** Whether the minigame can be skipped. */
  skipAllowed: z.boolean().default(false),
});

/** Rating node: a slider/rating input that writes to a variable. */
export const RatingNodeDataSchema = BaseNodeDataSchema.extend({
  /** Question prompt displayed to the user (required by contract, but legacy
   * frontend may use `prompt` instead — accept both). */
  question: z.string().optional(),
  /** Legacy alias for `question` (kept for frontend compatibility). */
  prompt: z.string().optional(),
  min: z.number().default(0),
  max: z.number().default(10),
  step: z.number().positive().default(1),
  /** Variable name to store the rating value. */
  variable: z.string().optional(),
  /** Optional labels for the slider endpoints. */
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
});

/** Multi-select node: pick multiple tags/options from a list. */
export const MultiSelectNodeDataSchema = BaseNodeDataSchema.extend({
  /** Question prompt (required by contract, but legacy frontend may omit it). */
  question: z.string().optional(),
  options: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
      }),
    )
    .default([]),
  /** Minimum selections required. Backend canonical field. */
  minSelected: z.number().int().min(0).default(0),
  /** Maximum selections allowed. Backend canonical field. */
  maxSelected: z.number().int().min(1).optional(),
  /** Legacy alias for minSelected (frontend naming). */
  minSelect: z.number().int().min(0).optional(),
  /** Legacy alias for maxSelected (frontend naming). */
  maxSelect: z.number().int().min(1).optional(),
  /** Variable name to store the selected option ids. */
  variable: z.string().optional(),
  /** Whether selected options map to tags (for survey settlement). */
  tagMode: z.boolean().default(false),
});

/** Media node: displays an image or plays audio. */
export const MediaNodeDataSchema = BaseNodeDataSchema.extend({
  mediaType: z.enum(['image', 'audio']),
  url: z.string(),
  altText: z.string().optional(),
  caption: z.string().optional(),
  autoPlay: z.boolean().default(false),
  loop: z.boolean().default(false),
  /** Optional duration in seconds (for audio). */
  duration: z.number().positive().optional(),
});

/**
 * Discriminated union of node schemas keyed on the `type` field.
 *
 * CRITICAL: This must be a discriminated union (not a plain union) so Zod
 * selects the correct `data` schema for each node type. A plain union would
 * try schemas in order and, because all data schemas have only optional fields,
 * the first schema (StartNodeDataSchema) would match every node, stripping
 * type-specific fields like `dialogue` and `choices` from scene nodes.
 */
export const GameNodeSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string(),
    type: z.literal('start'),
    position: PositionSchema,
    data: StartNodeDataSchema,
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('scene'),
    position: PositionSchema,
    data: SceneNodeDataSchema,
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('logic'),
    position: PositionSchema,
    data: LogicNodeDataSchema,
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('setter'),
    position: PositionSchema,
    data: SetterNodeDataSchema,
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('calculator'),
    position: PositionSchema,
    data: CalculatorNodeDataSchema,
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('settlement'),
    position: PositionSchema,
    data: SettlementNodeDataSchema,
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('video'),
    position: PositionSchema,
    data: VideoNodeDataSchema,
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('link'),
    position: PositionSchema,
    data: LinkNodeDataSchema,
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('minigame'),
    position: PositionSchema,
    data: MinigameNodeDataSchema,
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('rating'),
    position: PositionSchema,
    data: RatingNodeDataSchema,
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('multi-select'),
    position: PositionSchema,
    data: MultiSelectNodeDataSchema,
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('media'),
    position: PositionSchema,
    data: MediaNodeDataSchema,
    width: z.number().optional(),
    height: z.number().optional(),
  }),
]);

export const GameEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  type: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

export const VariableSchema = z.record(
  z.union([z.string(), z.number(), z.boolean()]),
);

export const SectResultTextsSchema = z.object({
  layerA: z.string().optional(),
  layerB: z.string().optional(),
});

export const ResultAnchorSchema = z.object({
  id: z.string(),
  name: z.string(),
  vector: VectorSchema,
  title: z.string().optional(),
  description: z.string().optional(),
  coverUrl: z.string().url().optional(),
  resultTexts: SectResultTextsSchema.optional(),
});
/** @deprecated Use ResultAnchorSchema instead. */
export const SectAnchorSchema = ResultAnchorSchema;

export const VectorSpaceConfigSchema = z.object({
  enabled: z.boolean().default(false),
  // dimensions maps axis id -> human-readable label. Number of keys defines
  // vector space dimensionality (2, 3, 4, ...). Empty by default — scenarios
  // that need vectors must explicitly declare their dimensions.
  dimensions: z.record(z.string(), z.string()).default({}),
  sects: z.array(ResultAnchorSchema).optional(),
}).default({
  enabled: false,
  dimensions: {},
});

export const ProjectSettingsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
  bgmUrl: z.string().optional(),
  vectorSpace: VectorSpaceConfigSchema.optional(),
});

export const FlowDataSchema = z.object({
  nodes: z.array(GameNodeSchema).default([]),
  edges: z.array(GameEdgeSchema).default([]),
  variables: VariableSchema.default({}),
  settings: ProjectSettingsSchema.default({}),
  version: z.string().default('1.0.0'),
});

export type FlowData = z.infer<typeof FlowDataSchema>;
export type GameNode = z.infer<typeof GameNodeSchema>;
export type GameEdge = z.infer<typeof GameEdgeSchema>;
