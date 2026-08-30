/**
 * Node asset service — the "node as an asset" catalogue.
 *
 * Authors publish configured node templates; others instantiate them into
 * their own projects. Instantiation is always by value, so editing an instance
 * never mutates the template it came from.
 */

import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db } from '../../config/database';
import { nodeAssets } from '../../db/schema';
import { AppError } from '../../shared/errors';

type NodeAsset = typeof nodeAssets.$inferSelect;

/** A catalogue entry as returned by the API. */
export interface NodeAssetDetail {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  nodeType: string;
  data: Record<string, unknown>;
  category: string | null;
  tags: string[];
  usageCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNodeAssetRequest {
  name: string;
  description?: string | null;
  nodeType: string;
  data: Record<string, unknown>;
  category?: string | null;
  tags?: string[];
  isPublic?: boolean;
}

function toDetail(asset: NodeAsset): NodeAssetDetail {
  return {
    id: asset.id,
    ownerId: asset.ownerId,
    name: asset.name,
    description: asset.description,
    nodeType: asset.nodeType,
    data: (asset.data ?? {}) as Record<string, unknown>,
    category: asset.category,
    tags: asset.tags ?? [],
    usageCount: asset.usageCount,
    isPublic: asset.isPublic,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

/**
 * Browse the catalogue.
 *
 * Signed-in authors see public assets plus their own private ones; anonymous
 * callers only see public assets.
 */
export async function listNodeAssets(params: {
  ownerId: string | null;
  nodeType?: string;
  query?: string;
}): Promise<NodeAssetDetail[]> {
  const filters = [];

  filters.push(
    params.ownerId
      ? or(eq(nodeAssets.isPublic, true), eq(nodeAssets.ownerId, params.ownerId))!
      : eq(nodeAssets.isPublic, true),
  );

  if (params.nodeType) {
    filters.push(eq(nodeAssets.nodeType, params.nodeType));
  }
  if (params.query) {
    filters.push(sql`${nodeAssets.name} ilike ${'%' + params.query + '%'}`);
  }

  const rows = await db
    .select()
    .from(nodeAssets)
    .where(and(...filters))
    .orderBy(desc(nodeAssets.usageCount), desc(nodeAssets.createdAt))
    .limit(100);

  return rows.map(toDetail);
}

/** Publish a node from the caller's project as a reusable template. */
export async function createNodeAsset(
  ownerId: string,
  payload: CreateNodeAssetRequest,
): Promise<NodeAssetDetail> {
  const [created] = await db
    .insert(nodeAssets)
    .values({
      ownerId,
      name: payload.name,
      description: payload.description ?? null,
      nodeType: payload.nodeType,
      data: payload.data,
      category: payload.category ?? null,
      tags: payload.tags ?? [],
      isPublic: payload.isPublic ?? false,
    })
    .returning();

  return toDetail(created);
}

/**
 * Record that a template was used and return it for copying.
 *
 * The caller copies `data` into a fresh node; nothing here links the instance
 * back to the template.
 */
export async function instantiateNodeAsset(
  assetId: string,
): Promise<NodeAssetDetail> {
  const [updated] = await db
    .update(nodeAssets)
    .set({ usageCount: sql`${nodeAssets.usageCount} + 1` })
    .where(eq(nodeAssets.id, assetId))
    .returning();

  if (!updated) {
    throw new AppError('NODE_ASSET_001', 'Node asset not found', 404);
  }
  return toDetail(updated);
}

/** Remove a template. Only its author may do this. */
export async function deleteNodeAsset(
  ownerId: string,
  assetId: string,
): Promise<void> {
  const existing = await db
    .select()
    .from(nodeAssets)
    .where(eq(nodeAssets.id, assetId))
    .limit(1);

  const asset = existing[0];
  if (!asset) {
    throw new AppError('NODE_ASSET_001', 'Node asset not found', 404);
  }
  if (asset.ownerId !== ownerId) {
    throw new AppError('NODE_ASSET_002', 'Forbidden', 403);
  }

  await db.delete(nodeAssets).where(eq(nodeAssets.id, assetId));
}
