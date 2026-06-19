import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock react-router-dom's useNavigate (EditorToolbar uses it for the Projects button).
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock the hooks that trigger network/IndexedDB side effects on mount.
vi.mock('@/hooks/useProjectSync', () => ({
  useProjectSync: vi.fn(),
}));
vi.mock('@/hooks/useAutoSave', () => ({
  useAutoSave: vi.fn(),
  buildCurrentFlowData: vi.fn(),
}));

// Mock the asset service + workspace DB so AssetPanel mount is side-effect free.
vi.mock('@/services/asset.service', () => ({
  uploadAsset: vi.fn(),
  listAssets: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 } }),
  getAsset: vi.fn(),
  deleteAsset: vi.fn(),
  getAssetUrl: vi.fn(),
}));
vi.mock('@/utils/workspaceDB', () => ({
  createLocalAssetFromFile: vi.fn(),
  deleteLocalAsset: vi.fn(),
  getAllLocalAssets: vi.fn().mockResolvedValue([]),
  putLocalAsset: vi.fn(),
  getDirtyCachedProjects: vi.fn().mockResolvedValue([]),
  getCachedProject: vi.fn().mockResolvedValue(null),
  cacheProject: vi.fn().mockResolvedValue(undefined),
  cacheDirtyProject: vi.fn().mockResolvedValue(undefined),
  markProjectClean: vi.fn().mockResolvedValue(undefined),
  deleteCachedProject: vi.fn().mockResolvedValue(undefined),
  getAllCachedProjects: vi.fn().mockResolvedValue([]),
}));

// Mock useCloudSync so SyncStatusIndicator doesn't trigger sync logic.
vi.mock('@/hooks/useCloudSync', () => ({
  useCloudSync: vi.fn(() => ({
    isOnline: true,
    pendingCount: 0,
    syncNow: vi.fn().mockResolvedValue(undefined),
    syncProjectToCloud: vi.fn(),
    detectConflict: vi.fn(),
    resolveConflict: vi.fn().mockResolvedValue(undefined),
  })),
}));

import App from './App';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the editor toolbar with the Zorron brand', () => {
    render(<App />);
    expect(screen.getByText('Zorron')).toBeInTheDocument();
  });

  it('renders the save status badge', () => {
    render(<App />);
    expect(screen.getByTestId('save-status')).toBeInTheDocument();
  });

  it('renders the asset panel header', () => {
    render(<App />);
    expect(screen.getByText('资源')).toBeInTheDocument();
  });
});
