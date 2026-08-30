/**
 * Terminal, Entry & External Link Node Schemas.
 */

import { z } from 'zod';
import { BaseNodeDataSchema } from '../types.js';

export const StartNodeDataSchema = BaseNodeDataSchema.extend({
  coverUrl: z.string().optional(),
  title: z.string().optional(),
  intro: z.string().optional(),
});
export type StartNodeData = z.infer<typeof StartNodeDataSchema>;

export const SettlementResultMappingSchema = z.object({
  resultId: z.string(),
  condition: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
});
export type SettlementResultMapping = z.infer<typeof SettlementResultMappingSchema>;

export const SettlementButtonActionSchema = z.object({
  varName: z.string().optional(),
  variableName: z.string().optional(),
  action: z.enum(['set', 'add', 'sub']).optional(),
  operation: z.enum(['set', 'add', 'sub']).optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});
export type SettlementButtonAction = z.infer<typeof SettlementButtonActionSchema>;

export const SettlementButtonSchema = z.object({
  id: z.string(),
  label: z.string(),
  actions: z.array(SettlementButtonActionSchema).optional(),
  outputHandleId: z.string().nullable().optional(),
});
export type SettlementButton = z.infer<typeof SettlementButtonSchema>;

export const SettlementVariableModifierSchema = z.object({
  variableName: z.string().optional(),
  varName: z.string().optional(),
  operation: z.enum(['set', 'add', 'sub']).optional(),
  action: z.enum(['set', 'add', 'sub']).optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  useVariable: z.boolean().optional(),
  sourceVariable: z.string().optional(),
});
export type SettlementVariableModifier = z.infer<typeof SettlementVariableModifierSchema>;

export const SettlementNodeDataSchema = BaseNodeDataSchema.extend({
  resultMapping: z.array(SettlementResultMappingSchema).default([]),
  strategy: z.string().default('vector-nearest'),
  strategyConfig: z.record(z.string(), z.unknown()).optional(),
  buttons: z.array(SettlementButtonSchema).optional(),
  variableModifiers: z.array(SettlementVariableModifierSchema).optional(),
  modifiers: z.array(SettlementVariableModifierSchema).optional(),
});
export type SettlementNodeData = z.infer<typeof SettlementNodeDataSchema>;

export const LinkNodeDataSchema = BaseNodeDataSchema.extend({
  url: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
});
export type LinkNodeData = z.infer<typeof LinkNodeDataSchema>;
