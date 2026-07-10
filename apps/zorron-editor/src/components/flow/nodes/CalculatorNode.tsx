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
  const v = d.vector ?? {};
  const entries = Object.entries(v);
  return (
    <NodeShell type="calculator" label={d.label ?? t('nodeFallback.calculator')} selected={selected}>
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          {entries.length === 0 ? (
            <span className="flex-1 rounded bg-cyan-500/10 px-2 py-1 text-center font-mono text-[10px] text-slate-500">∅</span>
          ) : (
            entries.map(([axisId, val]) => (
              <span key={axisId} className="flex-1 rounded bg-cyan-500/10 px-2 py-1 text-center font-mono text-[10px] text-cyan-300">
                {axisId}:{val}
              </span>
            ))
          )}
        </div>
        {d.targetVariable && (
          <p className="text-[10px] text-slate-400">→ {d.targetVariable}</p>
        )}
      </div>
    </NodeShell>
  );
}

export const CalculatorNode = memo(CalculatorNodeImpl);
