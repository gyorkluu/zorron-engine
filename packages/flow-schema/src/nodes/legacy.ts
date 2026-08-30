/**
 * Legacy V1 Node Schemas for backwards compatibility.
 */

import { z } from 'zod';
import { BaseNodeDataSchema, InteractionTypeSchema, SlashDirectionSchema, VectorSchema } from '../types.js';

export const LegacySceneChoiceSchema = z.object({
  id: z.string(),
  text: z.string(),
  targetNodeId: z.string().optional(),
  interaction: InteractionTypeSchema.default('tap'),
  holdDuration: z.number().optional(),
  slashDirection: SlashDirectionSchema.optional(),
  vector: VectorSchema.optional(),
  dropFragmentId: z.string().optional(),
  icon: z.string().optional(),
});
export type LegacySceneChoice = z.infer<typeof LegacySceneChoiceSchema>;

export const LegacySceneNodeDataSchema = BaseNodeDataSchema.extend({
  dialogue: z.string().optional(),
  background: z.string().optional(),
  backgroundUrl: z.string().optional(),
  character: z.string().optional(),
  characterUrl: z.string().optional(),
  spiritGuide: z.string().optional(),
  focusObject: z.string().optional(),
  speaker: z.string().optional(),
  choices: z.array(LegacySceneChoiceSchema).default([]),
  bgm: z.string().optional(),
  sfx: z.string().optional(),
  stageWeight: z.number().optional(),
  interactionType: InteractionTypeSchema.optional(),
  interaction: InteractionTypeSchema.optional(),
});
export type LegacySceneNodeData = z.infer<typeof LegacySceneNodeDataSchema>;

export const LegacyVideoNodeDataSchema = BaseNodeDataSchema.extend({
  videoUrl: z.string(),
  autoPlay: z.boolean().default(true),
  skipAllowed: z.boolean().default(true),
});
export type LegacyVideoNodeData = z.infer<typeof LegacyVideoNodeDataSchema>;

export const LegacyMediaNodeDataSchema = BaseNodeDataSchema.extend({
  mediaType: z.enum(['image', 'audio', 'video']).default('image'),
  mediaUrl: z.string(),
  caption: z.string().optional(),
  autoAdvance: z.boolean().default(false),
  durationSec: z.number().default(5),
});
export type LegacyMediaNodeData = z.infer<typeof LegacyMediaNodeDataSchema>;

export const LegacyMinigameNodeDataSchema = BaseNodeDataSchema.extend({
  gameUrl: z.string(),
  scoreVariable: z.string().optional(),
  passingScore: z.number().optional(),
});
export type LegacyMinigameNodeData = z.infer<typeof LegacyMinigameNodeDataSchema>;
