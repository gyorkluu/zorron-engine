/**
 * Typed postMessage Communication Protocol for Embedded Minigames / H5 Interactions.
 */

import { z } from 'zod';

export const MinigameToHostSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('zorron:minigame:ready'),
    gameId: z.string().optional(),
  }),
  z.object({
    type: z.literal('zorron:minigame:score'),
    payload: z.object({
      score: z.number(),
      details: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
  z.object({
    type: z.literal('zorron:minigame:complete'),
    payload: z.object({
      success: z.boolean(),
      score: z.number().optional(),
      resultData: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
]);
export type MinigameToHostMessage = z.infer<typeof MinigameToHostSchema>;

export const HostToMinigameSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('zorron:host:init'),
    payload: z.object({
      theme: z.enum(['dark', 'light']).default('dark'),
      locale: z.string().default('zh-CN'),
      initialData: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
  z.object({
    type: z.literal('zorron:host:pause'),
  }),
  z.object({
    type: z.literal('zorron:host:resume'),
  }),
]);
export type HostToMinigameMessage = z.infer<typeof HostToMinigameSchema>;

export function parseMinigameToHost(data: unknown): MinigameToHostMessage | null {
  const res = MinigameToHostSchema.safeParse(data);
  if (res.success) {
    return res.data;
  }
  return null;
}
