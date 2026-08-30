import * as service from './saveslot.service';
import type { SaveSlotBody } from './saveslot.schema';

export async function listSlots(userId: string, projectId: string) {
  return service.getSlots(userId, projectId);
}

export async function getSlot(userId: string, projectId: string, slotIndex: number) {
  return service.getSlot(userId, projectId, slotIndex);
}

export async function saveSlot(
  userId: string,
  projectId: string,
  slotIndex: number,
  body: SaveSlotBody,
) {
  return service.saveSlot(userId, projectId, slotIndex, body);
}

export async function clearSlot(userId: string, projectId: string, slotIndex: number) {
  return service.clearSlot(userId, projectId, slotIndex);
}
