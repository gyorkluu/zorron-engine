/**
 * Asset service: upload, list, get, delete, signed URL via the backend Asset API.
 */

import { http, axiosClient } from './api';
import type {
  Asset,
  AssetUrlResponse,
  AssetType,
  ListAssetsQuery,
  PaginatedResponse,
} from '@/types/asset';

/** Upload a file as a new asset. */
export function uploadAsset(
  file: File,
  projectId?: string,
  metadata?: { type?: AssetType; tags?: string[] },
): Promise<Asset> {
  const form = new FormData();
  form.append('file', file);
  if (projectId) form.append('projectId', projectId);
  if (metadata) form.append('metadata', JSON.stringify(metadata));

  return axiosClient
    .post<Asset>('/api/assets', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
}

/** List assets with pagination and filters. */
export function listAssets(
  query: ListAssetsQuery = {},
): Promise<PaginatedResponse<Asset>> {
  return http.get<PaginatedResponse<Asset>>('/api/assets', { params: query });
}

/** Fetch a single asset by id. */
export function getAsset(id: string): Promise<Asset> {
  return http.get<Asset>(`/api/assets/${id}`);
}

/** Delete an asset by id. */
export function deleteAsset(id: string): Promise<void> {
  return http.delete<void>(`/api/assets/${id}`);
}

/** Get a (possibly signed) URL for an asset. */
export function getAssetUrl(
  id: string,
  expires?: number,
): Promise<AssetUrlResponse> {
  return http.get<AssetUrlResponse>(`/api/assets/${id}/url`, {
    params: expires ? { expires } : undefined,
  });
}
