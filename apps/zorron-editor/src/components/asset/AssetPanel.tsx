/**
 * AssetPanel - left panel for asset management.
 *
 * Combines a type filter (All / Image / Audio / Video / Font / Other), a
 * keyword search, the uploader, the asset grid and the detail panel. Wires
 * reference-count rescanning whenever the canvas nodes change.
 */

import { memo, useEffect, useMemo } from 'react';
import { useAssetStore, useAllAssets } from '@/stores/assetStore';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import type { AssetType } from '@/types/asset';
import { AssetUploader } from './AssetUploader';
import { AssetGrid } from './AssetGrid';
import { AssetDetail } from './AssetDetail';
import { cn } from '@/lib/utils';

/** Filter tab definitions. */
const TYPE_TABS: ReadonlyArray<{ value: AssetType | undefined; label: string }> = [
  { value: undefined, label: 'All' },
  { value: 'image', label: 'Image' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'font', label: 'Font' },
  { value: 'other', label: 'Other' },
];

/** Extract every URL-valued field from a node's data for reference scanning. */
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

/** Props for the AssetPanel. */
export interface AssetPanelProps {
  className?: string;
}

function AssetPanelImpl({ className }: AssetPanelProps) {
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

  // Initial load: fetch remote + local assets.
  useEffect(() => {
    void fetchLocalAssets();
    void fetchAssets();
  }, [fetchLocalAssets, fetchAssets]);

  // Re-fetch remote assets when the active project changes.
  useEffect(() => {
    if (projectId) void fetchAssets({ projectId });
  }, [projectId, fetchAssets]);

  // Recompute reference counts whenever the canvas changes.
  useEffect(() => {
    const urls: string[] = [];
    for (const node of nodes) {
      urls.push(...extractAssetUrls(node.data as Record<string, unknown>));
    }
    recomputeReferences(urls);
  }, [nodes, recomputeReferences]);

  // Apply type + keyword filters on the merged list.
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
        'flex h-full w-64 flex-col border-r border-slate-800/60 bg-slate-950/40 backdrop-blur-sm',
        className,
      )}
    >
      <div className="border-b border-slate-800/60 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Assets
        </h2>
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-800/60 p-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setTypeFilter(tab.value)}
            className={cn(
              'rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
              typeFilter === tab.value
                ? 'bg-cyan-500/20 text-cyan-200'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Keyword search */}
      <div className="border-b border-slate-800/60 p-2">
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search assets..."
          className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
        />
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
