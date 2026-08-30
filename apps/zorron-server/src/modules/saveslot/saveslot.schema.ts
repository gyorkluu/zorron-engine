import { z } from 'zod';

export const SaveSlotSnapshotSchema = z.object({
  schemaVersion: z.literal('2.0.0'),
  timestamp: z.number(),
  currentNodeId: z.string().nullable(),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  fragments: z.array(z.string()),
  vector: z.record(z.string(), z.number()).optional(),
  pendingVector: z.record(z.string(), z.number()).optional(),
  history: z.array(z.string()),
  backlog: z.array(
    z.object({
      id: z.string(),
      nodeId: z.string(),
      speaker: z.string().optional(),
      text: z.string(),
      voiceUrl: z.string().optional(),
      timestamp: z.number(),
      choiceSelected: z.string().optional(),
    }),
  ),
  bgmUrl: z.string().nullable().optional(),
  bgmPositionSec: z.number().optional(),
});

export const SaveSlotParamsSchema = z.object({
  id: z.string().uuid(),
  slotIndex: z.coerce.number().int().min(0).max(9),
});

export const SaveSlotBodySchema = z.object({
  snapshotData: SaveSlotSnapshotSchema,
  chapterTitle: z.string().max(200).optional(),
  previewImageUrl: z.string().url().optional(),
});

export const SaveSlotResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  projectId: z.string().uuid(),
  slotIndex: z.number().int(),
  snapshotData: SaveSlotSnapshotSchema,
  chapterTitle: z.string().nullable(),
  previewImageUrl: z.string().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export const SaveSlotListResponseSchema = z.array(
  z.object({
    slotIndex: z.number().int(),
    isOccupied: z.boolean(),
    slot: SaveSlotResponseSchema.nullable(),
  }),
);

export type SaveSlotSnapshot = z.infer<typeof SaveSlotSnapshotSchema>;
export type SaveSlotBody = z.infer<typeof SaveSlotBodySchema>;
