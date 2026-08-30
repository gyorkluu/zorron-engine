import * as repo from './saveslot.repository';
import type { SaveSlotBody } from './saveslot.schema';
import { AppError } from '../../shared/errors';

export async function getSlots(userId: string, projectId: string) {
  const existingSlots = await repo.listSlotsForProject(userId, projectId);
  const slotMap = new Map(existingSlots.map((s) => [s.slotIndex, s]));

  // Return standard 10 slots (0~9)
  const result = [];
  for (let i = 0; i < 10; i++) {
    const slot = slotMap.get(i) || null;
    result.push({
      slotIndex: i,
      isOccupied: slot !== null,
      slot: slot as any,
    });
  }
  return result;
}

export async function getSlot(userId: string, projectId: string, slotIndex: number) {
  const slot = await repo.findSlot(userId, projectId, slotIndex);
  if (!slot) {
    throw new AppError('SLOT_001', `Save slot ${slotIndex} is empty`, 404);
  }
  return slot;
}

export async function saveSlot(
  userId: string,
  projectId: string,
  slotIndex: number,
  body: SaveSlotBody,
) {
  return repo.upsertSlot({
    userId,
    projectId,
    slotIndex,
    snapshotData: body.snapshotData,
    chapterTitle: body.chapterTitle,
    previewImageUrl: body.previewImageUrl,
  });
}

export async function clearSlot(userId: string, projectId: string, slotIndex: number) {
  const deleted = await repo.deleteSlot(userId, projectId, slotIndex);
  if (!deleted) {
    throw new AppError('SLOT_001', `Save slot ${slotIndex} is already empty`, 404);
  }
  return { success: true };
}
