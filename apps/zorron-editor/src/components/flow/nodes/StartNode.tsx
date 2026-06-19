/**
 * Start node - entry point of the narrative flow.
 */

import { memo } from 'react';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type { StartNodeData } from '@/types/flow';

function StartNodeImpl({ data, selected }: ZorronNodeProps) {
  const d = data as StartNodeData;
  return (
    <NodeShell type="start" label={d.label ?? '开始'} selected={selected} showTarget={false} icon="S">
      <div className="space-y-1">
        {d.title && <p className="font-medium text-cyan-200">{d.title}</p>}
        {d.intro && <p className="line-clamp-2 text-slate-400">{d.intro}</p>}
        {d.coverUrl && (
          <div className="mt-1 h-16 w-full overflow-hidden rounded-lg bg-slate-800">
            <img src={d.coverUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
    </NodeShell>
  );
}

export const StartNode = memo(StartNodeImpl);
