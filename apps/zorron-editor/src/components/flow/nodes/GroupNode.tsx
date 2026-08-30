/**
 * GroupNode — a resizable container that owns other nodes.
 *
 * Built on React Flow's parent/child model: children carry `parentId` and are
 * positioned relative to the group. Collapsing hides the children and shrinks
 * the frame to a header-only chip, which is what makes a 200-node story
 * navigable.
 */

import { memo, useCallback } from 'react';
import { useT } from '@/i18n/useT';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ChevronDown, ChevronRight, Boxes } from 'lucide-react';

export interface GroupNodeProps extends NodeProps {
  data: {
    label?: string;
    collapsed?: boolean;
    /** Accent colour (hex) for the frame. */
    color?: string;
    /** Number of children, maintained by the editor store. */
    childCount?: number;
  };
}

export function GroupNode({ id, data, selected }: GroupNodeProps) {
  const { t } = useT();
  const collapsed = Boolean(data.collapsed);
  const color = data.color ?? '#38bdf8';

  const toggleCollapse = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      // Dispatched through a custom event so the store stays React-Flow agnostic.
      window.dispatchEvent(
        new CustomEvent('zorron:toggle-group', { detail: { nodeId: id } }),
      );
    },
    [id],
  );

  return (
    <div
      className="h-full w-full"
      style={{
        // Collapsed groups collapse to a compact chip instead of their full box.
        height: collapsed ? 'auto' : '100%',
      }}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" />

      <div
        className="flex h-full flex-col overflow-hidden rounded-xl border-2 border-dashed backdrop-blur-sm transition-colors"
        style={{
          borderColor: selected ? color : `${color}66`,
          background: `${color}0d`,
        }}
      >
        <div
          className="flex flex-shrink-0 items-center gap-1.5 px-2.5 py-1.5"
          style={{ background: `${color}1a`, borderBottom: `1px solid ${color}33` }}
        >
          <button
            type="button"
            onClick={toggleCollapse}
            title={collapsed ? t('group.expand') : t('group.collapse')}
            className="rounded p-0.5 transition-colors hover:bg-white/10"
            style={{ color }}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
          <Boxes size={12} style={{ color }} />
          <span
            className="min-w-0 flex-1 truncate text-xs font-semibold"
            style={{ color }}
          >
            {data.label || t('node.group.label')}
          </span>
          {collapsed && data.childCount ? (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: `${color}26`, color }}
            >
              {data.childCount}
            </span>
          ) : null}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  );
}

export const GroupNodeComponent = memo(GroupNode);
