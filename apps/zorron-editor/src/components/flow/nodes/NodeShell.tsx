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

/** Props for the NodeShell. */
export interface NodeShellProps {
  type: NodeType;
  label?: string;
  selected?: boolean;
  /** Show the target (input) handle on the left. */
  showTarget?: boolean;
  /** Show the source (output) handle on the right. */
  showSource?: boolean;
  /** Source handle id (for multi-output nodes like logic/scene). */
  sourceHandleId?: string;
  /** Target handle id. */
  targetHandleId?: string;
  /** Preview body rendered below the header. */
  children?: ReactNode;
  /** Extra header icon. */
  icon?: ReactNode;
}

/** A glassmorphic node card with accent header. */
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
}: NodeShellProps) {
  const accent = NODE_TYPE_ACCENTS[type];
  const title = label || NODE_TYPE_LABELS[type];

  return (
    <div
      className={cn(
        'group relative w-60 rounded-2xl border bg-[hsl(22,16%,8%,0.8)] text-[hsl(40,30%,92%)] shadow-xl backdrop-blur-md transition-all duration-200',
        'border-[hsl(28,14%,20%)] hover:border-[hsl(38,92%,56%,0.4)]',
        selected && 'border-[hsl(38,92%,56%,0.6)] ring-2 ring-[hsl(38,92%,56%,0.2)]',
      )}
      style={{
        boxShadow: selected
          ? `0 0 0 1px ${accent}55, 0 8px 32px -8px ${accent}66`
          : '0 8px 32px -12px rgba(0,0,0,0.6)',
      }}
    >
      {showTarget && (
        <Handle
          id={targetHandleId}
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-[hsl(20,14%,4%)] !bg-[hsl(40,30%,70%)]"
        />
      )}

      <div
        className="flex items-center gap-2 rounded-t-2xl px-3 py-2"
        style={{
          background: `linear-gradient(135deg, ${accent}33, transparent)`,
          borderBottom: `1px solid ${accent}44`,
        }}
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md text-xs"
          style={{ background: `${accent}22`, color: accent }}
        >
          {icon}
        </span>
        <span className="truncate text-sm font-semibold">{title}</span>
        <span
          className="ml-auto rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
          style={{ background: `${accent}22`, color: accent }}
        >
          {type}
        </span>
      </div>

      {children && <div className="px-3 py-2 text-xs text-[hsl(40,30%,85%)]">{children}</div>}

      {showSource && (
        <Handle
          id={sourceHandleId}
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-slate-900"
          style={{ background: accent }}
        />
      )}
    </div>
  );
}

export const NodeShell = memo(NodeShellImpl);

/** Convenience type for node component props (React Flow NodeProps). */
export type ZorronNodeProps = NodeProps;
