/**
 * AssetPanel - Modern AI Content Editor Asset Library Panel for Zorron Engine.
 *
 * References mainstream modern AI creative tools (ComfyUI / Midjourney / CapCut):
 *  1. Dual Tab Architecture:
 *     - 📁 项目资源 (Project Assets): Category chips, search, drag & drop uploader, responsive cards.
 *     - ✨ AI 创作工坊 (AI Studio): Prompt engineering with Jimeng AI, style presets, aspect ratio, rembg.
 *  2. Full-screen Lightbox viewer with one-click canvas background binding.
 *  3. Seamless offline / local IndexedDB persistence with zero jarring error banners.
 */

import { memo, useEffect, useMemo, useState } from 'react';
import {
  FolderOpen,
  Image as ImageIcon,
  Music,
  Film,
  Type,
  FileBox,
  Search,
  Sparkles,
  Layers,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAssetStore, useAllAssets } from '@/stores/assetStore';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import type { AssetType } from '@/types/asset';
import { AssetUploader } from './AssetUploader';
import { AssetGrid } from './AssetGrid';
import { AssetDetail } from './AssetDetail';
import { AIStudioTab } from './AIStudioTab';
import { AssetLightbox } from './AssetLightbox';
import { useT } from '@/i18n/useT';
import type { TranslationKey } from '@/i18n/translations';
import { cn } from '@/lib/utils';

type ActiveTab = 'library' | 'studio';

const TYPE_TABS: ReadonlyArray<{
  value: AssetType | undefined;
  labelKey: TranslationKey;
  icon: LucideIcon;
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
  const activeTab = useAssetStore((s) => s.activeTab);
  const setActiveTab = useAssetStore((s) => s.setActiveTab);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
        'flex h-full w-72 flex-col border-r border-slate-800/60 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-slate-950/40 backdrop-blur-xl select-none',
        className,
      )}
    >
      {/* Top Segmented Navigation Tab */}
      <div className="border-b border-slate-800/50 p-2 bg-slate-950/60">
        <div className="grid grid-cols-2 rounded-xl bg-slate-900/80 p-1 border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all',
              activeTab === 'library'
                ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-200 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 border border-transparent',
            )}
          >
            <FolderOpen size={13} className={activeTab === 'library' ? 'text-cyan-400' : ''} />
            <span>{t('asset.tab.library')}</span>
            <span className="ml-1 rounded-full bg-slate-800 px-1.5 py-0.2 font-mono text-[9px] text-slate-400">
              {allAssets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all',
              activeTab === 'studio'
                ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-purple-200 shadow-sm border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200 border border-transparent',
            )}
          >
            <Sparkles size={13} className={activeTab === 'studio' ? 'text-purple-400 animate-pulse' : ''} />
            <span>{t('asset.tab.studio')}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Project Assets Library */}
      {activeTab === 'library' && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Category Filter Chips */}
          <div className="flex gap-1 overflow-x-auto border-b border-slate-800/40 px-2.5 py-2 scrollbar-none">
            {TYPE_TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = typeFilter === tab.value;
              return (
                <button
                  key={tab.labelKey}
                  type="button"
                  onClick={() => setTypeFilter(tab.value)}
                  className={cn(
                    'flex-shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-all',
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent',
                  )}
                >
                  <TabIcon size={11} className={isActive ? 'text-cyan-300' : tab.color} />
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="border-b border-slate-800/40 p-2.5">
            <div className="relative">
              <Search
                size={12}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t('asset.search')}
                className="w-full rounded-lg border border-slate-800/80 bg-slate-900/60 py-1.5 pl-7 pr-7 text-xs text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-cyan-500/40 focus:bg-slate-900/90 focus:ring-1 focus:ring-cyan-500/20"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="p-2.5">
            <AssetUploader />
          </div>

          {/* Asset Grid */}
          <div className="flex-1 overflow-hidden">
            <AssetGrid
              assets={filteredAssets}
              className="h-full"
              onPreview={(url) => setPreviewUrl(url)}
            />
          </div>

          {/* Selected Asset Details Drawer */}
          <AssetDetail />
        </div>
      )}

      {/* Tab 2: AI Studio Workshop */}
      {activeTab === 'studio' && (
        <div className="flex min-h-0 flex-1 flex-col">
          <AIStudioTab onPreviewImage={(url) => setPreviewUrl(url)} />
        </div>
      )}

      {/* Lightbox Modal */}
      {previewUrl && (
        <AssetLightbox url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </aside>
  );
}

export const AssetPanel = memo(AssetPanelImpl);
