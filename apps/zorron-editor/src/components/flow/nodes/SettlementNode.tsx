/**
 * Settlement node - final result and archetype matching.
 */

import { memo } from 'react';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type { SettlementNodeData } from '@/types/flow';

function SettlementNodeImpl({ data, selected }: ZorronNodeProps) {
  const d = data as SettlementNodeData;
  const mappings = d.resultMapping ?? [];
  return (
    <NodeShell
      type="settlement"
      label={d.label ?? 'Settlement'}
      selected={selected}
      showSource={false}
      icon="★"
    >
      <div className="space-y-1">
        {mappings.length === 0 ? (
          <p className="italic text-slate-500">No results mapped</p>
        ) : (
          <ul className="space-y-0.5">
            {mappings.slice(0, 3).map((m) => (
              <li key={m.resultId} className="truncate text-pink-200/90">
                {m.title}
              </li>
            ))}
            {mappings.length > 3 && (
              <li className="text-[10px] text-slate-500">+{mappings.length - 3} more</li>
            )}
          </ul>
        )}
      </div>
    </NodeShell>
  );
}

export const SettlementNode = memo(SettlementNodeImpl);
