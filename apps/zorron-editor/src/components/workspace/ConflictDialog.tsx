/**
 * ConflictDialog - modal for resolving a local-vs-cloud sync conflict.
 *
 * V1 implementation: presents a simple two-choice dialog:
 * - "Keep Local": pushes the local version to the cloud, overwriting it.
 * - "Keep Cloud": replaces the local cache with the cloud version.
 *
 * A future V2 could add a side-by-side diff and manual merge editor.
 *
 * The dialog reads the active conflict from `workspaceStore` and calls
 * `useCloudSync().resolveConflict()` to apply the user's choice.
 */

import { memo, useCallback, useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useCloudSync, type ConflictResolution } from '@/hooks/useCloudSync';
import { cn } from '@/lib/utils';

/** Props for the ConflictDialog. */
export interface ConflictDialogProps {
  /** Whether the dialog is open (defaults to checking the store's conflict). */
  open?: boolean;
  /** Called when the user closes the dialog without resolving. */
  onClose?: () => void;
}

function ConflictDialogImpl({ open, onClose }: ConflictDialogProps) {
  const conflict = useWorkspaceStore((s) => s.conflict);
  const setConflict = useWorkspaceStore((s) => s.setConflict);
  const { resolveConflict } = useCloudSync({ autoSync: false });
  const [resolving, setResolving] = useState(false);

  const isVisible = open ?? conflict !== null;

  const handleResolve = useCallback(
    async (choice: ConflictResolution) => {
      setResolving(true);
      try {
        await resolveConflict(choice);
      } finally {
        setResolving(false);
      }
    },
    [resolveConflict],
  );

  const handleDismiss = useCallback(() => {
    setConflict(null);
    onClose?.();
  }, [onClose, setConflict]);

  if (!isVisible || !conflict) return null;

  const { local, cloud } = conflict;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
      data-testid="conflict-dialog"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-amber-200">
            Sync Conflict Detected
          </h2>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={resolving}
            className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 p-4">
          <p className="text-xs text-slate-400">
            The project <span className="font-medium text-slate-200">{local.title}</span> was
            modified both locally and in the cloud. Choose which version to keep.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Local version card */}
            <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/20 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Local
              </div>
              <dl className="space-y-1 text-[11px] text-slate-300">
                <div>
                  <dt className="inline text-slate-500">Title: </dt>
                  <dd className="inline">{local.title}</dd>
                </div>
                <div>
                  <dt className="inline text-slate-500">Updated: </dt>
                  <dd className="inline">{local.updatedAt}</dd>
                </div>
                <div>
                  <dt className="inline text-slate-500">Nodes: </dt>
                  <dd className="inline">{local.data.nodes.length}</dd>
                </div>
              </dl>
            </div>

            {/* Cloud version card */}
            <div className="rounded-lg border border-cyan-700/40 bg-cyan-900/20 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Cloud
              </div>
              <dl className="space-y-1 text-[11px] text-slate-300">
                <div>
                  <dt className="inline text-slate-500">Title: </dt>
                  <dd className="inline">{cloud.title}</dd>
                </div>
                <div>
                  <dt className="inline text-slate-500">Updated: </dt>
                  <dd className="inline">{cloud.updatedAt}</dd>
                </div>
                <div>
                  <dt className="inline text-slate-500">Nodes: </dt>
                  <dd className="inline">{cloud.data.nodes.length}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-slate-800 px-4 py-3">
          <button
            type="button"
            onClick={() => void handleResolve('local')}
            disabled={resolving}
            className={cn(
              'flex-1 rounded-lg border border-emerald-600/50 bg-emerald-600/20 px-4 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-600/30 disabled:opacity-50',
            )}
            data-testid="conflict-keep-local"
          >
            Keep Local
          </button>
          <button
            type="button"
            onClick={() => void handleResolve('cloud')}
            disabled={resolving}
            className={cn(
              'flex-1 rounded-lg border border-cyan-600/50 bg-cyan-600/20 px-4 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-600/30 disabled:opacity-50',
            )}
            data-testid="conflict-keep-cloud"
          >
            Keep Cloud
          </button>
        </div>
      </div>
    </div>
  );
}

export const ConflictDialog = memo(ConflictDialogImpl);
