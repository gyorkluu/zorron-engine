/**
 * NodeMarketPanel — the "node as an asset" catalogue.
 *
 * Browse templates published by other authors, insert one into the canvas, or
 * publish the currently selected node as a reusable template. Insertion copies
 * by value, so the new node is independent of its template.
 */

import { memo, useCallback, useEffect, useState } from 'react';
import { Store, Plus, Search, Download, Trash2 } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useT } from '@/i18n/useT';
import * as nodeAssetService from '@/services/nodeAsset.service';
import type { NodeAssetDetail } from '@/services/nodeAsset.service';
import { cn } from '@/lib/utils';

export interface NodeMarketPanelProps {
  className?: string;
}

function NodeMarketPanelImpl({ className }: NodeMarketPanelProps) {
  const { t } = useT();
  const setNodes = useEditorStore((s) => s.setNodes);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);

  const [assets, setAssets] = useState<NodeAssetDetail[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssets(await nodeAssetService.listNodeAssets({ q: keyword || undefined }));
    } catch {
      // The market is a convenience surface; failing to load must never break
      // the editor.
      setError(t('market.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [keyword, t]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Copy a template's payload into a fresh node on the canvas. */
  const handleInsert = useCallback(
    async (asset: NodeAssetDetail) => {
      try {
        const template = await nodeAssetService.instantiateNodeAsset(asset.id);
        const existing = useEditorStore.getState().nodes;
        const created = {
          id: `${template.nodeType}-${Date.now().toString(36)}`,
          type: template.nodeType,
          // Drop it to the right of everything already on the canvas.
          position: {
            x: Math.max(160, ...existing.map((n) => n.position.x + 260)),
            y: 160,
          },
          data: { ...template.data, label: template.name },
        } as (typeof existing)[number];
        setNodes([...existing, created]);
      } catch {
        setError(t('market.insertFailed'));
      }
    },
    [setNodes, t],
  );

  /** Publish the selected node as a reusable template. */
  const handlePublish = useCallback(async () => {
    const node = useEditorStore
      .getState()
      .nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;
    try {
      await nodeAssetService.createNodeAsset({
        name: (node.data as { label?: string })?.label || node.id,
        nodeType: node.type ?? 'stage',
        data: node.data as Record<string, unknown>,
        isPublic: false,
      });
      await load();
    } catch {
      setError(t('market.publishFailed'));
    }
  }, [selectedNodeId, load, t]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await nodeAssetService.deleteNodeAsset(id);
        await load();
      } catch {
        setError(t('market.deleteFailed'));
      }
    },
    [load, t],
  );

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-sm',
        className,
      )}
      data-testid="node-market-panel"
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <div className="flex flex-col">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            {t('market.title')}
          </h3>
          <span className="text-[10px] text-slate-500">{t('market.tip')}</span>
        </div>
        <button
          type="button"
          onClick={() => void handlePublish()}
          disabled={!selectedNodeId}
          data-testid="market-publish"
          title={
            selectedNodeId ? t('market.publish') : t('market.selectNodeFirst')
          }
          className={cn(
            'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors',
            selectedNodeId
              ? 'bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
              : 'cursor-not-allowed bg-slate-900/60 text-slate-600',
          )}
        >
          <Plus size={11} />
          {t('market.publish')}
        </button>
      </div>

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
            placeholder={t('market.search')}
            className="w-full rounded-lg border border-slate-800/80 bg-slate-900/60 py-1.5 pl-7 pr-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/40 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {error ? (
          <p className="px-1 py-2 text-[10px] text-rose-300">{error}</p>
        ) : loading ? (
          <p className="px-1 py-2 text-[10px] text-slate-500">…</p>
        ) : assets.length === 0 ? (
          <p className="px-1 py-2 text-[11px] leading-relaxed text-slate-500">
            {t('market.empty')}
          </p>
        ) : (
          <ul className="space-y-1">
            {assets.map((asset) => (
              <li
                key={asset.id}
                className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-1.5"
              >
                <Store size={12} className="flex-shrink-0 text-cyan-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-slate-200">
                    {asset.name}
                  </p>
                  <p className="truncate text-[10px] text-slate-500">
                    {asset.nodeType}
                    {asset.usageCount > 0
                      ? ` · ${t('market.uses', { n: asset.usageCount })}`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleInsert(asset)}
                  title={t('market.insert')}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-cyan-300"
                >
                  <Download size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(asset.id)}
                  className="rounded p-1 text-slate-500 transition-colors hover:bg-rose-900/40 hover:text-rose-300"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export const NodeMarketPanel = memo(NodeMarketPanelImpl);
