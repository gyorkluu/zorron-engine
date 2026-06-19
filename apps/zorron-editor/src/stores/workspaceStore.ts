/**
 * Workspace store (Zustand) - tracks the current workspace mode and sync
 * status for MIG-015.
 *
 * Holds:
 * - `mode`: 'local' | 'cloud' (defaults to 'cloud' when authenticated, else 'local').
 * - `directoryHandle`: the File System Access API handle for local mode.
 * - `syncStatus`: the current cloud-sync lifecycle state.
 * - `lastSyncedAt`: ISO timestamp of the last successful sync.
 * - `conflict`: details of an unresolved local-vs-cloud conflict.
 *
 * The store does NOT perform I/O itself; it only holds state. The
 * `useCloudSync` hook orchestrates the actual sync operations.
 */

import { create } from 'zustand';
import type { ProjectDetail } from '@/types/project';
import type { WorkspaceMode } from '@/services/workspace.service';

/** Cloud sync lifecycle status shown in the toolbar indicator. */
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'error';

/** Details of a local-vs-cloud conflict (V1: simple overwrite choice). */
export interface SyncConflict {
  /** Project id. */
  projectId: string;
  /** Local project snapshot (may be a dirty cached copy). */
  local: ProjectDetail;
  /** Cloud project snapshot (fresh from the server). */
  cloud: ProjectDetail;
}

/** Workspace store state shape. */
interface WorkspaceState {
  /** Current workspace mode. */
  mode: WorkspaceMode;
  /** Directory handle for local mode (null in cloud mode or before picker). */
  directoryHandle: FileSystemDirectoryHandle | null;
  /** Whether the File System Access API is available. */
  fileSystemAccessSupported: boolean;
  /** Current cloud-sync status. */
  syncStatus: SyncStatus;
  /** ISO timestamp of the last successful sync. */
  lastSyncedAt: string | null;
  /** Number of projects with pending local changes. */
  pendingChangesCount: number;
  /** Active conflict awaiting user resolution (null if none). */
  conflict: SyncConflict | null;
  /** Error message from the last failed sync. */
  error: string | null;

  // Actions
  setMode: (mode: WorkspaceMode) => void;
  setDirectoryHandle: (handle: FileSystemDirectoryHandle | null) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setLastSyncedAt: (iso: string | null) => void;
  setPendingChangesCount: (count: number) => void;
  setConflict: (conflict: SyncConflict | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

/** Initial state values. */
const INITIAL: Pick<
  WorkspaceState,
  | 'mode'
  | 'directoryHandle'
  | 'syncStatus'
  | 'lastSyncedAt'
  | 'pendingChangesCount'
  | 'conflict'
  | 'error'
> = {
  mode: 'cloud',
  directoryHandle: null,
  syncStatus: 'idle',
  lastSyncedAt: null,
  pendingChangesCount: 0,
  conflict: null,
  error: null,
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  ...INITIAL,
  fileSystemAccessSupported:
    typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function',

  setMode: (mode) => set({ mode }),
  setDirectoryHandle: (directoryHandle) => set({ directoryHandle }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setPendingChangesCount: (pendingChangesCount) => set({ pendingChangesCount }),
  setConflict: (conflict) => set({ conflict }),
  setError: (error) => set({ error }),
  reset: () => set({ ...INITIAL }),
}));
