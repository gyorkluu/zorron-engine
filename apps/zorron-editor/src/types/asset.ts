/**
 * Asset type definitions, mirroring the backend AssetResponseSchema.
 */

/** Asset category derived from MIME type. */
export type AssetType = 'image' | 'audio' | 'video' | 'font' | 'other';

/** Where the asset physically lives. */
export type AssetSource = 'local' | 'remote';

/** Asset record returned by the backend (or materialized from IndexedDB). */
export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  mimeType: string;
  size: number;
  url: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Origin of the asset. Defaults to 'remote' for backend responses. */
  source?: AssetSource;
  /** IndexedDB object id when `source === 'local'`. */
  localHandleId?: string;
}

/** Type guard: true when the asset is backed by IndexedDB. */
export function isLocalAsset(asset: Asset): boolean {
  return asset.source === 'local';
}

/** Paginated list response envelope. */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Query parameters for listing assets. */
export interface ListAssetsQuery {
  page?: number;
  pageSize?: number;
  projectId?: string;
  type?: AssetType;
  keyword?: string;
}

/** Signed URL response. */
export interface AssetUrlResponse {
  url: string;
  expiresAt?: string;
}

/** Derive an AssetType from a MIME type string. */
export function deriveAssetType(mimeType: string): AssetType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('font/')) return 'font';
  return 'other';
}

/** Human-readable file size. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
