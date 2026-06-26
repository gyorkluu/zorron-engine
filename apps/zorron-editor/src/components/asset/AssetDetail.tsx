/**
 * AssetDetail - detail panel for the currently selected asset.
 *
 * Shows a preview, metadata, reference count (scanned from node data) and a
 * delete button with confirmation.
 */

import { memo, useState } from 'react';
import { useAssetStore } from '@/stores/assetStore';
import { formatFileSize, isLocalAsset } from '@/types/asset';
import { useT } from '@/i18n/useT';
import { cn } from '@/lib/utils';

/** Props for the AssetDetail. */
export interface AssetDetailProps {
  className?: string;
}

function AssetDetailImpl({ className }: AssetDetailProps) {
  const { t } = useT();
  const selectedAssetId = useAssetStore((s) => s.selectedAssetId);
  const assets = useAssetStore((s) => s.assets);
  const localAssets = useAssetStore((s) => s.localAssets);
  const referenceCounts = useAssetStore((s) => s.referenceCounts);
  const removeAsset = useAssetStore((s) => s.removeAsset);
  const selectAsset = useAssetStore((s) => s.selectAsset);
  const [confirming, setConfirming] = useState(false);

  const asset = [...assets, ...localAssets].find((a) => a.id === selectedAssetId) ?? null;

  if (!asset) {
    return (
      <div className={cn('flex items-center justify-center p-4 text-center', className)}>
        <p className="text-[10px] text-slate-600">{t('asset.selectHint')}</p>
      </div>
    );
  }

  const refCount = referenceCounts[asset.url] ?? 0;
  const local = isLocalAsset(asset);

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    try {
      await removeAsset(asset.id);
      selectAsset(null);
    } catch {
      // Error surfaced via store.error.
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-2 border-t border-slate-800/60 p-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {t('asset.details')}
        </span>
        <button
          type="button"
          onClick={() => selectAsset(null)}
          className="text-[10px] text-slate-500 hover:text-slate-300"
          aria-label={t('asset.close')}
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-slate-700 bg-slate-950/60">
          {asset.type === 'image' ? (
            <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
              {asset.type}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-100">{asset.name}</p>
          <p className="truncate text-[10px] text-slate-500">{asset.mimeType}</p>
          <p className="text-[10px] text-slate-500">{formatFileSize(asset.size)}</p>
          <div className="mt-0.5 flex gap-1">
            <span
              className={cn(
                'rounded px-1 py-0.5 text-[9px] font-semibold uppercase',
                local ? 'bg-amber-500/30 text-amber-200' : 'bg-cyan-500/20 text-cyan-200',
              )}
            >
              {local ? t('asset.local') : t('asset.remote')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/40 px-2 py-1">
        <span className="text-[10px] text-slate-400">{t('asset.references')}</span>
        <span
          className={cn(
            'text-xs font-semibold',
            refCount > 0 ? 'text-emerald-400' : 'text-slate-500',
          )}
        >
          {refCount}
        </span>
      </div>

      <div className="truncate rounded-md border border-slate-800 bg-slate-900/40 px-2 py-1">
        <span className="text-[9px] uppercase text-slate-500">{t('asset.url')}</span>
        <p className="truncate font-mono text-[10px] text-slate-400">{asset.url}</p>
      </div>

      <button
        type="button"
        onClick={handleDelete}
        className={cn(
          'mt-1 w-full rounded-md border px-2 py-1.5 text-xs transition-colors',
          confirming
            ? 'border-rose-600 bg-rose-600/30 text-rose-100 hover:bg-rose-600/50'
            : 'border-rose-700/50 bg-rose-900/20 text-rose-200 hover:bg-rose-900/40',
        )}
      >
        {confirming ? t('asset.confirm') : t('asset.delete')}
      </button>
      {confirming && (
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="w-full rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
        >
          {t('asset.cancel')}
        </button>
      )}
    </div>
  );
}

export const AssetDetail = memo(AssetDetailImpl);
