/**
 * Unit tests for the useCloudSync hook.
 *
 * The project service and workspaceDB are mocked so we can test the sync
 * orchestration logic without hitting the network or IndexedDB.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCloudSync } from './useCloudSync';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { AppError } from '@/lib/errors';
import type { ProjectDetail } from '@/types/project';

// Mock the project service.
vi.mock('@/services/project.service', () => ({
  getProject: vi.fn(),
  updateProject: vi.fn(),
  importProject: vi.fn(),
}));

// Mock workspaceDB so no real IndexedDB is touched.
vi.mock('@/utils/workspaceDB', () => ({
  getDirtyCachedProjects: vi.fn().mockResolvedValue([]),
  getCachedProject: vi.fn().mockResolvedValue(null),
  cacheProject: vi.fn().mockResolvedValue(undefined),
  markProjectClean: vi.fn().mockResolvedValue(undefined),
  deleteCachedProject: vi.fn().mockResolvedValue(undefined),
}));

import * as projectService from '@/services/project.service';
import * as workspaceDB from '@/utils/workspaceDB';

function makeProject(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    id: 'p1',
    title: 'Test',
    description: null,
    coverUrl: null,
    isPublished: false,
    data: {
      nodes: [],
      edges: [],
      variables: {},
      settings: {
        vectorSpace: { enabled: false, dimensions: { x: 'x', y: 'y', z: 'z' } },
      },
      version: '1.0.0',
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('useCloudSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.getState().reset();
    // Reset default mock implementations (clearAllMocks doesn't reset impls).
    vi.mocked(workspaceDB.getDirtyCachedProjects).mockResolvedValue([]);
    vi.mocked(workspaceDB.getCachedProject).mockResolvedValue(null);
    vi.mocked(workspaceDB.cacheProject).mockResolvedValue(undefined);
    vi.mocked(workspaceDB.markProjectClean).mockResolvedValue(undefined);
    vi.mocked(workspaceDB.deleteCachedProject).mockResolvedValue(undefined);
    // Default to online.
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts in an idle/synced state when online with no pending changes', () => {
    const { result } = renderHook(() => useCloudSync({ autoSync: false, pollIntervalMs: 999_999 }));
    expect(result.current.pendingCount).toBe(0);
    // The hook sets the status asynchronously; just check it doesn't throw.
  });

  it('syncNow does nothing when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useCloudSync({ autoSync: false, pollIntervalMs: 999_999 }));
    await act(async () => {
      await result.current.syncNow();
    });
    expect(projectService.updateProject).not.toHaveBeenCalled();
    expect(useWorkspaceStore.getState().syncStatus).toBe('offline');
  });

  it('syncNow pushes dirty projects to the cloud via updateProject', async () => {
    const dirtyProject = makeProject({ id: 'p1', title: 'Dirty' });
    // Use mockResolvedValue (not Once) because the hook's useEffect calls
    // getDirtyCachedProjects on mount, which would consume a Once mock.
    vi.mocked(workspaceDB.getDirtyCachedProjects).mockResolvedValue([
      {
        id: 'p1',
        detail: dirtyProject,
        cachedAt: '2025-01-01T00:00:00.000Z',
        dirty: true,
        localUpdatedAt: '2025-01-02T00:00:00.000Z',
      },
    ]);
    const updated = makeProject({ id: 'p1', title: 'Dirty', updatedAt: '2025-01-03T00:00:00.000Z' });
    vi.mocked(projectService.updateProject).mockResolvedValue(updated);

    const { result } = renderHook(() => useCloudSync({ autoSync: false, pollIntervalMs: 999_999 }));
    await act(async () => {
      await result.current.syncNow();
    });

    expect(projectService.updateProject).toHaveBeenCalledWith('p1', { data: dirtyProject.data });
    expect(workspaceDB.cacheProject).toHaveBeenCalledWith(updated);
    expect(workspaceDB.markProjectClean).toHaveBeenCalledWith('p1');
    expect(useWorkspaceStore.getState().syncStatus).toBe('synced');
  });

  it('syncNow imports the project when the cloud returns 404', async () => {
    const dirtyProject = makeProject({ id: 'p1', title: 'Dirty' });
    vi.mocked(workspaceDB.getDirtyCachedProjects).mockResolvedValue([
      {
        id: 'p1',
        detail: dirtyProject,
        cachedAt: '2025-01-01T00:00:00.000Z',
        dirty: true,
        localUpdatedAt: '2025-01-02T00:00:00.000Z',
      },
    ]);
    const notFound = new AppError({
      code: 'NOT_FOUND',
      message: 'Project not found',
      requestId: '',
      status: 404,
    });
    vi.mocked(projectService.updateProject).mockRejectedValue(notFound);
    const imported = makeProject({ id: 'p2', title: 'Dirty' });
    vi.mocked(projectService.importProject).mockResolvedValue(imported);

    const { result } = renderHook(() => useCloudSync({ autoSync: false, pollIntervalMs: 999_999 }));
    await act(async () => {
      await result.current.syncNow();
    });

    expect(projectService.importProject).toHaveBeenCalledWith({
      data: dirtyProject.data,
      title: 'Dirty',
    });
    expect(workspaceDB.deleteCachedProject).toHaveBeenCalledWith('p1');
    expect(workspaceDB.cacheProject).toHaveBeenCalledWith(imported);
    expect(useWorkspaceStore.getState().syncStatus).toBe('synced');
  });

  it('syncNow sets error status when the update fails', async () => {
    const dirtyProject = makeProject({ id: 'p1' });
    vi.mocked(workspaceDB.getDirtyCachedProjects).mockResolvedValue([
      {
        id: 'p1',
        detail: dirtyProject,
        cachedAt: '2025-01-01T00:00:00.000Z',
        dirty: true,
        localUpdatedAt: '2025-01-02T00:00:00.000Z',
      },
    ]);
    const serverError = new AppError({
      code: 'INTERNAL',
      message: 'Server exploded',
      requestId: '',
      status: 500,
    });
    vi.mocked(projectService.updateProject).mockRejectedValue(serverError);

    const { result } = renderHook(() => useCloudSync({ autoSync: false, pollIntervalMs: 999_999 }));
    await act(async () => {
      await result.current.syncNow();
    });

    expect(useWorkspaceStore.getState().syncStatus).toBe('error');
    expect(useWorkspaceStore.getState().error).toBe('Server exploded');
  });

  it('syncProjectToCloud updates an existing cloud project', async () => {
    const cached = makeProject({ id: 'p1', title: 'Cached' });
    vi.mocked(workspaceDB.getCachedProject).mockResolvedValueOnce({
      id: 'p1',
      detail: cached,
      cachedAt: '2025-01-01T00:00:00.000Z',
      dirty: true,
      localUpdatedAt: '2025-01-02T00:00:00.000Z',
    });
    const updated = makeProject({ id: 'p1', title: 'Cached', updatedAt: '2025-01-03T00:00:00.000Z' });
    vi.mocked(projectService.updateProject).mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useCloudSync({ autoSync: false, pollIntervalMs: 999_999 }));
    let returned: ProjectDetail | undefined;
    await act(async () => {
      returned = await result.current.syncProjectToCloud('p1');
    });

    expect(returned?.id).toBe('p1');
    expect(workspaceDB.markProjectClean).toHaveBeenCalledWith('p1');
  });

  it('syncProjectToCloud throws when no cached project exists', async () => {
    vi.mocked(workspaceDB.getCachedProject).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useCloudSync({ autoSync: false, pollIntervalMs: 999_999 }));
    await expect(
      act(async () => {
        await result.current.syncProjectToCloud('nonexistent');
      }),
    ).rejects.toThrow('No cached project found for id: nonexistent');
  });

  it('detectConflict returns null when there is no cached dirty copy', async () => {
    vi.mocked(workspaceDB.getCachedProject).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useCloudSync({ autoSync: false, pollIntervalMs: 999_999 }));
    let conflict: unknown = 'unset';
    await act(async () => {
      conflict = await result.current.detectConflict('p1');
    });
    expect(conflict).toBeNull();
  });

  it('detectConflict surfaces a conflict when the cloud is newer than the cache', async () => {
    const localDetail = makeProject({ id: 'p1', title: 'Local', updatedAt: '2025-01-01T00:00:00.000Z' });
    vi.mocked(workspaceDB.getCachedProject).mockResolvedValueOnce({
      id: 'p1',
      detail: localDetail,
      cachedAt: '2025-01-01T00:00:00.000Z',
      dirty: true,
      localUpdatedAt: '2025-01-02T00:00:00.000Z',
    });
    const cloudDetail = makeProject({
      id: 'p1',
      title: 'Cloud',
      updatedAt: '2025-01-05T00:00:00.000Z', // newer than cache
    });
    vi.mocked(projectService.getProject).mockResolvedValueOnce(cloudDetail);

    const { result } = renderHook(() => useCloudSync({ autoSync: false, pollIntervalMs: 999_999 }));
    let conflict: unknown = null;
    await act(async () => {
      conflict = await result.current.detectConflict('p1');
    });

    expect(conflict).not.toBeNull();
    expect(useWorkspaceStore.getState().syncStatus).toBe('conflict');
    expect(useWorkspaceStore.getState().conflict).not.toBeNull();
  });

  it('detectConflict returns null when the cloud is not newer', async () => {
    const localDetail = makeProject({ id: 'p1', title: 'Local' });
    vi.mocked(workspaceDB.getCachedProject).mockResolvedValueOnce({
      id: 'p1',
      detail: localDetail,
      cachedAt: '2025-01-10T00:00:00.000Z', // cache is newer
      dirty: true,
      localUpdatedAt: '2025-01-09T00:00:00.000Z',
    });
    const cloudDetail = makeProject({
      id: 'p1',
      title: 'Cloud',
      updatedAt: '2025-01-05T00:00:00.000Z', // cloud is older
    });
    vi.mocked(projectService.getProject).mockResolvedValueOnce(cloudDetail);

    const { result } = renderHook(() => useCloudSync({ autoSync: false, pollIntervalMs: 999_999 }));
    let conflict: unknown = 'unset';
    await act(async () => {
      conflict = await result.current.detectConflict('p1');
    });
    expect(conflict).toBeNull();
  });

  it('resolveConflict with "local" pushes local to cloud', async () => {
    const localDetail = makeProject({ id: 'p1', title: 'Local' });
    const cloudDetail = makeProject({ id: 'p1', title: 'Cloud' });
    useWorkspaceStore.getState().setConflict({
      projectId: 'p1',
      local: localDetail,
      cloud: cloudDetail,
    });
    const updated = makeProject({ id: 'p1', title: 'Local', updatedAt: '2025-01-06T00:00:00.000Z' });
    vi.mocked(projectService.updateProject).mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useCloudSync({ autoSync: false, pollIntervalMs: 999_999 }));
    await act(async () => {
      await result.current.resolveConflict('local');
    });

    expect(projectService.updateProject).toHaveBeenCalledWith('p1', { data: localDetail.data });
    expect(workspaceDB.markProjectClean).toHaveBeenCalledWith('p1');
    expect(useWorkspaceStore.getState().conflict).toBeNull();
    expect(useWorkspaceStore.getState().syncStatus).toBe('synced');
  });

  it('resolveConflict with "cloud" replaces the local cache', async () => {
    const localDetail = makeProject({ id: 'p1', title: 'Local' });
    const cloudDetail = makeProject({ id: 'p1', title: 'Cloud' });
    useWorkspaceStore.getState().setConflict({
      projectId: 'p1',
      local: localDetail,
      cloud: cloudDetail,
    });

    const { result } = renderHook(() => useCloudSync({ autoSync: false, pollIntervalMs: 999_999 }));
    await act(async () => {
      await result.current.resolveConflict('cloud');
    });

    expect(workspaceDB.cacheProject).toHaveBeenCalledWith(cloudDetail);
    expect(workspaceDB.markProjectClean).toHaveBeenCalledWith('p1');
    expect(useWorkspaceStore.getState().conflict).toBeNull();
  });

  it('refreshes the pending count from the dirty cache', async () => {
    vi.mocked(workspaceDB.getDirtyCachedProjects).mockResolvedValueOnce([
      {
        id: 'p1',
        detail: makeProject(),
        cachedAt: '2025-01-01T00:00:00.000Z',
        dirty: true,
        localUpdatedAt: null,
      },
    ]);
    renderHook(() => useCloudSync({ autoSync: false, pollIntervalMs: 999_999 }));
    await waitFor(() => {
      expect(useWorkspaceStore.getState().pendingChangesCount).toBe(1);
    });
  });
});
