/**
 * Unit tests for the WorkspaceSwitcher and ConflictDialog components.
 *
 * The File System Access API and project service are mocked so we can test
 * the UI state transitions in isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { ConflictDialog } from './ConflictDialog';
import { useWorkspaceStore, type SyncConflict } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';

// Mock the feature flags.
vi.mock('@/lib/featureFlags', () => ({
  featureFlags: { vector3d: true, cloudSync: true },
}));

// Mock the workspace service so no real directory picker opens.
vi.mock('@/services/workspace.service', () => ({
  pickLocalDirectory: vi.fn(),
  verifyDirectoryPermission: vi.fn().mockResolvedValue(true),
  isFileSystemAccessSupported: vi.fn().mockReturnValue(false),
}));

// Mock useCloudSync so ConflictDialog doesn't trigger real sync logic.
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

import { useCloudSync } from '@/hooks/useCloudSync';
import type { ProjectDetail } from '@/types/project';

function makeProject(title: string): ProjectDetail {
  return {
    id: 'p1',
    title,
    description: null,
    coverUrl: null,
    isPublished: false,
    data: {
      nodes: [{ id: 'n1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'S' } }],
      edges: [],
      variables: {},
      settings: {
        vectorSpace: { enabled: false, dimensions: { x: 'x', y: 'y', z: 'z' } },
      },
      version: '1.0.0',
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };
}

describe('WorkspaceSwitcher', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().reset();
    useAuthStore.setState({ isAuthenticated: true, user: null, token: 't', isLoading: false, error: null });
    vi.clearAllMocks();
  });

  it('renders both Cloud and Local mode buttons', () => {
    render(<WorkspaceSwitcher />);
    expect(screen.getByTestId('workspace-mode-cloud')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-mode-local')).toBeInTheDocument();
  });

  it('switches to local mode when the Local button is clicked (IndexedDB fallback)', () => {
    render(<WorkspaceSwitcher />);
    fireEvent.click(screen.getByTestId('workspace-mode-local'));
    expect(useWorkspaceStore.getState().mode).toBe('local');
  });

  it('shows the IndexedDB fallback hint in local mode', () => {
    render(<WorkspaceSwitcher />);
    fireEvent.click(screen.getByTestId('workspace-mode-local'));
    expect(screen.getByText(/IndexedDB/)).toBeInTheDocument();
  });

  it('switches to cloud mode when the Cloud button is clicked', () => {
    useWorkspaceStore.getState().setMode('local');
    render(<WorkspaceSwitcher />);
    fireEvent.click(screen.getByTestId('workspace-mode-cloud'));
    expect(useWorkspaceStore.getState().mode).toBe('cloud');
  });

  it('disables the Cloud button when not authenticated', () => {
    useAuthStore.setState({ isAuthenticated: false });
    render(<WorkspaceSwitcher />);
    expect(screen.getByTestId('workspace-mode-cloud')).toBeDisabled();
  });
});

describe('ConflictDialog', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().reset();
    vi.clearAllMocks();
  });

  it('renders nothing when there is no conflict', () => {
    const { container } = render(<ConflictDialog />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the conflict details when a conflict is active', () => {
    const conflict: SyncConflict = {
      projectId: 'p1',
      local: makeProject('Local Version'),
      cloud: makeProject('Cloud Version'),
    };
    useWorkspaceStore.getState().setConflict(conflict);
    render(<ConflictDialog />);
    expect(screen.getByTestId('conflict-dialog')).toBeInTheDocument();
    // Use getAllByText since the title appears in a <dd> inside a <div> that
    // testing-library may match at multiple levels.
    expect(screen.getAllByText('Local Version').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cloud Version').length).toBeGreaterThan(0);
  });

  it('calls resolveConflict with "local" when Keep Local is clicked', () => {
    const resolveConflict = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useCloudSync).mockReturnValue({
      isOnline: true,
      pendingCount: 0,
      syncNow: vi.fn(),
      syncProjectToCloud: vi.fn(),
      detectConflict: vi.fn(),
      resolveConflict,
    });
    const conflict: SyncConflict = {
      projectId: 'p1',
      local: makeProject('Local'),
      cloud: makeProject('Cloud'),
    };
    useWorkspaceStore.getState().setConflict(conflict);
    render(<ConflictDialog />);
    fireEvent.click(screen.getByTestId('conflict-keep-local'));
    expect(resolveConflict).toHaveBeenCalledWith('local');
  });

  it('calls resolveConflict with "cloud" when Keep Cloud is clicked', () => {
    const resolveConflict = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useCloudSync).mockReturnValue({
      isOnline: true,
      pendingCount: 0,
      syncNow: vi.fn(),
      syncProjectToCloud: vi.fn(),
      detectConflict: vi.fn(),
      resolveConflict,
    });
    const conflict: SyncConflict = {
      projectId: 'p1',
      local: makeProject('Local'),
      cloud: makeProject('Cloud'),
    };
    useWorkspaceStore.getState().setConflict(conflict);
    render(<ConflictDialog />);
    fireEvent.click(screen.getByTestId('conflict-keep-cloud'));
    expect(resolveConflict).toHaveBeenCalledWith('cloud');
  });

  it('dismisses the dialog when the close button is clicked', () => {
    const conflict: SyncConflict = {
      projectId: 'p1',
      local: makeProject('Local'),
      cloud: makeProject('Cloud'),
    };
    useWorkspaceStore.getState().setConflict(conflict);
    render(<ConflictDialog />);
    fireEvent.click(screen.getByText('✕'));
    expect(useWorkspaceStore.getState().conflict).toBeNull();
  });
});
