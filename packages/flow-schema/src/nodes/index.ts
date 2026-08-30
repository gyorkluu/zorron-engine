/**
 * Node Schemas & Unified Flow Registry.
 */

import { z } from 'zod';
import { XYPositionSchema } from '../types.js';
import { StageNodeDataSchema } from './stage.js';
import {
  TextInputNodeDataSchema,
  RatingNodeDataSchema,
  MultiSelectNodeDataSchema,
  RankOrderNodeDataSchema,
  NumberPickerNodeDataSchema,
} from './form.js';
import {
  LogicNodeDataSchema,
  SetterNodeDataSchema,
  CalculatorNodeDataSchema,
} from './logic.js';
import {
  StartNodeDataSchema,
  SettlementNodeDataSchema,
  LinkNodeDataSchema,
} from './terminal.js';
import {
  LegacySceneNodeDataSchema,
  LegacyVideoNodeDataSchema,
  LegacyMediaNodeDataSchema,
  LegacyMinigameNodeDataSchema,
} from './legacy.js';

export * from './stage.js';
export * from './form.js';
export * from './logic.js';
export * from './terminal.js';
export * from './legacy.js';

/** Discriminated union of all node types and their corresponding data schemas. */
export const GameNodeDataSchema = z.discriminatedUnion('type', [
  // 1. Stage Composite Node (M0+ Universal Stage)
  z.object({ type: z.literal('stage'), data: StageNodeDataSchema }),

  // 2. Forms & Inputs
  z.object({ type: z.literal('text-input'), data: TextInputNodeDataSchema }),
  z.object({ type: z.literal('rating'), data: RatingNodeDataSchema }),
  z.object({ type: z.literal('multi-select'), data: MultiSelectNodeDataSchema }),
  z.object({ type: z.literal('rank-order'), data: RankOrderNodeDataSchema }),
  z.object({ type: z.literal('number-picker'), data: NumberPickerNodeDataSchema }),

  // 3. Logic & Calculations
  z.object({ type: z.literal('logic'), data: LogicNodeDataSchema }),
  z.object({ type: z.literal('setter'), data: SetterNodeDataSchema }),
  z.object({ type: z.literal('calculator'), data: CalculatorNodeDataSchema }),

  // 4. Terminals & Flow Entry
  z.object({ type: z.literal('start'), data: StartNodeDataSchema }),
  z.object({ type: z.literal('settlement'), data: SettlementNodeDataSchema }),
  z.object({ type: z.literal('link'), data: LinkNodeDataSchema }),

  // 5. Legacy V1 Support (Backward Compatible)
  z.object({ type: z.literal('scene'), data: LegacySceneNodeDataSchema }),
  z.object({ type: z.literal('video'), data: LegacyVideoNodeDataSchema }),
  z.object({ type: z.literal('media'), data: LegacyMediaNodeDataSchema }),
  z.object({ type: z.literal('minigame'), data: LegacyMinigameNodeDataSchema }),
]);

export type GameNodeData = z.infer<typeof GameNodeDataSchema>;

/** Generic Flow Node Schema */
export const FlowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: XYPositionSchema,
  data: z.record(z.string(), z.unknown()),
  width: z.number().optional(),
  height: z.number().optional(),
  selected: z.boolean().optional(),
  dragging: z.boolean().optional(),
});
export type FlowNode = z.infer<typeof FlowNodeSchema>;

/** Flow Edge Schema */
export const FlowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  label: z.string().optional(),
  type: z.string().optional(),
  animated: z.boolean().optional(),
  data: z.object({
    condition: z.string().optional(),
    guard: z.string().optional(),
    priority: z.number().optional(),
  }).passthrough().optional(),
});
export type FlowEdge = z.infer<typeof FlowEdgeSchema>;

/** Flow Variables & State Schemas */
export const FlowVariableSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean']),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]),
  description: z.string().optional(),
});
export type FlowVariable = z.infer<typeof FlowVariableSchema>;

export const FlowFragmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
});
export type FlowFragment = z.infer<typeof FlowFragmentSchema>;

export const VectorSpaceConfigSchema = z.object({
  dimensions: z.array(z.object({
    id: z.string(),
    label: z.string(),
    min: z.number().default(-100),
    max: z.number().default(100),
  })).default([]),
});
export type VectorSpaceConfig = z.infer<typeof VectorSpaceConfigSchema>;

/** Global FlowData Schema (The Single Source of Truth) */
export const FlowDataSchema = z.object({
  version: z.string().default('2.0.0'),
  nodes: z.array(FlowNodeSchema).default([]),
  edges: z.array(FlowEdgeSchema).default([]),
  variables: z.array(FlowVariableSchema).default([]),
  fragments: z.array(FlowFragmentSchema).default([]),
  vectorSpace: VectorSpaceConfigSchema.optional(),
  viewport: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    zoom: z.number().default(1),
  }).default({ x: 0, y: 0, zoom: 1 }),
});
export type FlowData = z.infer<typeof FlowDataSchema>;
