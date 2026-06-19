/**
 * Calculator node - applies pending personality vector deltas.
 */

import { memo } from 'react';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type { CalculatorNodeData } from '@/types/flow';

function CalculatorNodeImpl({ data, selected }: ZorronNodeProps) {
  const d = data as CalculatorNodeData;
  const v = d.vector ?? { x: 0, y: 0, z: 0 };
  return (
    <NodeShell type="calculator" label={d.label ?? 'Calculator'} selected={selected} icon="V">
      <div className="space-y-1">
        <div className="flex gap-2 font-mono text-[11px]">
          <span className="text-cyan-300">X:{v.x}</span>
          <span className="text-cyan-300">Y:{v.y}</span>
          <span className="text-cyan-300">Z:{v.z}</span>
        </div>
        {d.targetVariable && (
          <p className="text-[11px] text-slate-400">→ {d.targetVariable}</p>
        )}
      </div>
    </NodeShell>
  );
}

export const CalculatorNode = memo(CalculatorNodeImpl);
