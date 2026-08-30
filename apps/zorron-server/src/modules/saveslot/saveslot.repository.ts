import { eq, and } from 'drizzle-orm';
import { db } from '../../config/database';
import { saveSlots, type SaveSlot, type NewSaveSlot } from '../../db/schema';

export async function findSlot(
  userId: string,
  projectId: string,
  slotIndex: number,
): Promise<SaveSlot | undefined> {
  const rows = await db
    .select()
    .from(saveSlots)
    .where(
      and(
        eq(saveSlots.userId, userId),
        eq(saveSlots.projectId, projectId),
        eq(saveSlots.slotIndex, slotIndex),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function listSlotsForProject(
  userId: string,
  projectId: string,
): Promise<SaveSlot[]> {
  return db
    .select()
    .from(saveSlots)
    .where(and(eq(saveSlots.userId, userId), eq(saveSlots.projectId, projectId)));
}

export async function upsertSlot(
  data: NewSaveSlot,
): Promise<SaveSlot> {
  const existing = await findSlot(data.userId, data.projectId, data.slotIndex);
  if (existing) {
    const updated = await db
      .update(saveSlots)
      .set({
        snapshotData: data.snapshotData,
        chapterTitle: data.chapterTitle,
        previewImageUrl: data.previewImageUrl,
        updatedAt: new Date(),
      })
      .where(eq(saveSlots.id, existing.id))
      .returning();
    return updated[0];
  }

  const inserted = await db.insert(saveSlots).values(data).returning();
  return inserted[0];
}

export async function deleteSlot(
  userId: string,
  projectId: string,
  slotIndex: number,
): Promise<boolean> {
  const result = await db
    .delete(saveSlots)
    .where(
      and(
        eq(saveSlots.userId, userId),
        eq(saveSlots.projectId, projectId),
        eq(saveSlots.slotIndex, slotIndex),
      ),
    )
    .returning();
  return result.length > 0;
}
