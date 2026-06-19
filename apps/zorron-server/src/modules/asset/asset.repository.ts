import { eq, and, desc, sql, count } from 'drizzle-orm';
import { db } from '../../config/database';
import { assets, type Asset, type NewAsset } from '../../db/schema';

/**
 * Creates a new asset record.
 */
export async function createAsset(values: NewAsset): Promise<Asset> {
  const [asset] = await db.insert(assets).values(values).returning();
  return asset;
}

/**
 * Finds an asset by id without ownership check.
 */
export async function findAssetById(id: string): Promise<Asset | undefined> {
  const [asset] = await db.select().from(assets).where(eq(assets.id, id));
  return asset;
}

/**
 * Lists assets owned by the user with optional filters.
 */
export async function listAssetsByOwner(
  ownerId: string,
  options: {
    page: number;
    pageSize: number;
    projectId?: string;
    type?: string;
    keyword?: string;
  },
): Promise<{ data: Asset[]; total: number }> {
  const { page, pageSize, projectId, type, keyword } = options;
  const offset = (page - 1) * pageSize;

  const filters = [eq(assets.ownerId, ownerId)];
  if (projectId) filters.push(eq(assets.projectId, projectId));
  if (type) filters.push(eq(assets.type, type));
  if (keyword) {
    filters.push(sql`${assets.name} ILIKE ${`%${keyword}%`}`);
  }

  const whereClause = and(...filters);

  const [items, totalResult] = await Promise.all([
    db
      .select()
      .from(assets)
      .where(whereClause)
      .orderBy(desc(assets.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(assets)
      .where(whereClause),
  ]);

  return { data: items, total: totalResult[0]?.count ?? 0 };
}

/**
 * Deletes an asset by id.
 */
export async function deleteAsset(id: string): Promise<void> {
  await db.delete(assets).where(eq(assets.id, id));
}
