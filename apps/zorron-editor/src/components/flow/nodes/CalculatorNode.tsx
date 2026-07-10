/**
 * Calculator node - applies pending personality vector deltas.
 */

import { memo } from 'react';
import { useT } from '@/i18n/useT';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type { CalculatorNodeData } from '@/types/flow';

function CalculatorNodeImpl({ data, selected }: ZorronNodeProps) {
  const { t } = useT();
  const d = data as CalculatorNodeData;
  const v = d.vector ?? { x: 0, y: 0, z: 0 };
  return (
    <NodeShell type="calculator" label={d.label ?? t('nodeFallback.calculator')} selected={selected}>
      <div className="space-y-1.5">
        <div className="flex gap-1.5">
          <span className="flex-1 rounded bg-cyan-500/10 px-2 py-1 text-center font-mono text-[10px] text-cyan-300">X:{v.x}</span>
          <span className="flex-1 rounded bg-cyan-500/10 px-2 py-1 text-center font-mono text-[10px] text-cyan-300">Y:{v.y}</span>
          <span className="flex-1 rounded bg-cyan-500/10 px-2 py-1 text-center font-mono text-[10px] text-cyan-300">Z:{v.z}</span>
        </div>
        {d.targetVariable && (
          <p className="text-[10px] text-slate-400">→ {d.targetVariable}</p>
        )}
      </div>
    </NodeShell>
  );
}

export const CalculatorNode = memo(CalculatorNodeImpl);
