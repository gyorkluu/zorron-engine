import { z } from 'zod';

export const PositionSchema = z.object({ x: z.number(), y: z.number() });

export const NodeTypeSchema = z.enum([
  'start',
  'scene',
  'logic',
  'setter',
  'calculator',
  'settlement',
  'video',
  'link',
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
  vector: z
    .object({
      x: z.number().default(0),
      y: z.number().default(0),
      z: z.number().default(0),
    })
    .default({ x: 0, y: 0, z: 0 }),
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
  buttons: z.array(SettlementButtonSchema).default([]),
  modifiers: z.array(SettlementVariableModifierSchema).default([]),
  archetypes: z.array(z.record(z.unknown())).default([]),
  variableModifiers: z.array(SettlementVariableModifierSchema).default([]),
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

export const SectAnchorSchema = z.object({
  id: z.string(),
  name: z.string(),
  vector: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  title: z.string().optional(),
  description: z.string().optional(),
  coverUrl: z.string().url().optional(),
  resultTexts: SectResultTextsSchema.optional(),
});

export const VectorSpaceConfigSchema = z.object({
  enabled: z.boolean().default(false),
  dimensions: z.object({
    x: z.string().default('处世'),
    y: z.string().default('立场'),
    z: z.string().default('性情'),
  }),
  sects: z.array(SectAnchorSchema).optional(),
}).default({
  enabled: false,
  dimensions: { x: '处世', y: '立场', z: '性情' },
});

export const ProjectSettingsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
  bgmUrl: z.string().optional(),
  vectorSpace: VectorSpaceConfigSchema,
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
