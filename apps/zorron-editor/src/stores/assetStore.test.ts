/**
 * Unit tests for the asset store (filters, reference counting, merge).
 *
 * The store's network calls are mocked so we test the pure state logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAssetStore, mergeAssets } from './assetStore';
import type { Asset } from '@/types/asset';

// Mock the asset service so no real HTTP calls are made.
vi.mock('@/services/asset.service', () => ({
  uploadAsset: vi.fn(),
  listAssets: vi.fn(),
  getAsset: vi.fn(),
  deleteAsset: vi.fn(),
  getAssetUrl: vi.fn(),
}));

// Mock the workspace DB so IndexedDB is not touched in tests.
vi.mock('@/utils/workspaceDB', () => ({
  createLocalAssetFromFile: vi.fn(),
  deleteLocalAsset: vi.fn(),
  getAllLocalAssets: vi.fn().mockResolvedValue([]),
  putLocalAsset: vi.fn(),
}));

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: `a_${Math.random().toString(36).slice(2, 8)}`,
    name: 'asset.png',
    type: 'image',
    mimeType: 'image/png',
    size: 1024,
    url: `https://cdn.test/${Math.random().toString(36).slice(2, 8)}.png`,
    projectId: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('mergeAssets', () => {
  it('combines remote and local assets', () => {
    const remote = [makeAsset({ id: 'r1', url: 'https://cdn/r1.png' })];
    const local = [makeAsset({ id: 'l1', url: 'blob:l1', source: 'local' })];
    const merged = mergeAssets(remote, local);
    expect(merged).toHaveLength(2);
    expect(merged.map((a) => a.id).sort()).toEqual(['l1', 'r1']);
  });

  it('deduplicates by URL with remote winning', () => {
    const remote = [makeAsset({ id: 'r1', url: 'https://cdn/dup.png' })];
    const local = [makeAsset({ id: 'l1', url: 'https://cdn/dup.png', source: 'local' })];
    const merged = mergeAssets(remote, local);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('r1');
  });
});

describe('assetStore', () => {
  beforeEach(() => {
    useAssetStore.setState({
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
    });
  });

  it('setTypeFilter updates the filter and resets page', () => {
    useAssetStore.getState().setTypeFilter('audio');
    expect(useAssetStore.getState().typeFilter).toBe('audio');
    expect(useAssetStore.getState().page).toBe(1);
  });

  it('setKeyword updates the keyword and resets page', () => {
    useAssetStore.getState().setKeyword('hero');
    expect(useAssetStore.getState().keyword).toBe('hero');
    expect(useAssetStore.getState().page).toBe(1);
  });

  it('selectAsset sets the selected asset id', () => {
    useAssetStore.getState().selectAsset('abc');
    expect(useAssetStore.getState().selectedAssetId).toBe('abc');
    useAssetStore.getState().selectAsset(null);
    expect(useAssetStore.getState().selectedAssetId).toBeNull();
  });

  it('recomputeReferences counts URLs by occurrence', () => {
    useAssetStore.getState().recomputeReferences([
      'https://cdn/a.png',
      'https://cdn/a.png',
      'https://cdn/b.png',
    ]);
    const counts = useAssetStore.getState().referenceCounts;
    expect(counts['https://cdn/a.png']).toBe(2);
    expect(counts['https://cdn/b.png']).toBe(1);
  });

  it('removeAsset deletes a local asset and clears selection', async () => {
    const { deleteLocalAsset } = await import('@/utils/workspaceDB');
    (deleteLocalAsset as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    useAssetStore.setState({
      localAssets: [makeAsset({ id: 'l1', source: 'local' })],
      selectedAssetId: 'l1',
    });
    await useAssetStore.getState().removeAsset('l1');
    expect(useAssetStore.getState().localAssets).toHaveLength(0);
    expect(useAssetStore.getState().selectedAssetId).toBeNull();
  });

  it('removeAsset deletes a remote asset via the service', async () => {
    const assetService = await import('@/services/asset.service');
    (assetService.deleteAsset as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    useAssetStore.setState({
      assets: [makeAsset({ id: 'r1' })],
      total: 1,
    });
    await useAssetStore.getState().removeAsset('r1');
    expect(useAssetStore.getState().assets).toHaveLength(0);
    expect(useAssetStore.getState().total).toBe(0);
  });
});
