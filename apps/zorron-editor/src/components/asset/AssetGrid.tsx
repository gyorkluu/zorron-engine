/**
 * AssetGrid - High-end grid of draggable and interactive asset cards.
 */

import { memo, useState, type DragEvent } from 'react';
import {
  Image as ImageIcon,
  Music,
  Film,
  Type as TypeIcon,
  FileBox,
  HardDrive,
  Sparkles,
  PackageOpen,
  Maximize2,
  Copy,
  Check,
  ArrowRight,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import type { Asset, AssetType } from '@/types/asset';
import { formatFileSize, isLocalAsset } from '@/types/asset';
import { useAssetStore } from '@/stores/assetStore';
import { useEditorStore } from '@/stores/editorStore';
import { useAIImageStore } from '@/stores/aiImageStore';
import { useT } from '@/i18n/useT';
import { cn } from '@/lib/utils';

const TYPE_ACCENTS: Record<AssetType, { bg: string; text: string; border: string }> = {
  image: { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30' },
  audio: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  video: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30' },
  font: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  other: { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30' },
};

const TYPE_ICONS: Record<AssetType, LucideIcon> = {
  image: ImageIcon,
  audio: Music,
  video: Film,
  font: TypeIcon,
  other: FileBox,
};

function AssetCard({
  asset,
  onPreview,
}: {
  asset: Asset;
  onPreview?: (url: string) => void;
}) {
  const { t } = useT();
  const selectedAssetId = useAssetStore((s) => s.selectedAssetId);
  const selectAsset = useAssetStore((s) => s.selectAsset);
  const removeAsset = useAssetStore((s) => s.removeAsset);
  const referenceCounts = useAssetStore((s) => s.referenceCounts);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const applyToActiveNode = useAIImageStore((s) => s.applyToActiveNode);

  const [copied, setCopied] = useState(false);
  const isSelected = selectedAssetId === asset.id;
  const accent = TYPE_ACCENTS[asset.type];
  const TypeIconComponent = TYPE_ICONS[asset.type];
  const local = isLocalAsset(asset);
  const isAiGen = asset.id.startsWith('ai_');
  const refCount = referenceCounts[asset.url] ?? 0;

  const onDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/zorron-asset-url', asset.url);
    e.dataTransfer.setData('text/plain', asset.url);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(asset.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    applyToActiveNode(asset.url);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`确定删除素材「${asset.name}」？`)) {
      void removeAsset(asset.id);
    }
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={() => selectAsset(asset.id)}
      className={cn(
        'group relative flex cursor-grab flex-col gap-1.5 rounded-2xl border bg-slate-900/40 p-2 transition-all duration-200 hover:-translate-y-0.5 active:cursor-grabbing active:scale-[0.98]',
        isSelected
          ? 'border-cyan-500/50 bg-slate-900/80 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/40'
          : 'border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/50 hover:shadow-md',
      )}
      title={`${asset.name}\n${asset.mimeType} · ${formatFileSize(asset.size)}`}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-950/80 border border-slate-800/40">
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
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', accent.bg)}>
              <TypeIconComponent size={16} className={accent.text} />
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
          <span
            className={cn(
              'rounded-md border px-1.5 py-0.5 text-[8px] font-bold uppercase backdrop-blur-sm',
              accent.bg,
              accent.text,
              accent.border,
            )}
          >
            {asset.type}
          </span>
          {isAiGen && (
            <span className="flex items-center gap-0.5 rounded-md border border-purple-500/30 bg-purple-500/20 px-1 py-0.5 text-[8px] font-bold text-purple-200 backdrop-blur-sm">
              <Sparkles size={7} />
              AI
            </span>
          )}
        </div>

        {/* Local / Remote badge */}
        {local && (
          <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-md border border-amber-500/30 bg-amber-500/20 px-1 py-0.5 text-[8px] font-bold text-amber-200 backdrop-blur-sm">
            <HardDrive size={7} />
            本地
          </span>
        )}

        {/* Reference Counter */}
        {refCount > 0 && (
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 backdrop-blur-md">
            引用 x{refCount}
          </span>
        )}

        {/* Hover Quick Actions Overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-slate-950/75 opacity-0 backdrop-blur-xs transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview?.(asset.url);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/90 text-slate-200 hover:border-cyan-400 hover:text-cyan-300 transition-colors"
            title="放大预览"
          >
            <Maximize2 size={12} />
          </button>
          {selectedNodeId && (
            <button
              type="button"
              onClick={handleApply}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/90 text-slate-200 hover:border-indigo-400 hover:text-indigo-300 transition-colors"
              title="设为选中节点背景"
            >
              <ArrowRight size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/90 text-slate-200 hover:border-cyan-400 hover:text-cyan-300 transition-colors"
            title="复制链接"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/90 text-slate-400 hover:border-rose-500 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
            title="删除素材"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Title & File Size */}
      <div className="px-0.5">
        <p className="truncate text-xs font-semibold text-slate-200 group-hover:text-white">
          {asset.name}
        </p>
        <p className="font-mono text-[9px] text-slate-500 mt-0.5">
          {formatFileSize(asset.size)}
        </p>
      </div>
    </div>
  );
}

export interface AssetGridProps {
  assets: Asset[];
  className?: string;
  onPreview?: (url: string) => void;
}

function AssetGridImpl({ assets, className, onPreview }: AssetGridProps) {
  const { t } = useT();

  if (assets.length === 0) {
    return (
      <div className={cn('flex flex-1 flex-col items-center justify-center p-6 text-center', className)}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/30 border border-slate-800/40 mb-3">
          <PackageOpen size={22} className="text-slate-600" />
        </div>
        <p className="text-xs font-semibold text-slate-400">{t('asset.empty')}</p>
        <p className="mt-1 max-w-[180px] text-[10px] leading-relaxed text-slate-500">
          {t('asset.emptyHint')}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2 overflow-y-auto p-2.5 scrollbar-thin',
        className,
      )}
    >
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} onPreview={onPreview} />
      ))}
    </div>
  );
}

export const AssetGrid = memo(AssetGridImpl);
