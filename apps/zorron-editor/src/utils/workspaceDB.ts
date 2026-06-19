/**
 * workspaceDB - IndexedDB local cache for assets and projects via Dexie.
 *
 * Stores asset metadata (and object URLs) for offline / local-only mode so
 * creators can drag assets into inspector fields without a round-trip to the
 * backend. Remote assets fetched from the API are also mirrored here for
 * fast subsequent loads.
 *
 * Also caches full ProjectDetail snapshots (MIG-015) so the editor can open
 * cloud projects while offline and re-sync when connectivity returns.
 */

import Dexie, { type Table } from 'dexie';
import type { Asset } from '@/types/asset';
import type { ProjectDetail } from '@/types/project';

/** IndexedDB record: the asset plus a stored object URL blob. */
export interface LocalAssetRecord extends Asset {
  /** Object URL created via `URL.createObjectURL`. */
  objectUrl: string;
  /** Raw blob bytes (kept so we can regenerate object URLs after reload). */
  blob?: Blob;
}

/** IndexedDB record for a cached project snapshot (offline support). */
export interface CachedProjectRecord {
  /** Project id (primary key). */
  id: string;
  /** Full project detail snapshot. */
  detail: ProjectDetail;
  /** ISO timestamp of when the cache entry was last refreshed. */
  cachedAt: string;
  /** Whether there are unsynced local changes pending upload. */
  dirty: boolean;
  /** Last locally-modified ISO timestamp (when `dirty` became true). */
  localUpdatedAt: string | null;
}

/** Dexie database schema for the local workspace. */
class WorkspaceDatabase extends Dexie {
  assets!: Table<LocalAssetRecord, string>;
  projects!: Table<CachedProjectRecord, string>;

  constructor() {
    super('zorron-workspace');
    this.version(1).stores({
      // Indexed columns: id (primary), type, source, projectId, createdAt.
      assets: 'id, type, source, projectId, createdAt',
    });
    // v2: add the projects cache for offline cloud-project access (MIG-015).
    this.version(2).stores({
      assets: 'id, type, source, projectId, createdAt',
      projects: 'id, cachedAt',
    });
  }
}

/** Shared singleton database instance. */
export const db = new WorkspaceDatabase();

/**
 * Persist a local asset record (metadata + blob) to IndexedDB and return the
 * materialized Asset view (without the blob).
 */
export async function putLocalAsset(record: LocalAssetRecord): Promise<Asset> {
  await db.assets.put(record);
  const { blob: _blob, objectUrl: _objectUrl, ...asset } = record;
  void _blob;
  void _objectUrl;
  return { ...asset, source: 'local' };
}

/** Return all local asset records (including blobs). */
export async function getAllLocalAssetRecords(): Promise<LocalAssetRecord[]> {
  return db.assets.toArray();
}

/** Return all local assets as the public Asset shape (no blob). */
export async function getAllLocalAssets(): Promise<Asset[]> {
  const records = await db.assets.toArray();
  return records.map(({ blob: _blob, objectUrl: _objectUrl, ...asset }) => {
    void _blob;
    void _objectUrl;
    return { ...asset, source: 'local' as const };
  });
}

/** Delete a local asset by id. */
export async function deleteLocalAsset(id: string): Promise<void> {
  const record = await db.assets.get(id);
  if (record?.objectUrl) {
    URL.revokeObjectURL(record.objectUrl);
  }
  await db.assets.delete(id);
}

/** Remove all local assets. */
export async function clearLocalAssets(): Promise<void> {
  const records = await db.assets.toArray();
  for (const r of records) {
    if (r.objectUrl) URL.revokeObjectURL(r.objectUrl);
  }
  await db.assets.clear();
}

/**
 * Create a local asset record from a File. Generates an object URL and
 * derives the asset type from the MIME type.
 */
export async function createLocalAssetFromFile(
  file: File,
  projectId: string | null = null,
): Promise<LocalAssetRecord> {
  const { deriveAssetType } = await import('@/types/asset');
  const now = new Date().toISOString();
  const objectUrl = URL.createObjectURL(file);
  const id = `local_${now.replace(/[^0-9]/g, '')}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: file.name,
    type: deriveAssetType(file.type),
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    url: objectUrl,
    objectUrl,
    blob: file,
    projectId,
    createdAt: now,
    updatedAt: now,
    source: 'local',
    localHandleId: id,
  };
}

// ---------------------------------------------------------------------------
// Project cache (offline cloud-project access, MIG-015)
// ---------------------------------------------------------------------------

/**
 * Cache (or refresh) a project snapshot in IndexedDB. Marks the entry as
 * clean (no pending local changes) since this represents a fresh server copy.
 */
export async function cacheProject(detail: ProjectDetail): Promise<void> {
  const now = new Date().toISOString();
  await db.projects.put({
    id: detail.id,
    detail,
    cachedAt: now,
    dirty: false,
    localUpdatedAt: null,
  });
}

/**
 * Cache a locally-modified project snapshot and mark it as dirty (pending
 * sync to the cloud). Used when saving while offline.
 */
export async function cacheDirtyProject(detail: ProjectDetail): Promise<void> {
  const now = new Date().toISOString();
  await db.projects.put({
    id: detail.id,
    detail,
    cachedAt: now,
    dirty: true,
    localUpdatedAt: now,
  });
}

/** Read a cached project snapshot by id (null if not cached). */
export async function getCachedProject(id: string): Promise<CachedProjectRecord | null> {
  const record = await db.projects.get(id);
  return record ?? null;
}

/** Return all cached project records (for offline browsing). */
export async function getAllCachedProjects(): Promise<CachedProjectRecord[]> {
  return db.projects.toArray();
}

/** Return only the cached projects with pending local changes. */
export async function getDirtyCachedProjects(): Promise<CachedProjectRecord[]> {
  const all = await db.projects.toArray();
  return all.filter((r) => r.dirty);
}

/** Mark a cached project as clean (successfully synced). */
export async function markProjectClean(id: string): Promise<void> {
  const record = await db.projects.get(id);
  if (record) {
    await db.projects.put({ ...record, dirty: false, localUpdatedAt: null });
  }
}

/** Remove a cached project by id. */
export async function deleteCachedProject(id: string): Promise<void> {
  await db.projects.delete(id);
}

/** Remove all cached projects. */
export async function clearCachedProjects(): Promise<void> {
  await db.projects.clear();
}
