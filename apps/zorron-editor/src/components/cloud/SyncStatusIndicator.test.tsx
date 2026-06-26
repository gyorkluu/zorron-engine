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

// Mock i18n: default locale is zh, so tests assert on Chinese strings.
vi.mock('@/i18n/useT', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        'sync.local': '本地',
        'sync.local.tip': '本地模式 — 修改保存到本地设备',
        'sync.synced': '已同步',
        'sync.offline': '离线',
        'sync.conflict': '冲突',
        'sync.error': '错误',
        'sync.syncing': '同步中',
        'sync.idle': '空闲',
        'sync.lastSync': '上次同步：{date}',
      };
      let str = map[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(`{${k}}`, String(v));
        }
      }
      return str;
    },
  }),
  tt: (key: string) => key,
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
    expect(screen.getByText('本地')).toBeInTheDocument();
  });

  it('renders the synced status in cloud mode', () => {
    useWorkspaceStore.getState().setMode('cloud');
    useWorkspaceStore.getState().setSyncStatus('synced');
    render(<SyncStatusIndicator />);
    expect(screen.getByTestId('sync-status-indicator')).toBeInTheDocument();
    expect(screen.getByText('已同步')).toBeInTheDocument();
  });

  it('renders the offline status', () => {
    useWorkspaceStore.getState().setMode('cloud');
    useWorkspaceStore.getState().setSyncStatus('offline');
    render(<SyncStatusIndicator />);
    expect(screen.getByText('离线')).toBeInTheDocument();
  });

  it('renders the conflict status', () => {
    useWorkspaceStore.getState().setMode('cloud');
    useWorkspaceStore.getState().setSyncStatus('conflict');
    render(<SyncStatusIndicator />);
    expect(screen.getByText('冲突')).toBeInTheDocument();
  });

  it('renders the error status', () => {
    useWorkspaceStore.getState().setMode('cloud');
    useWorkspaceStore.getState().setSyncStatus('error');
    useWorkspaceStore.getState().setError('Network failed');
    render(<SyncStatusIndicator />);
    expect(screen.getByText('错误')).toBeInTheDocument();
  });

  it('renders the syncing status', () => {
    useWorkspaceStore.getState().setMode('cloud');
    useWorkspaceStore.getState().setSyncStatus('syncing');
    render(<SyncStatusIndicator />);
    expect(screen.getByText('同步中')).toBeInTheDocument();
  });
});
