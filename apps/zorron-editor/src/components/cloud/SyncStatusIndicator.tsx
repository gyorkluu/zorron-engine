/**
 * SyncStatusIndicator - compact badge shown in the editor toolbar.
 *
 * Displays the current cloud-sync status (idle / syncing / synced / offline /
 * conflict / error) and the number of pending local changes. Clicking the
 * badge when there are pending changes triggers an immediate sync.
 *
 * Feature-flagged: only rendered when `VITE_FEATURE_CLOUD_SYNC` is enabled.
 * In local mode, shows a "Local" badge instead of the sync status.
 */

import { memo, useCallback } from 'react';
import { useWorkspaceStore, type SyncStatus } from '@/stores/workspaceStore';
import { useCloudSync } from '@/hooks/useCloudSync';
import { featureFlags } from '@/lib/featureFlags';
import { useT } from '@/i18n/useT';
import type { TranslationKey } from '@/i18n/translations';
import { cn } from '@/lib/utils';

/** Visual config per sync status. */
const STATUS_CONFIG: Record<
  SyncStatus,
  { labelKey: TranslationKey; dot: string; text: string; bg: string }
> = {
  idle: {
    labelKey: 'sync.idle',
    dot: 'bg-slate-400',
    text: 'text-slate-300',
    bg: 'bg-slate-500/10',
  },
  syncing: {
    labelKey: 'sync.syncing',
    dot: 'bg-amber-400 animate-pulse',
    text: 'text-amber-200',
    bg: 'bg-amber-500/10',
  },
  synced: {
    labelKey: 'sync.synced',
    dot: 'bg-emerald-400',
    text: 'text-emerald-200',
    bg: 'bg-emerald-500/10',
  },
  offline: {
    labelKey: 'sync.offline',
    dot: 'bg-slate-500',
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
  },
  conflict: {
    labelKey: 'sync.conflict',
    dot: 'bg-rose-400',
    text: 'text-rose-200',
    bg: 'bg-rose-500/10',
  },
  error: {
    labelKey: 'sync.error',
    dot: 'bg-rose-500',
    text: 'text-rose-200',
    bg: 'bg-rose-500/10',
  },
};

/** Props for the SyncStatusIndicator. */
export interface SyncStatusIndicatorProps {
  className?: string;
}

function SyncStatusIndicatorImpl({ className }: SyncStatusIndicatorProps) {
  const { t } = useT();
  const mode = useWorkspaceStore((s) => s.mode);
  const syncStatus = useWorkspaceStore((s) => s.syncStatus);
  const lastSyncedAt = useWorkspaceStore((s) => s.lastSyncedAt);
  const error = useWorkspaceStore((s) => s.error);
  const { pendingCount, syncNow } = useCloudSync({ autoSync: true, pollIntervalMs: 30_000 });

  const handleClick = useCallback(() => {
    if (pendingCount > 0) {
      void syncNow();
    }
  }, [pendingCount, syncNow]);

  // Feature flag off: render nothing.
  if (!featureFlags.cloudSync) return null;

  // Local mode: show a static "Local" badge.
  if (mode === 'local') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
          'bg-emerald-500/10 text-emerald-300',
          className,
        )}
        data-testid="sync-status-local"
        title={t('sync.local.tip')}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {t('sync.local')}
      </span>
    );
  }

  const config = STATUS_CONFIG[syncStatus] ?? STATUS_CONFIG.idle;
  const tooltip = error
    ? error
    : lastSyncedAt
      ? t('sync.lastSync', { date: new Date(lastSyncedAt).toLocaleString() })
      : t(config.labelKey);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pendingCount === 0 || syncStatus === 'syncing'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
        config.bg,
        config.text,
        pendingCount > 0 && syncStatus !== 'syncing' && 'cursor-pointer hover:opacity-80',
        (pendingCount === 0 || syncStatus === 'syncing') && 'cursor-default',
        className,
      )}
      title={tooltip}
      data-testid="sync-status-indicator"
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {t(config.labelKey)}
      {pendingCount > 0 && (
        <span className="ml-0.5 rounded-full bg-slate-700/60 px-1 text-[9px]">
          {pendingCount}
        </span>
      )}
    </button>
  );
}

export const SyncStatusIndicator = memo(SyncStatusIndicatorImpl);
