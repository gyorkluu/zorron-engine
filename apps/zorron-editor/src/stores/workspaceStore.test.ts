/**
 * Unit tests for the workspace store (Zustand).
 *
 * Tests the state transitions for mode, sync status, conflict and error.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore, type SyncConflict } from './workspaceStore';
import type { ProjectDetail } from '@/types/project';

function makeProject(title: string): ProjectDetail {
  return {
    id: 'p1',
    title,
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
  };
}

describe('workspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().reset();
  });

  it('starts in cloud mode with idle sync status', () => {
    const state = useWorkspaceStore.getState();
    expect(state.mode).toBe('cloud');
    expect(state.syncStatus).toBe('idle');
    expect(state.directoryHandle).toBeNull();
    expect(state.lastSyncedAt).toBeNull();
    expect(state.pendingChangesCount).toBe(0);
    expect(state.conflict).toBeNull();
    expect(state.error).toBeNull();
  });

  it('setMode switches between local and cloud', () => {
    useWorkspaceStore.getState().setMode('local');
    expect(useWorkspaceStore.getState().mode).toBe('local');
    useWorkspaceStore.getState().setMode('cloud');
    expect(useWorkspaceStore.getState().mode).toBe('cloud');
  });

  it('setSyncStatus updates the sync status', () => {
    useWorkspaceStore.getState().setSyncStatus('syncing');
    expect(useWorkspaceStore.getState().syncStatus).toBe('syncing');
    useWorkspaceStore.getState().setSyncStatus('synced');
    expect(useWorkspaceStore.getState().syncStatus).toBe('synced');
    useWorkspaceStore.getState().setSyncStatus('offline');
    expect(useWorkspaceStore.getState().syncStatus).toBe('offline');
  });

  it('setLastSyncedAt stores the timestamp', () => {
    const iso = '2025-06-19T12:00:00.000Z';
    useWorkspaceStore.getState().setLastSyncedAt(iso);
    expect(useWorkspaceStore.getState().lastSyncedAt).toBe(iso);
  });

  it('setPendingChangesCount updates the count', () => {
    useWorkspaceStore.getState().setPendingChangesCount(5);
    expect(useWorkspaceStore.getState().pendingChangesCount).toBe(5);
  });

  it('setConflict stores and clears the conflict', () => {
    const conflict: SyncConflict = {
      projectId: 'p1',
      local: makeProject('Local'),
      cloud: makeProject('Cloud'),
    };
    useWorkspaceStore.getState().setConflict(conflict);
    expect(useWorkspaceStore.getState().conflict).toEqual(conflict);
    useWorkspaceStore.getState().setConflict(null);
    expect(useWorkspaceStore.getState().conflict).toBeNull();
  });

  it('setError stores and clears the error message', () => {
    useWorkspaceStore.getState().setError('Something went wrong');
    expect(useWorkspaceStore.getState().error).toBe('Something went wrong');
    useWorkspaceStore.getState().setError(null);
    expect(useWorkspaceStore.getState().error).toBeNull();
  });

  it('reset restores the initial state', () => {
    useWorkspaceStore.getState().setMode('local');
    useWorkspaceStore.getState().setSyncStatus('error');
    useWorkspaceStore.getState().setPendingChangesCount(3);
    useWorkspaceStore.getState().setError('boom');
    useWorkspaceStore.getState().reset();
    const state = useWorkspaceStore.getState();
    expect(state.mode).toBe('cloud');
    expect(state.syncStatus).toBe('idle');
    expect(state.pendingChangesCount).toBe(0);
    expect(state.error).toBeNull();
  });
});
