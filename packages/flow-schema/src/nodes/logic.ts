/**
 * Logic & Computation Node Schemas.
 */

import { z } from 'zod';
import { BaseNodeDataSchema, VectorSchema } from '../types.js';

export const LogicNodeDataSchema = BaseNodeDataSchema.extend({
  condition: z.string().optional(),
  checkType: z.enum(['count', 'has-specific', 'variable']).default('variable'),
  countThreshold: z.number().optional(),
  operator: z.enum(['>=', '<=', '==', '>', '<']).optional(),
  targetFragmentId: z.string().optional(),
  varName: z.string().optional(),
  value: z.number().optional(),
});
export type LogicNodeData = z.infer<typeof LogicNodeDataSchema>;

export const SetterAssignmentSchema = z.object({
  variable: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  operator: z.enum(['set', 'add', 'sub']).default('set'),
});
export type SetterAssignment = z.infer<typeof SetterAssignmentSchema>;

export const SetterNodeDataSchema = BaseNodeDataSchema.extend({
  assignments: z.array(SetterAssignmentSchema).default([]),
});
export type SetterNodeData = z.infer<typeof SetterNodeDataSchema>;

export const CalculatorNodeDataSchema = BaseNodeDataSchema.extend({
  vector: VectorSchema.default({}),
  targetVariable: z.string().optional(),
  description: z.string().optional(),
});
export type CalculatorNodeData = z.infer<typeof CalculatorNodeDataSchema>;
