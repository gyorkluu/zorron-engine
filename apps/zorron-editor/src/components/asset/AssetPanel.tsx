/**
 * AssetPanel - left panel for asset management.
 *
 * Combines a type filter (All / Image / Audio / Video / Font / Other), a
 * keyword search, the uploader, the asset grid and the detail panel. Wires
 * reference-count rescanning whenever the canvas nodes change.
 */

import { memo, useEffect, useMemo } from 'react';
import { FolderOpen, Image as ImageIcon, Music, Film, Type, FileBox, Search, Plus } from 'lucide-react';
import { useAssetStore, useAllAssets } from '@/stores/assetStore';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import type { AssetType } from '@/types/asset';
import { AssetUploader } from './AssetUploader';
import { AssetGrid } from './AssetGrid';
import { AssetDetail } from './AssetDetail';
import { useT } from '@/i18n/useT';
import type { TranslationKey } from '@/i18n/translations';
import { cn } from '@/lib/utils';

const TYPE_TABS: ReadonlyArray<{
  value: AssetType | undefined;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}> = [
  { value: undefined, labelKey: 'asset.all', icon: FolderOpen, color: 'text-slate-300' },
  { value: 'image', labelKey: 'asset.image', icon: ImageIcon, color: 'text-violet-300' },
  { value: 'audio', labelKey: 'asset.audio', icon: Music, color: 'text-emerald-300' },
  { value: 'video', labelKey: 'asset.video', icon: Film, color: 'text-rose-300' },
  { value: 'font', labelKey: 'asset.font', icon: Type, color: 'text-amber-300' },
  { value: 'other', labelKey: 'asset.other', icon: FileBox, color: 'text-slate-400' },
];

function extractAssetUrls(data: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('blob:'))) {
      urls.push(value);
    } else if (Array.isArray(value)) {
      for (const v of value) visit(v);
    } else if (value && typeof value === 'object') {
      for (const v of Object.values(value as Record<string, unknown>)) visit(v);
    }
  };
  visit(data);
  return urls;
}

export interface AssetPanelProps {
  className?: string;
}

function AssetPanelImpl({ className }: AssetPanelProps) {
  const { t } = useT();
  const allAssets = useAllAssets();
  const typeFilter = useAssetStore((s) => s.typeFilter);
  const keyword = useAssetStore((s) => s.keyword);
  const setTypeFilter = useAssetStore((s) => s.setTypeFilter);
  const setKeyword = useAssetStore((s) => s.setKeyword);
  const fetchAssets = useAssetStore((s) => s.fetchAssets);
  const fetchLocalAssets = useAssetStore((s) => s.fetchLocalAssets);
  const recomputeReferences = useAssetStore((s) => s.recomputeReferences);
  const nodes = useEditorStore((s) => s.nodes);
  const projectId = useProjectStore((s) => s.id);

  useEffect(() => {
    void fetchLocalAssets();
    void fetchAssets();
  }, [fetchLocalAssets, fetchAssets]);

  useEffect(() => {
    if (projectId) void fetchAssets({ projectId });
  }, [projectId, fetchAssets]);

  useEffect(() => {
    const urls: string[] = [];
    for (const node of nodes) {
      urls.push(...extractAssetUrls(node.data as Record<string, unknown>));
    }
    recomputeReferences(urls);
  }, [nodes, recomputeReferences]);

  const filteredAssets = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return allAssets.filter((a) => {
      if (typeFilter && a.type !== typeFilter) return false;
      if (kw && !a.name.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [allAssets, typeFilter, keyword]);

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-r border-slate-800/50 bg-gradient-to-b from-slate-950/80 to-slate-950/40 backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-slate-800/40 px-3 py-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500/20 to-rose-500/10 border border-violet-500/20">
          <FolderOpen size={12} className="text-violet-400" />
        </div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          {t('asset.title')}
        </h2>
        <span className="ml-auto rounded-full bg-slate-800/50 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">
          {allAssets.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-800/40 p-2">
        {TYPE_TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = typeFilter === tab.value;
          return (
            <button
              key={tab.labelKey}
              type="button"
              onClick={() => setTypeFilter(tab.value)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/15 text-cyan-200 border border-cyan-500/20 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent',
              )}
            >
              <TabIcon size={10} className={isActive ? 'text-cyan-300' : tab.color} />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      <div className="border-b border-slate-800/40 p-2">
        <div className="relative">
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('asset.search')}
            className="w-full rounded-md border border-slate-800/60 bg-slate-900/50 py-1.5 pl-7 pr-2 text-xs text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-500/40 focus:bg-slate-900/70 focus:ring-1 focus:ring-cyan-500/20"
          />
        </div>
      </div>

      <div className="p-2">
        <AssetUploader />
      </div>

      <div className="flex-1 overflow-hidden">
        <AssetGrid assets={filteredAssets} className="h-full" />
      </div>

      <AssetDetail />
    </aside>
  );
}

export const AssetPanel = memo(AssetPanelImpl);
