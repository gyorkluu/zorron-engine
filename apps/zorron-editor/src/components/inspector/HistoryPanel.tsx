/**
 * HistoryPanel - P2-5 version history snapshot panel.
 *
 * Lists version snapshots recorded by `projectStore.pushSnapshot` (newest
 * first). Each snapshot can be restored (with confirmation) which loads its
 * nodes/edges into the editor and resets project metadata. The full history
 * can be cleared with a separate confirmation.
 */

import { memo, useCallback } from 'react';
import { useT } from '@/i18n/useT';
import { useProjectStore } from '@/stores/projectStore';
import type { VersionSnapshot } from '@/stores/projectStore';
import { cn } from '@/lib/utils';

/** Props for the HistoryPanel. */
export interface HistoryPanelProps {
  /** Optional class name. */
  className?: string;
}

/**
 * Format an ISO timestamp as a localized short date/time string.
 *
 * @param iso - The ISO timestamp to format.
 * @returns A human-readable date/time string.
 */
function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function HistoryPanelImpl({ className }: HistoryPanelProps) {
  const { t } = useT();
  const history = useProjectStore((s) => s.history);
  const restoreSnapshot = useProjectStore((s) => s.restoreSnapshot);
  const clearHistory = useProjectStore((s) => s.clearHistory);

  /** Restore a snapshot after user confirmation. */
  const handleRestore = useCallback(
    (snapshot: VersionSnapshot) => {
      if (!window.confirm(t('history.confirm'))) return;
      restoreSnapshot(snapshot.id);
    },
    [restoreSnapshot, t],
  );

  /** Clear all snapshots after user confirmation. */
  const handleClear = useCallback(() => {
    if (history.length === 0) return;
    if (!window.confirm(t('history.clearConfirm'))) return;
    clearHistory();
  }, [history.length, clearHistory, t]);

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-sm',
        className,
      )}
      data-testid="history-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <div className="flex flex-col">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            {t('history.title')}
          </h3>
          <span className="text-[10px] text-slate-500">{t('history.tip')}</span>
        </div>
        <button
          type="button"
          onClick={handleClear}
          disabled={history.length === 0}
          className="rounded-md border border-rose-700/50 bg-rose-900/30 px-2 py-1 text-xs text-rose-200 hover:bg-rose-900/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('history.clear')}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {history.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
            {t('history.empty')}
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((snapshot, index) => (
              <li
                key={snapshot.id}
                className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium text-slate-100">
                        {snapshot.label || t('history.snapshot', { n: history.length - index })}
                      </span>
                      {index === 0 && (
                        <span className="rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-[10px] text-cyan-200">
                          {t('history.current')}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {formatTimestamp(snapshot.createdAt)}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {t('history.nodes', { n: snapshot.flowData.nodes.length })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(snapshot)}
                    className="flex-shrink-0 rounded-md bg-cyan-500/20 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/30"
                  >
                    {t('history.restore')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export const HistoryPanel = memo(HistoryPanelImpl);
