/**
 * Base data and primitive types for Zorron Flow.
 */

import { z } from 'zod';

export type AxisId = string;
export type Vector = Record<AxisId, number>;
export type PersonalityVector = Vector;

export const VectorSchema = z.record(z.string(), z.number());

export const InteractionTypeSchema = z.enum(['tap', 'hold', 'slash']);
export type InteractionType = z.infer<typeof InteractionTypeSchema>;

export const SlashDirectionSchema = z.enum(['left', 'right', 'up', 'down']);
export type SlashDirection = z.infer<typeof SlashDirectionSchema>;

export const XYPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type XYPosition = z.infer<typeof XYPositionSchema>;

export const BaseNodeDataSchema = z.object({
  label: z.string().optional(),
  backgroundUrl: z.string().optional(),
}).passthrough();
export type BaseNodeData = z.infer<typeof BaseNodeDataSchema>;
