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
  { value: undefined, label: '全部' },
  { value: 'image', label: '图片' },
  { value: 'audio', label: '音频' },
  { value: 'video', label: '视频' },
  { value: 'font', label: '字体' },
  { value: 'other', label: '其他' },
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
        'flex h-full w-64 flex-col border-r border-[hsl(28,14%,18%)] bg-[hsl(22,16%,7%,0.4)] backdrop-blur-sm',
        className,
      )}
    >
      <div className="border-b border-[hsl(28,14%,18%)] px-3 py-2">
        <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-[hsl(35,15%,55%)]">
          资源
        </h2>
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-1 border-b border-[hsl(28,14%,18%)] p-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setTypeFilter(tab.value)}
            className={cn(
              'rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
              typeFilter === tab.value
                ? 'bg-[hsl(38,92%,56%,0.12)] text-[hsl(38,92%,72%)]'
                : 'text-[hsl(35,15%,55%)] hover:bg-[hsl(28,14%,14%)] hover:text-[hsl(40,30%,85%)]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Keyword search */}
      <div className="border-b border-[hsl(28,14%,18%)] p-2">
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索资源..."
          className="w-full rounded-md border border-[hsl(28,14%,20%)] bg-[hsl(22,16%,10%,0.6)] px-2 py-1 text-xs text-[hsl(40,30%,92%)] outline-none focus:border-[hsl(38,92%,56%,0.5)] focus:ring-1 focus:ring-[hsl(38,92%,56%,0.2)]"
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
