/**
 * Shared shell for all custom React Flow nodes.
 *
 * Renders the accent header, label, optional preview content and the
 * source/target handles. Each node type composes this shell with its own
 * preview body.
 */

import { memo, type ReactNode } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import {
  NODE_TYPE_ACCENTS,
  NODE_TYPE_LABELS,
  type NodeType,
} from '@/types/flow';
import { NodeIcon } from '@/components/brand/NodeIcon';

export interface NodeShellProps {
  type: NodeType;
  label?: string;
  selected?: boolean;
  showTarget?: boolean;
  showSource?: boolean;
  sourceHandleId?: string;
  targetHandleId?: string;
  children?: ReactNode;
  icon?: ReactNode;
  subtitle?: string;
}

function NodeShellImpl({
  type,
  label,
  selected,
  showTarget = true,
  showSource = true,
  sourceHandleId,
  targetHandleId,
  children,
  icon,
  subtitle,
}: NodeShellProps) {
  const accent = NODE_TYPE_ACCENTS[type];
  const title = label || NODE_TYPE_LABELS[type];

  return (
    <div
      className={cn(
        'group relative w-60 rounded-xl border bg-slate-900/90 text-slate-100 backdrop-blur-xl transition-all duration-200',
        'border-slate-700/50 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.7)]',
        'hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)]',
        selected && 'border-transparent',
      )}
      style={{
        boxShadow: selected
          ? `0 0 0 1px ${accent}, 0 0 20px -2px ${accent}66, 0 12px 40px -12px ${accent}44`
          : undefined,
      }}
    >
      {selected && (
        <div
          className="pointer-events-none absolute -inset-px rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${accent}40, ${accent}10, transparent)`,
            opacity: 0.6,
          }}
        />
      )}

      {showTarget && (
        <Handle
          id={targetHandleId}
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-slate-950 !transition-transform hover:!scale-125"
          style={{ background: accent, boxShadow: `0 0 8px ${accent}66` }}
        />
      )}

      <div
        className="relative flex items-center gap-2 rounded-t-xl px-3 py-2.5"
        style={{
          background: `linear-gradient(135deg, ${accent}22, ${accent}06)`,
          borderBottom: `1px solid ${accent}25`,
        }}
      >
        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
          style={{
            background: `linear-gradient(135deg, ${accent}30, ${accent}10)`,
            color: accent,
            boxShadow: `0 0 12px ${accent}20, inset 0 1px 0 ${accent}25`,
            border: `1px solid ${accent}20`,
          }}
        >
          {icon || <NodeIcon type={type} size={14} />}
        </div>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-bold leading-tight">{title}</span>
          {subtitle && (
            <span className="block truncate text-[10px] text-slate-400">{subtitle}</span>
          )}
        </div>
        <span
          className="flex-shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{
            background: `${accent}18`,
            color: accent,
            border: `1px solid ${accent}20`,
          }}
        >
          {type}
        </span>
      </div>

      {children && (
        <div className="relative px-3 py-2.5 text-xs text-slate-300">
          {children}
        </div>
      )}

      {showSource && (
        <Handle
          id={sourceHandleId}
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-slate-950 !transition-transform hover:!scale-125"
          style={{ background: accent, boxShadow: `0 0 8px ${accent}66` }}
        />
      )}
    </div>
  );
}

export const NodeShell = memo(NodeShellImpl);

export type ZorronNodeProps = NodeProps;
