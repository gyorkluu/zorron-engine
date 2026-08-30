/**
 * Form & Input Node Schemas.
 */

import { z } from 'zod';
import { BaseNodeDataSchema } from '../types.js';

export const TextInputNodeDataSchema = BaseNodeDataSchema.extend({
  question: z.string().optional(),
  placeholder: z.string().optional(),
  hint: z.string().optional(),
  variable: z.string().optional(),
  required: z.boolean().default(false),
  maxLength: z.number().optional(),
});
export type TextInputNodeData = z.infer<typeof TextInputNodeDataSchema>;

export const RatingNodeDataSchema = BaseNodeDataSchema.extend({
  variable: z.string().optional(),
  min: z.number().default(1),
  max: z.number().default(5),
  step: z.number().default(1),
  question: z.string().optional(),
  prompt: z.string().optional(),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
});
export type RatingNodeData = z.infer<typeof RatingNodeDataSchema>;

export const MultiSelectOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string().optional(),
  vector: z.record(z.string(), z.number()).optional(),
});
export type MultiSelectOption = z.infer<typeof MultiSelectOptionSchema>;

export const MultiSelectNodeDataSchema = BaseNodeDataSchema.extend({
  variable: z.string().optional(),
  question: z.string().optional(),
  prompt: z.string().optional(),
  options: z.array(MultiSelectOptionSchema).default([]),
  minSelect: z.number().default(0),
  maxSelect: z.number().default(0),
});
export type MultiSelectNodeData = z.infer<typeof MultiSelectNodeDataSchema>;

export const RankOrderItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string().optional(),
});
export type RankOrderItem = z.infer<typeof RankOrderItemSchema>;

export const RankOrderNodeDataSchema = BaseNodeDataSchema.extend({
  question: z.string().optional(),
  prompt: z.string().optional(),
  variable: z.string().optional(),
  items: z.array(RankOrderItemSchema).default([]),
});
export type RankOrderNodeData = z.infer<typeof RankOrderNodeDataSchema>;

export const NumberPickerNodeDataSchema = BaseNodeDataSchema.extend({
  question: z.string().optional(),
  prompt: z.string().optional(),
  variable: z.string().optional(),
  min: z.number().default(0),
  max: z.number().default(100),
  step: z.number().default(1),
  defaultValue: z.number().default(0),
  unit: z.string().optional(),
});
export type NumberPickerNodeData = z.infer<typeof NumberPickerNodeDataSchema>;
