/**
 * useCloudSync - orchestrates cloud sync, offline detection and conflict
 * resolution for MIG-015.
 *
 * Responsibilities:
 * - Monitor online/offline status via `navigator.onLine` + window events.
 * - Count pending (dirty) cached projects and surface them in the workspace store.
 * - `syncNow()`: push all dirty cached projects to the cloud via `projectService.updateProject`.
 * - `syncProjectToCloud(projectId)`: push a single local project to the cloud
 *   (creates via `importProject` if it doesn't exist yet, otherwise updates).
 * - `detectConflict(projectId)`: compare the local cached copy with the cloud
 *   version and surface a `SyncConflict` when they diverge.
 * - `resolveConflict(choice)`: apply the user's choice (keep-local / keep-cloud).
 *
 * The hook does not own the project data; it reads from `projectStore` and
 * `workspaceDB` and writes back through `projectService`.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useWorkspaceStore, type SyncConflict } from '@/stores/workspaceStore';
import * as projectService from '@/services/project.service';
import {
  getDirtyCachedProjects,
  getCachedProject,
  cacheProject,
  markProjectClean,
  deleteCachedProject,
} from '@/utils/workspaceDB';
import { AppError } from '@/lib/errors';
import type { ProjectDetail } from '@/types/project';

/** User's choice when resolving a sync conflict. */
export type ConflictResolution = 'local' | 'cloud';

/** Options for useCloudSync. */
export interface UseCloudSyncOptions {
  /** Whether to auto-sync dirty projects when connectivity returns. */
  autoSync?: boolean;
  /** Polling interval (ms) for re-checking dirty count. Default 30s. */
  pollIntervalMs?: number;
}

/** Hook return shape. */
export interface UseCloudSyncReturn {
  /** Whether the browser is currently online. */
  isOnline: boolean;
  /** Number of projects with pending local changes. */
  pendingCount: number;
  /** Sync all dirty projects to the cloud now. */
  syncNow: () => Promise<void>;
  /** Push a single local project to the cloud. */
  syncProjectToCloud: (projectId: string) => Promise<ProjectDetail>;
  /** Detect a conflict for a specific project. */
  detectConflict: (projectId: string) => Promise<SyncConflict | null>;
  /** Resolve the active conflict. */
  resolveConflict: (choice: ConflictResolution) => Promise<void>;
}

/**
 * Read the current online status from the browser.
 */
function readOnlineStatus(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Hook that manages cloud sync state and operations.
 */
export function useCloudSync(options: UseCloudSyncOptions = {}): UseCloudSyncReturn {
  const { autoSync = true, pollIntervalMs = 30_000 } = options;

  const setSyncStatus = useWorkspaceStore((s) => s.setSyncStatus);
  const setLastSyncedAt = useWorkspaceStore((s) => s.setLastSyncedAt);
  const setPendingChangesCount = useWorkspaceStore((s) => s.setPendingChangesCount);
  const setConflict = useWorkspaceStore((s) => s.setConflict);
  const setError = useWorkspaceStore((s) => s.setError);
  const pendingCount = useWorkspaceStore((s) => s.pendingChangesCount);

  // Keep an online ref so event handlers can read the latest value.
  const onlineRef = useRef<boolean>(readOnlineStatus());

  /** Refresh the dirty-project count and update the store. */
  const refreshPendingCount = useCallback(async () => {
    try {
      const dirty = await getDirtyCachedProjects();
      setPendingChangesCount(dirty.length);
    } catch {
      // IndexedDB may be unavailable in some environments; ignore.
    }
  }, [setPendingChangesCount]);

  /** Update sync status based on online state + pending count. */
  const updateStatusFromOnline = useCallback(async () => {
    const online = readOnlineStatus();
    onlineRef.current = online;
    if (!online) {
      setSyncStatus('offline');
      return;
    }
    await refreshPendingCount();
    const pending = useWorkspaceStore.getState().pendingChangesCount;
    if (pending > 0) {
      setSyncStatus('syncing');
    } else {
      setSyncStatus('synced');
    }
  }, [refreshPendingCount, setSyncStatus]);

  /** Sync all dirty cached projects to the cloud. */
  const syncNow = useCallback(async () => {
    if (!readOnlineStatus()) {
      setSyncStatus('offline');
      return;
    }
    setSyncStatus('syncing');
    setError(null);
    try {
      const dirty = await getDirtyCachedProjects();
      for (const record of dirty) {
        const { id, detail } = record;
        try {
          // Try to update the existing cloud project.
          const updated = await projectService.updateProject(id, { data: detail.data });
          await cacheProject(updated);
          await markProjectClean(id);
        } catch (err) {
          // If the project doesn't exist on the cloud (404), import it instead.
          if (err instanceof AppError && err.status === 404) {
            const imported = await projectService.importProject({
              data: detail.data,
              title: detail.title,
            });
            // The imported project may have a new id; clean up the old cache entry.
            await deleteCachedProject(id);
            await cacheProject(imported);
          } else {
            throw err;
          }
        }
      }
      setSyncStatus('synced');
      setLastSyncedAt(new Date().toISOString());
      await refreshPendingCount();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      setSyncStatus('error');
    }
  }, [refreshPendingCount, setError, setLastSyncedAt, setSyncStatus]);

  /** Push a single local project to the cloud. */
  const syncProjectToCloud = useCallback(
    async (projectId: string): Promise<ProjectDetail> => {
      const cached = await getCachedProject(projectId);
      if (!cached) {
        throw new Error(`No cached project found for id: ${projectId}`);
      }
      const { detail } = cached;
      try {
        const updated = await projectService.updateProject(projectId, { data: detail.data });
        await cacheProject(updated);
        await markProjectClean(projectId);
        await refreshPendingCount();
        return updated;
      } catch (err) {
        if (err instanceof AppError && err.status === 404) {
          const imported = await projectService.importProject({
            data: detail.data,
            title: detail.title,
          });
          await deleteCachedProject(projectId);
          await cacheProject(imported);
          await refreshPendingCount();
          return imported;
        }
        throw err;
      }
    },
    [refreshPendingCount],
  );

  /** Detect a conflict between the local cache and the cloud version. */
  const detectConflict = useCallback(
    async (projectId: string): Promise<SyncConflict | null> => {
      const cached = await getCachedProject(projectId);
      if (!cached || !cached.dirty) return null;
      try {
        const cloud = await projectService.getProject(projectId);
        // Simple V1 conflict detection: compare updatedAt timestamps.
        // If the cloud was updated after our cache was last refreshed, it's a conflict.
        const cloudUpdated = new Date(cloud.updatedAt).getTime();
        const cacheRefreshed = new Date(cached.cachedAt).getTime();
        if (cloudUpdated > cacheRefreshed) {
          const conflict: SyncConflict = {
            projectId,
            local: cached.detail,
            cloud,
          };
          setConflict(conflict);
          setSyncStatus('conflict');
          return conflict;
        }
        return null;
      } catch {
        // If we can't reach the cloud, there's no conflict to resolve yet.
        return null;
      }
    },
    [setConflict, setSyncStatus],
  );

  /** Resolve the active conflict by keeping local or cloud. */
  const resolveConflict = useCallback(
    async (choice: ConflictResolution): Promise<void> => {
      const active = useWorkspaceStore.getState().conflict;
      if (!active) return;
      try {
        if (choice === 'local') {
          // Push local to cloud, overwriting the cloud version.
          const updated = await projectService.updateProject(active.projectId, {
            data: active.local.data,
          });
          await cacheProject(updated);
          await markProjectClean(active.projectId);
        } else {
          // Keep cloud: replace the local cache with the cloud version.
          await cacheProject(active.cloud);
          await markProjectClean(active.projectId);
        }
        setConflict(null);
        setSyncStatus('synced');
        setLastSyncedAt(new Date().toISOString());
        await refreshPendingCount();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Conflict resolution failed';
        setError(message);
        setSyncStatus('error');
      }
    },
    [refreshPendingCount, setConflict, setError, setLastSyncedAt, setSyncStatus],
  );

  // Listen for online/offline events.
  useEffect(() => {
    const handleOnline = () => {
      onlineRef.current = true;
      void updateStatusFromOnline();
      if (autoSync) {
        void syncNow();
      }
    };
    const handleOffline = () => {
      onlineRef.current = false;
      setSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // Initial status check.
    void updateStatusFromOnline();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSync, setSyncStatus, syncNow, updateStatusFromOnline]);

  // Periodically refresh the pending count.
  useEffect(() => {
    const timer = setInterval(() => {
      void refreshPendingCount();
    }, pollIntervalMs);
    return () => clearInterval(timer);
  }, [pollIntervalMs, refreshPendingCount]);

  return {
    isOnline: onlineRef.current,
    pendingCount,
    syncNow,
    syncProjectToCloud,
    detectConflict,
    resolveConflict,
  };
}
