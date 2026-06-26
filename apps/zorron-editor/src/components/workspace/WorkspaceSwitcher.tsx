/**
 * WorkspaceSwitcher - toggle between local and cloud workspace modes.
 *
 * Renders a segmented control with two options:
 * - "Cloud": saves to the backend API (requires authentication).
 * - "Local": saves to a user-chosen local directory (File System Access API)
 *   or IndexedDB fallback.
 *
 * When switching to local mode, triggers the directory picker. When the
 * File System Access API is unavailable, shows a hint that IndexedDB will
 * be used instead.
 *
 * Feature-flagged: only rendered when `VITE_FEATURE_CLOUD_SYNC` is enabled.
 */

import { memo, useCallback, useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';
import {
  pickLocalDirectory,
  verifyDirectoryPermission,
  type WorkspaceMode,
} from '@/services/workspace.service';
import { featureFlags } from '@/lib/featureFlags';
import { useT } from '@/i18n/useT';
import { cn } from '@/lib/utils';

/** Props for the WorkspaceSwitcher. */
export interface WorkspaceSwitcherProps {
  className?: string;
}

function WorkspaceSwitcherImpl({ className }: WorkspaceSwitcherProps) {
  const { t } = useT();
  const mode = useWorkspaceStore((s) => s.mode);
  const setMode = useWorkspaceStore((s) => s.setMode);
  const directoryHandle = useWorkspaceStore((s) => s.directoryHandle);
  const setDirectoryHandle = useWorkspaceStore((s) => s.setDirectoryHandle);
  const fileSystemAccessSupported = useWorkspaceStore((s) => s.fileSystemAccessSupported);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const handleSwitch = useCallback(
    async (next: WorkspaceMode) => {
      setError(null);
      if (next === mode) return;

      if (next === 'cloud') {
        if (!isAuthenticated) {
          setError(t('ws.cloud.signin'));
          return;
        }
        setMode('cloud');
        return;
      }

      // Switching to local mode.
      setPicking(true);
      try {
        if (fileSystemAccessSupported) {
          // Reuse the existing handle if we still have permission.
          if (directoryHandle) {
            const ok = await verifyDirectoryPermission(directoryHandle, true);
            if (ok) {
              setMode('local');
              return;
            }
          }
          // Otherwise open the picker.
          const handle = await pickLocalDirectory();
          setDirectoryHandle(handle);
          setMode('local');
        } else {
          // IndexedDB fallback: no picker needed.
          setMode('local');
        }
      } catch (err) {
        // The user may have cancelled the picker; stay in the current mode.
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Silent: user cancelled.
        } else {
          setError(err instanceof Error ? err.message : t('ws.local.fail'));
        }
      } finally {
        setPicking(false);
      }
    },
    [
      directoryHandle,
      fileSystemAccessSupported,
      isAuthenticated,
      mode,
      setDirectoryHandle,
      setMode,
      t,
    ],
  );

  // Hide the entire switcher when the cloud-sync feature flag is off.
  if (!featureFlags.cloudSync) return null;

  return (
    <div className={cn('flex flex-col gap-1', className)} data-testid="workspace-switcher">
      <div className="flex rounded-lg border border-slate-700 bg-slate-900/60 p-0.5">
        <button
          type="button"
          onClick={() => void handleSwitch('cloud')}
          disabled={picking || !isAuthenticated}
          className={cn(
            'flex-1 rounded-md px-3 py-1 text-xs font-medium transition-colors',
            mode === 'cloud'
              ? 'bg-cyan-600/30 text-cyan-100'
              : 'text-slate-400 hover:text-slate-200',
            !isAuthenticated && 'cursor-not-allowed opacity-50',
          )}
          title={isAuthenticated ? t('ws.cloud.title') : t('ws.cloud.disabled')}
          data-testid="workspace-mode-cloud"
        >
          {t('ws.cloud')}
        </button>
        <button
          type="button"
          onClick={() => void handleSwitch('local')}
          disabled={picking}
          className={cn(
            'flex-1 rounded-md px-3 py-1 text-xs font-medium transition-colors',
            mode === 'local'
              ? 'bg-emerald-600/30 text-emerald-100'
              : 'text-slate-400 hover:text-slate-200',
          )}
          title={t('ws.local.title')}
          data-testid="workspace-mode-local"
        >
          {t('ws.local')}
        </button>
      </div>
      {mode === 'local' && !fileSystemAccessSupported && (
        <span className="text-[10px] text-amber-300/80">
          {t('ws.local.idb')}
        </span>
      )}
      {mode === 'local' && directoryHandle && (
        <span className="truncate text-[10px] text-slate-400" data-testid="local-dir-name">
          {directoryHandle.name}/
        </span>
      )}
      {error && (
        <span className="text-[10px] text-rose-300" data-testid="workspace-error">
          {error}
        </span>
      )}
    </div>
  );
}

export const WorkspaceSwitcher = memo(WorkspaceSwitcherImpl);
