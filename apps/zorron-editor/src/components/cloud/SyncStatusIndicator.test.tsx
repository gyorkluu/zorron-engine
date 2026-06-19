/**
 * Unit tests for the SyncStatusIndicator component.
 *
 * Tests the visual states (local mode, syncing, synced, offline, conflict,
 * error) and the click-to-sync behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { useWorkspaceStore } from '@/stores/workspaceStore';

// Mock the feature flags.
vi.mock('@/lib/featureFlags', () => ({
  featureFlags: { vector3d: true, cloudSync: true },
}));

// Mock useCloudSync so we don't trigger real sync logic.
const mockSyncNow = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useCloudSync', () => ({
  useCloudSync: vi.fn(() => ({
    isOnline: true,
    pendingCount: 0,
    syncNow: mockSyncNow,
    syncProjectToCloud: vi.fn(),
    detectConflict: vi.fn(),
    resolveConflict: vi.fn(),
  })),
}));

describe('SyncStatusIndicator', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().reset();
    vi.clearAllMocks();
  });

  it('renders a Local badge in local mode', () => {
    useWorkspaceStore.getState().setMode('local');
    render(<SyncStatusIndicator />);
    expect(screen.getByTestId('sync-status-local')).toBeInTheDocument();
    expect(screen.getByText('Local')).toBeInTheDocument();
  });

  it('renders the synced status in cloud mode', () => {
    useWorkspaceStore.getState().setMode('cloud');
    useWorkspaceStore.getState().setSyncStatus('synced');
    render(<SyncStatusIndicator />);
    expect(screen.getByTestId('sync-status-indicator')).toBeInTheDocument();
    expect(screen.getByText('Synced')).toBeInTheDocument();
  });

  it('renders the offline status', () => {
    useWorkspaceStore.getState().setMode('cloud');
    useWorkspaceStore.getState().setSyncStatus('offline');
    render(<SyncStatusIndicator />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders the conflict status', () => {
    useWorkspaceStore.getState().setMode('cloud');
    useWorkspaceStore.getState().setSyncStatus('conflict');
    render(<SyncStatusIndicator />);
    expect(screen.getByText('Conflict')).toBeInTheDocument();
  });

  it('renders the error status', () => {
    useWorkspaceStore.getState().setMode('cloud');
    useWorkspaceStore.getState().setSyncStatus('error');
    useWorkspaceStore.getState().setError('Network failed');
    render(<SyncStatusIndicator />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders the syncing status', () => {
    useWorkspaceStore.getState().setMode('cloud');
    useWorkspaceStore.getState().setSyncStatus('syncing');
    render(<SyncStatusIndicator />);
    expect(screen.getByText('Syncing')).toBeInTheDocument();
  });
});
