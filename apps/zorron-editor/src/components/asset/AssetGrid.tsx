/**
 * AssetGrid - grid of draggable asset cards.
 */

import { memo, type DragEvent } from 'react';
import {
  Image as ImageIcon,
  Music,
  Film,
  Type as TypeIcon,
  FileBox,
  HardDrive,
  PackageOpen,
  type LucideIcon,
} from 'lucide-react';
import type { Asset, AssetType } from '@/types/asset';
import { formatFileSize, isLocalAsset } from '@/types/asset';
import { useAssetStore } from '@/stores/assetStore';
import { useT } from '@/i18n/useT';
import { cn } from '@/lib/utils';

const TYPE_ACCENTS: Record<AssetType, { bg: string; text: string; border: string }> = {
  image: { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/25' },
  audio: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/25' },
  video: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/25' },
  font: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/25' },
  other: { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/25' },
};

const TYPE_ICONS: Record<AssetType, LucideIcon> = {
  image: ImageIcon,
  audio: Music,
  video: Film,
  font: TypeIcon,
  other: FileBox,
};

function AssetCard({ asset }: { asset: Asset }) {
  const { t } = useT();
  const selectedAssetId = useAssetStore((s) => s.selectedAssetId);
  const selectAsset = useAssetStore((s) => s.selectAsset);
  const isSelected = selectedAssetId === asset.id;
  const accent = TYPE_ACCENTS[asset.type];
  const TypeIconComponent = TYPE_ICONS[asset.type];
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
        'group relative flex cursor-grab flex-col gap-1 rounded-xl border bg-slate-900/40 p-1.5 transition-all duration-200 hover:-translate-y-0.5 active:cursor-grabbing active:scale-[0.98]',
        isSelected
          ? 'border-cyan-500/50 bg-slate-900/70 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
          : 'border-slate-800/50 hover:border-slate-600/50 hover:bg-slate-800/50',
      )}
      title={`${asset.name}\n${asset.mimeType} · ${formatFileSize(asset.size)}`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-950/60">
        {asset.type === 'image' ? (
          <img
            src={asset.url}
            alt={asset.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accent.bg)}>
              <TypeIconComponent size={14} className={accent.text} />
            </div>
          </div>
        )}
        <span
          className={cn('absolute left-1 top-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase', accent.bg, accent.text, accent.border)}
        >
          {asset.type}
        </span>
        {local && (
          <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded-md border border-amber-500/30 bg-amber-500/20 px-1 py-0.5 text-[8px] font-bold text-amber-200">
            <HardDrive size={7} />
            {t('asset.local')}
          </span>
        )}
      </div>
      <p className="truncate px-0.5 text-[11px] font-medium text-slate-200">{asset.name}</p>
      <p className="px-0.5 text-[9px] text-slate-500">{formatFileSize(asset.size)}</p>
    </div>
  );
}

export interface AssetGridProps {
  assets: Asset[];
  className?: string;
}

function AssetGridImpl({ assets, className }: AssetGridProps) {
  const { t } = useT();
  if (assets.length === 0) {
    return (
      <div className={cn('flex flex-1 flex-col items-center justify-center p-6 text-center', className)}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/30 border border-slate-800/40 mb-3">
          <PackageOpen size={24} className="text-slate-600" />
        </div>
        <p className="text-sm font-semibold text-slate-400">{t('asset.empty')}</p>
        <p className="mt-1 max-w-[180px] text-[11px] leading-relaxed text-slate-600">
          {t('asset.emptyHint')}
        </p>
      </div>
    );
  }
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2 overflow-y-auto p-2 scrollbar-thin',
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
