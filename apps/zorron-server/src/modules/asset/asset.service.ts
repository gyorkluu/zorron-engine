import { randomUUID } from 'node:crypto';
import { AppError } from '../../shared/errors';
import { env } from '../../config/env';
import type { StorageProvider } from '../../shared/storage/provider';
import { findProjectByIdAndOwner } from '../project/project.repository';
import * as repository from './asset.repository';
import type {
  AssetResponse,
  AssetType,
  AssetMetadata,
  ListAssetsQuery,
} from './asset.schema';

function parseAllowedMimes(): string[] {
  return env.ASSET_ALLOWED_MIMES.split(',').map((m) => m.trim().toLowerCase());
}

export function isMimeAllowed(mimeType: string): boolean {
  const allowed = parseAllowedMimes();
  const normalized = mimeType.trim().toLowerCase();
  return allowed.some((pattern) => {
    if (pattern.endsWith('/*')) {
      return normalized.startsWith(pattern.slice(0, -1));
    }
    return normalized === pattern;
  });
}

export function maxAssetSizeBytes(): number {
  return env.ASSET_MAX_SIZE_MB * 1024 * 1024;
}

export function mimeToAssetType(mimeType: string): AssetType {
  const prefix = mimeType.split('/')[0];
  switch (prefix) {
    case 'image':
      return 'image';
    case 'audio':
      return 'audio';
    case 'video':
      return 'video';
    case 'font':
      return 'font';
    default:
      return 'other';
  }
}

/**
 * Sanitizes a user-supplied filename for safe use in a storage key.
 *
 * Strips path separators and `..` segments so the resulting name cannot
 * escape the configured storage root. Returns the basename only.
 */
function sanitizeFileName(name: string): string {
  // Take only the basename (strip any directory components).
  const base = name.split(/[/\\]/).pop() ?? name;
  // Remove `..` sequences and null/control chars.
  const cleaned = base.replace(/\.\./g, '').replace(/[\x00-\x1f]/g, '');
  // Limit length to keep storage keys manageable.
  return cleaned.slice(-128) || 'file';
}

function toAssetResponse(asset: {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  size: number;
  url: string;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AssetResponse {
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type as AssetType,
    mimeType: asset.mimeType,
    size: asset.size,
    url: asset.url,
    projectId: asset.projectId,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

/**
 * Uploads a file after validating size and MIME type, then persists metadata.
 */
export async function uploadAsset(
  ownerId: string,
  payload: {
    file: File;
    projectId?: string;
    metadata?: AssetMetadata;
  },
  storage: StorageProvider,
): Promise<AssetResponse> {
  const { file, projectId, metadata } = payload;

  if (file.size > maxAssetSizeBytes()) {
    throw new AppError(
      'ASSET_002',
      `File exceeds maximum size of ${env.ASSET_MAX_SIZE_MB}MB`,
      413,
    );
  }

  if (!isMimeAllowed(file.type)) {
    throw new AppError('ASSET_003', 'Unsupported file type', 415);
  }

  if (projectId) {
    const project = await findProjectByIdAndOwner(projectId, ownerId);
    if (!project) {
      throw new AppError('PROJECT_002', 'Forbidden', 403);
    }
  }

  const assetType = metadata?.type ?? mimeToAssetType(file.type);
  const name = file.name;
  const safeName = sanitizeFileName(name);
  const storageKey = `assets/${ownerId}/${randomUUID()}-${safeName}`;

  const url = await storage.put(storageKey, file);

  const asset = await repository.createAsset({
    ownerId,
    projectId: projectId ?? null,
    name,
    type: assetType,
    mimeType: file.type,
    size: file.size,
    storageKey,
    storageProvider: env.STORAGE_PROVIDER,
    url,
    metadata: metadata ?? {},
  });

  return toAssetResponse(asset);
}

/**
 * Lists assets owned by the user with optional filters.
 */
export async function listAssets(
  ownerId: string,
  query: ListAssetsQuery,
): Promise<{ data: AssetResponse[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
  const { data, total } = await repository.listAssetsByOwner(ownerId, {
    page: query.page,
    pageSize: query.pageSize,
    projectId: query.projectId,
    type: query.type,
    keyword: query.keyword,
  });

  return {
    data: data.map(toAssetResponse),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

/**
 * Returns a single asset if the user owns it.
 */
export async function getAsset(
  ownerId: string,
  assetId: string,
): Promise<AssetResponse> {
  const asset = await repository.findAssetById(assetId);
  if (!asset) {
    throw new AppError('ASSET_001', 'Asset not found', 404);
  }
  if (asset.ownerId !== ownerId) {
    throw new AppError('PROJECT_002', 'Forbidden', 403);
  }
  return toAssetResponse(asset);
}

/**
 * Deletes an asset that the user owns and removes the underlying file.
 */
export async function deleteAsset(
  ownerId: string,
  assetId: string,
  storage: StorageProvider,
): Promise<void> {
  const asset = await repository.findAssetById(assetId);
  if (!asset) {
    throw new AppError('ASSET_001', 'Asset not found', 404);
  }
  if (asset.ownerId !== ownerId) {
    throw new AppError('PROJECT_002', 'Forbidden', 403);
  }

  await storage.delete(asset.storageKey);
  await repository.deleteAsset(assetId);
}

/**
 * Generates a signed URL for an asset (or a direct URL for local storage).
 */
export async function getAssetUrl(
  ownerId: string,
  assetId: string,
  expiresSeconds: number,
  storage: StorageProvider,
): Promise<{ url: string; expiresAt?: Date }> {
  const asset = await repository.findAssetById(assetId);
  if (!asset) {
    throw new AppError('ASSET_001', 'Asset not found', 404);
  }
  if (asset.ownerId !== ownerId) {
    throw new AppError('PROJECT_002', 'Forbidden', 403);
  }

  return storage.getSignedUrl(asset.storageKey, expiresSeconds);
}
