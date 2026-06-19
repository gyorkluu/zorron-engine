/**
 * Asset store (Zustand) - asset list, filters, upload and reference counting.
 *
 * Maintains two sources of assets:
 *  - `assets`: remote assets fetched from the backend (`/api/assets`).
 *  - `localAssets`: assets persisted in IndexedDB for offline / local mode.
 * The `allAssets` selector merges both so the UI can render a single grid.
 */

import { create } from 'zustand';
import { useMemo } from 'react';
import type {
  Asset,
  AssetType,
  ListAssetsQuery,
} from '@/types/asset';
import * as assetService from '@/services/asset.service';
import { AppError } from '@/lib/errors';
import {
  createLocalAssetFromFile,
  deleteLocalAsset,
  getAllLocalAssets,
  putLocalAsset,
} from '@/utils/workspaceDB';

/** Asset store state shape. */
interface AssetState {
  /** Remote assets fetched from the backend. */
  assets: Asset[];
  /** Local assets persisted in IndexedDB. */
  localAssets: Asset[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;

  /** Active type filter (undefined = all). */
  typeFilter: AssetType | undefined;
  keyword: string;

  /** Currently selected asset id (for the detail panel). */
  selectedAssetId: string | null;

  fetchAssets: (query?: ListAssetsQuery) => Promise<void>;
  fetchLocalAssets: () => Promise<void>;
  uploadAsset: (file: File, projectId?: string) => Promise<Asset>;
  /** Upload to backend; on failure, fall back to a local-only asset. */
  uploadAssetWithFallback: (file: File, projectId?: string) => Promise<Asset>;
  removeAsset: (id: string) => Promise<void>;
  setTypeFilter: (type: AssetType | undefined) => void;
  setKeyword: (keyword: string) => void;
  selectAsset: (id: string | null) => void;

  /** Reference counts keyed by asset URL. */
  referenceCounts: Record<string, number>;
  /** Recompute reference counts by scanning node data for asset URLs. */
  recomputeReferences: (urls: string[]) => void;
}

/** Combine remote + local assets, deduplicating by URL (remote wins). */
export function mergeAssets(remote: Asset[], local: Asset[]): Asset[] {
  const seen = new Set<string>();
  const merged: Asset[] = [];
  for (const a of remote) {
    if (!seen.has(a.url)) {
      seen.add(a.url);
      merged.push({ ...a, source: a.source ?? 'remote' });
    }
  }
  for (const a of local) {
    if (!seen.has(a.url)) {
      seen.add(a.url);
      merged.push(a);
    }
  }
  return merged;
}

/** Selector hook: merged local + remote assets (memoized to avoid re-renders). */
export function useAllAssets(): Asset[] {
  const remote = useAssetStore((s) => s.assets);
  const local = useAssetStore((s) => s.localAssets);
  return useMemo(() => mergeAssets(remote, local), [remote, local]);
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  localAssets: [],
  total: 0,
  page: 1,
  pageSize: 50,
  isLoading: false,
  isUploading: false,
  error: null,
  typeFilter: undefined,
  keyword: '',
  selectedAssetId: null,
  referenceCounts: {},

  fetchAssets: async (query) => {
    const state = get();
    set({ isLoading: true, error: null });
    try {
      const effective: ListAssetsQuery = {
        page: state.page,
        pageSize: state.pageSize,
        type: state.typeFilter,
        keyword: state.keyword || undefined,
        ...query,
      };
      const res = await assetService.listAssets(effective);
      set({
        assets: res.data,
        total: res.meta.total,
        page: res.meta.page,
        pageSize: res.meta.pageSize,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Failed to load assets';
      set({ isLoading: false, error: message });
    }
  },

  fetchLocalAssets: async () => {
    try {
      const local = await getAllLocalAssets();
      set({ localAssets: local });
    } catch {
      // IndexedDB may be unavailable (private mode); fail silently.
    }
  },

  uploadAsset: async (file, projectId) => {
    set({ isUploading: true, error: null });
    try {
      const asset = await assetService.uploadAsset(file, projectId);
      set((state) => ({
        assets: [asset, ...state.assets],
        total: state.total + 1,
        isUploading: false,
      }));
      return asset;
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Failed to upload asset';
      set({ isUploading: false, error: message });
      throw err;
    }
  },

  uploadAssetWithFallback: async (file, projectId) => {
    try {
      return await get().uploadAsset(file, projectId);
    } catch {
      // Backend unavailable: persist locally so the user can still drag-drop.
      const record = await createLocalAssetFromFile(file, projectId ?? null);
      await putLocalAsset(record);
      const { blob: _blob, objectUrl: _objectUrl, ...asset } = record;
      void _blob;
      void _objectUrl;
      const localAsset: Asset = { ...asset, source: 'local' };
      set((state) => ({
        localAssets: [localAsset, ...state.localAssets],
        isUploading: false,
      }));
      return localAsset;
    }
  },

  removeAsset: async (id) => {
    const state = get();
    const isLocal = state.localAssets.some((a) => a.id === id);
    try {
      if (isLocal) {
        await deleteLocalAsset(id);
        set((s) => ({
          localAssets: s.localAssets.filter((a) => a.id !== id),
          selectedAssetId: s.selectedAssetId === id ? null : s.selectedAssetId,
        }));
      } else {
        await assetService.deleteAsset(id);
        set((s) => ({
          assets: s.assets.filter((a) => a.id !== id),
          total: Math.max(0, s.total - 1),
          selectedAssetId: s.selectedAssetId === id ? null : s.selectedAssetId,
        }));
      }
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Failed to delete asset';
      set({ error: message });
      throw err;
    }
  },

  setTypeFilter: (type) => set({ typeFilter: type, page: 1 }),
  setKeyword: (keyword) => set({ keyword, page: 1 }),
  selectAsset: (id) => set({ selectedAssetId: id }),

  recomputeReferences: (urls) => {
    const counts: Record<string, number> = {};
    for (const url of urls) {
      counts[url] = (counts[url] ?? 0) + 1;
    }
    set({ referenceCounts: counts });
  },
}));
