/**
 * AssetGrid - grid of draggable asset cards.
 *
 * Each card sets `application/zorron-asset-url` (and `text/plain` fallback) in
 * the DataTransfer so the inspector's UrlField can accept the drop. Clicking a
 * card selects it for the detail panel.
 */

import { memo, type DragEvent } from 'react';
import type { Asset, AssetType } from '@/types/asset';
import { formatFileSize, isLocalAsset } from '@/types/asset';
import { useAssetStore } from '@/stores/assetStore';
import { cn } from '@/lib/utils';

/** Accent color per asset type for the card badge. */
const TYPE_ACCENTS: Record<AssetType, string> = {
  image: '#22d3ee',
  audio: '#a78bfa',
  video: '#fb7185',
  font: '#34d399',
  other: '#94a3b8',
};

/** Inline SVG icon per asset type. */
function TypeIcon({ type }: { type: AssetType }) {
  const accent = TYPE_ACCENTS[type];
  const common = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: accent, strokeWidth: 2 } as const;
  switch (type) {
    case 'image':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      );
    case 'audio':
      return (
        <svg {...common}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'video':
      return (
        <svg {...common}>
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      );
    case 'font':
      return (
        <svg {...common}>
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
      );
  }
}

/** A single asset card. */
function AssetCard({ asset }: { asset: Asset }) {
  const selectedAssetId = useAssetStore((s) => s.selectedAssetId);
  const selectAsset = useAssetStore((s) => s.selectAsset);
  const isSelected = selectedAssetId === asset.id;
  const accent = TYPE_ACCENTS[asset.type];
  const local = isLocalAsset(asset);

  const onDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/zorron-asset-url', asset.url);
    e.dataTransfer.setData('text/plain', asset.url);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={() => selectAsset(asset.id)}
      className={cn(
        'group relative flex cursor-grab flex-col gap-1 rounded-lg border bg-slate-900/50 p-1.5 transition-all hover:border-slate-500/70 hover:bg-slate-800/60 active:cursor-grabbing',
        isSelected ? 'border-cyan-500/70 ring-1 ring-cyan-500/40' : 'border-slate-700/50',
      )}
      title={`${asset.name}\n${asset.mimeType} · ${formatFileSize(asset.size)}`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-slate-950/60">
        {asset.type === 'image' ? (
          <img
            src={asset.url}
            alt={asset.name}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <TypeIcon type={asset.type} />
          </div>
        )}
        <span
          className="absolute left-1 top-1 rounded px-1 py-0.5 text-[9px] font-semibold uppercase"
          style={{ background: `${accent}33`, color: accent }}
        >
          {asset.type}
        </span>
        {local && (
          <span className="absolute right-1 top-1 rounded bg-amber-500/30 px-1 py-0.5 text-[9px] font-semibold text-amber-200">
            local
          </span>
        )}
      </div>
      <p className="truncate text-[11px] text-slate-200">{asset.name}</p>
      <p className="text-[9px] text-slate-500">{formatFileSize(asset.size)}</p>
    </div>
  );
}

/** Props for the AssetGrid. */
export interface AssetGridProps {
  assets: Asset[];
  className?: string;
}

function AssetGridImpl({ assets, className }: AssetGridProps) {
  if (assets.length === 0) {
    return (
      <div className={cn('flex flex-1 items-center justify-center p-6 text-center', className)}>
        <div>
          <p className="text-xs font-medium text-slate-400">No assets</p>
          <p className="mt-1 text-[10px] text-slate-600">
            Upload a file or adjust your filters.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2 overflow-y-auto p-2',
        className,
      )}
    >
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
}

export const AssetGrid = memo(AssetGridImpl);
