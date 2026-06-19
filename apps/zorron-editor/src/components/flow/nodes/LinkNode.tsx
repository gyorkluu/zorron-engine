/**
 * Link node - opens an external URL. Terminal node (no output handle).
 */

import { memo } from 'react';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type { LinkNodeData } from '@/types/flow';

function LinkNodeImpl({ data, selected }: ZorronNodeProps) {
  const d = data as LinkNodeData;
  return (
    <NodeShell
      type="link"
      label={d.label ?? 'Link'}
      selected={selected}
      showSource={false}
      icon="↗"
    >
      <div className="space-y-1">
        {d.title && <p className="font-medium text-slate-200">{d.title}</p>}
        {d.url ? (
          <p className="truncate text-slate-400">{d.url}</p>
        ) : (
          <p className="italic text-slate-500">No URL</p>
        )}
      </div>
    </NodeShell>
  );
}

export const LinkNode = memo(LinkNodeImpl);
