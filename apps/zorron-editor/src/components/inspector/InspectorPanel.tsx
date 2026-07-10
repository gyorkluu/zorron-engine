/**
 * InspectorPanel - right panel that edits the selected node's fields.
 *
 * Dispatches to the selected node's InspectorForm looked up via the
 * NodeDefinition registry. All edits flow through `editorStore.updateNodeData`
 * so the canvas stays in sync.
 */

import { memo, useCallback } from 'react';
import { Crosshair, MousePointerClick, Copy, Trash2, Settings } from 'lucide-react';
import { useEditorStore, useSelectedNode } from '@/stores/editorStore';
import { type FlowNode, type NodeType } from '@/types/flow';
import { useT } from '@/i18n/useT';
import { NodeIcon } from '@/components/brand/NodeIcon';
import { getNodeAccent, getNodeLabelKey, getNodeDefinition } from '@/engine/nodeRegistry';
import { VectorSpaceSettings } from '@/components/vector3d/VectorSpaceSettings';
import { featureFlags } from '@/lib/featureFlags';

/** Empty state shown when no node is selected. */
function EmptyInspector() {
  const { t } = useT();
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-slate-800/40 px-4 py-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500/20 to-indigo-500/10 border border-cyan-500/20">
          <Settings size={12} className="text-cyan-400" />
        </div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          {t('inspector.title')}
        </h2>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 pb-4 text-center">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/30 border border-slate-800/40">
            <MousePointerClick size={24} className="text-slate-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-slate-800/50 bg-slate-900">
            <Crosshair size={10} className="text-cyan-400" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-300">{t('inspector.noSelect')}</p>
          <p className="mt-1 max-w-[200px] text-[11px] leading-relaxed text-slate-500">
            {t('inspector.noSelect.hint')}
          </p>
        </div>
      </div>
      {featureFlags.vector3d && (
        <div className="border-t border-slate-800/40 px-4 pt-3 pb-4">
          <VectorSpaceSettings />
        </div>
      )}
    </div>
  );
}

/** Header showing the node type and id. */
function InspectorHeader({ node }: { node: FlowNode }) {
  const { t } = useT();
  const accent = getNodeAccent(node.type as NodeType);
  const labelKey = getNodeLabelKey(node.type as NodeType);
  return (
    <div
      className="flex items-center gap-2 border-b border-slate-800/40 px-4 py-3"
      style={{ background: `linear-gradient(135deg, ${accent}15, ${accent}04)` }}
    >
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{
          background: `linear-gradient(135deg, ${accent}30, ${accent}08)`,
          color: accent,
          border: `1px solid ${accent}25`,
          boxShadow: `0 0 12px ${accent}15`,
        }}
      >
        <NodeIcon type={node.type as NodeType} size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-slate-100">
          {labelKey ? t(labelKey) : node.type}
        </h2>
        <p className="truncate font-mono text-[9px] text-slate-500">{node.id}</p>
      </div>
      <span
        className="rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
        style={{
          background: `${accent}18`,
          color: accent,
          border: `1px solid ${accent}20`,
        }}
      >
        {node.type}
      </span>
    </div>
  );
}

function InspectorPanelImpl() {
  const { t } = useT();
  const node = useSelectedNode();
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const removeNode = useEditorStore((s) => s.removeNode);

  const update = useCallback(
    (data: Record<string, unknown>) => {
      if (node) updateNodeData(node.id, data);
    },
    [node, updateNodeData],
  );

  if (!node) {
    return (
      <aside className="flex h-full w-80 flex-col border-l border-slate-800/50 bg-gradient-to-b from-slate-950/80 to-slate-950/40 backdrop-blur-xl">
        <EmptyInspector />
      </aside>
    );
  }

  const def = getNodeDefinition(node.type as NodeType);
  const Form = def?.InspectorForm;

  return (
    <aside className="flex h-full w-80 flex-col border-l border-slate-800/50 bg-gradient-to-b from-slate-950/80 to-slate-950/40 backdrop-blur-xl">
      <InspectorHeader node={node} />
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {Form ? <Form node={node} update={update} /> : null}
      </div>
      <div className="flex gap-2 border-t border-slate-800/40 p-3">
        <button
          type="button"
          onClick={() => duplicateNode(node.id)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-xs font-medium text-slate-200 transition-all hover:bg-slate-700/60 hover:text-slate-100 active:scale-[0.98]"
        >
          <Copy size={12} />
          {t('inspector.duplicate')}
        </button>
        <button
          type="button"
          onClick={() => removeNode(node.id)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-700/40 bg-rose-900/20 px-3 py-2 text-xs font-medium text-rose-200 transition-all hover:bg-rose-900/40 hover:border-rose-600/50 hover:text-rose-100 active:scale-[0.98]"
        >
          <Trash2 size={12} />
          {t('inspector.delete')}
        </button>
      </div>
    </aside>
  );
}

export const InspectorPanel = memo(InspectorPanelImpl);
