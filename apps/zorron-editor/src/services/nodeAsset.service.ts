/**
 * Node asset market client.
 *
 * Templates are copied by value on instantiation, so an inserted node is
 * always an independent copy the author can freely edit.
 */

import { api } from './api';

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

export interface CreateNodeAssetPayload {
  name: string;
  description?: string | null;
  nodeType: string;
  data: Record<string, unknown>;
  category?: string | null;
  tags?: string[];
  isPublic?: boolean;
}

export function listNodeAssets(
  params: { nodeType?: string; q?: string } = {},
): Promise<NodeAssetDetail[]> {
  const search = new URLSearchParams();
  if (params.nodeType) search.set('nodeType', params.nodeType);
  if (params.q) search.set('q', params.q);
  const suffix = search.toString();
  return api.get<NodeAssetDetail[]>(`/api/node-assets${suffix ? `?${suffix}` : ''}`);
}

export function createNodeAsset(
  payload: CreateNodeAssetPayload,
): Promise<NodeAssetDetail> {
  return api.post<NodeAssetDetail>('/api/node-assets', payload);
}

/** Register a use and return the template to copy from. */
export function instantiateNodeAsset(id: string): Promise<NodeAssetDetail> {
  return api.post<NodeAssetDetail>(`/api/node-assets/${id}/instantiate`);
}

export function deleteNodeAsset(id: string): Promise<void> {
  return api.delete<void>(`/api/node-assets/${id}`);
}
