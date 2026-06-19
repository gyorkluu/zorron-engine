/**
 * NodePalette - left panel listing the 8 node types for drag-to-create.
 *
 * Uses native HTML5 drag-and-drop: each item sets the node type in the
 * DataTransfer, and the FlowCanvas handles the drop event.
 */

import { memo } from 'react';
import {
  NODE_TYPES,
  NODE_TYPE_LABELS,
  NODE_TYPE_DESCRIPTIONS,
  NODE_TYPE_ACCENTS,
  type NodeType,
} from '@/types/flow';

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
  const accent = NODE_TYPE_ACCENTS[type];
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/zorron-node-type', type);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onCreate?.(type)}
      className="group flex cursor-grab items-start gap-2 rounded-xl border border-[hsl(28,14%,18%)] bg-[hsl(22,16%,10%,0.5)] p-2.5 transition-all duration-200 hover:border-[hsl(38,92%,56%,0.3)] hover:bg-[hsl(28,14%,14%,0.6)] active:cursor-grabbing"
    >
      <span
        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold"
        style={{ background: `${accent}22`, color: accent }}
      >
        {NODE_TYPE_LABELS[type][0]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[hsl(40,30%,92%)]">{NODE_TYPE_LABELS[type]}</p>
        <p className="line-clamp-2 text-[11px] text-[hsl(35,15%,55%)]">
          {NODE_TYPE_DESCRIPTIONS[type]}
        </p>
      </div>
    </div>
  );
}

function NodePaletteImpl({ onCreateNode }: NodePaletteProps) {
  return (
    <aside className="flex h-full w-56 flex-col gap-2 overflow-y-auto border-r border-[hsl(28,14%,18%)] bg-transparent p-3 backdrop-blur-sm">
      <h2 className="px-1 font-display text-xs font-semibold uppercase tracking-wider text-[hsl(35,15%,45%)]">
        节点面板
      </h2>
      <div className="flex flex-col gap-2">
        {NODE_TYPES.map((type) => (
          <PaletteItem key={type} type={type} onCreate={onCreateNode} />
        ))}
      </div>
      <div className="mt-auto rounded-lg border border-[hsl(28,14%,18%)] bg-[hsl(22,16%,10%,0.4)] p-2 text-[10px] text-[hsl(35,15%,45%)]">
        拖拽节点到画布，或点击在中心添加。
      </div>
    </aside>
  );
}

export const NodePalette = memo(NodePaletteImpl);
