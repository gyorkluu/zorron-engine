/**
 * NodePalette - left panel listing the 8 node types for drag-to-create.
 *
 * Uses native HTML5 drag-and-drop: each item sets the node type in the
 * DataTransfer, and the FlowCanvas handles the drop event.
 */

import { memo } from 'react';
import { Blocks, Sparkles } from 'lucide-react';
import {
  NODE_TYPES,
  NODE_TYPE_LABEL_KEYS,
  NODE_TYPE_DESC_KEYS,
  NODE_TYPE_ACCENTS,
  type NodeType,
} from '@/types/flow';
import { useT } from '@/i18n/useT';
import { NodeIcon } from '@/components/brand/NodeIcon';

export interface NodePaletteProps {
  onCreateNode?: (type: NodeType) => void;
}

function PaletteItem({
  type,
  onCreate,
}: {
  type: NodeType;
  onCreate?: (type: NodeType) => void;
}) {
  const { t } = useT();
  const accent = NODE_TYPE_ACCENTS[type];
  const label = t(NODE_TYPE_LABEL_KEYS[type]);
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/zorron-node-type', type);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => onCreate?.(type)}
      className="group relative flex w-full cursor-grab items-start gap-2.5 rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-800/25 to-slate-900/25 p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-600/60 hover:from-slate-800/40 hover:to-slate-900/40 hover:shadow-lg active:cursor-grabbing active:scale-[0.98]"
    >
      <div
        className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
        style={{
          background: `linear-gradient(135deg, ${accent}30, ${accent}08)`,
          border: `1px solid ${accent}30`,
          boxShadow: `0 0 16px ${accent}15, inset 0 1px 0 ${accent}20`,
        }}
      >
        <NodeIcon type={type} size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold text-slate-100 group-hover:text-white">
            {label}
          </p>
        </div>
        <p className="line-clamp-2 text-[10.5px] leading-tight text-slate-400 mt-0.5">
          {t(NODE_TYPE_DESC_KEYS[type])}
        </p>
      </div>
      <div
        className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }}
      />
    </button>
  );
}

function NodePaletteImpl({ onCreateNode }: NodePaletteProps) {
  const { t } = useT();
  return (
    <aside className="flex h-full w-56 flex-col gap-0 border-r border-slate-800/50 bg-gradient-to-b from-slate-950/80 to-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-slate-800/40 px-3 py-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/20">
          <Blocks size={12} className="text-cyan-400" />
        </div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          {t('palette.title')}
        </h2>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2.5 scrollbar-thin">
        {NODE_TYPES.map((type) => (
          <PaletteItem key={type} type={type} onCreate={onCreateNode} />
        ))}
      </div>
      <div className="m-2.5 mt-0 flex items-start gap-2 rounded-lg border border-cyan-500/10 bg-gradient-to-r from-cyan-500/8 to-indigo-500/5 p-2.5">
        <Sparkles size={11} className="text-cyan-400 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] leading-relaxed text-slate-400">
          {t('palette.hint')}
        </p>
      </div>
    </aside>
  );
}

export const NodePalette = memo(NodePaletteImpl);
