/**
 * NodePalette - left panel listing the 8 node types for drag-to-create.
 *
 * Uses native HTML5 drag-and-drop: each item sets the node type in the
 * DataTransfer, and the FlowCanvas handles the drop event.
 */

import { memo } from 'react';
import {
  NODE_TYPES,
  NODE_TYPE_LABEL_KEYS,
  NODE_TYPE_DESC_KEYS,
  NODE_TYPE_ACCENTS,
  type NodeType,
} from '@/types/flow';
import { useT } from '@/i18n/useT';

/** Props for the NodePalette. */
export interface NodePaletteProps {
  /** Called when a node type is dragged onto the canvas (drop handled by canvas). */
  onCreateNode?: (type: NodeType) => void;
}

/** A single draggable node-type card. */
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
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/zorron-node-type', type);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onCreate?.(type)}
      className="group flex cursor-grab items-start gap-2 rounded-xl border border-slate-700/50 bg-slate-900/50 p-2.5 transition-all hover:border-slate-500/70 hover:bg-slate-800/60 active:cursor-grabbing"
    >
      <span
        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold"
        style={{ background: `${accent}22`, color: accent }}
      >
        {label[0]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-100">{label}</p>
        <p className="line-clamp-2 text-[11px] text-slate-400">
          {t(NODE_TYPE_DESC_KEYS[type])}
        </p>
      </div>
    </div>
  );
}

function NodePaletteImpl({ onCreateNode }: NodePaletteProps) {
  const { t } = useT();
  return (
    <aside className="flex h-full w-56 flex-col gap-2 overflow-y-auto border-r border-slate-800/60 bg-slate-950/40 p-3 backdrop-blur-sm">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {t('palette.title')}
      </h2>
      <div className="flex flex-col gap-2">
        {NODE_TYPES.map((type) => (
          <PaletteItem key={type} type={type} onCreate={onCreateNode} />
        ))}
      </div>
      <div className="mt-auto rounded-lg border border-slate-800/60 bg-slate-900/40 p-2 text-[10px] text-slate-500">
        {t('palette.hint')}
      </div>
    </aside>
  );
}

export const NodePalette = memo(NodePaletteImpl);
