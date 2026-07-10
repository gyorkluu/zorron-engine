/**
 * Logic node - branches the flow based on a condition.
 *
 * Exposes two source handles: "true" and "false".
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useT } from '@/i18n/useT';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type { LogicNodeData } from '@/types/flow';

function LogicNodeImpl({ data, selected }: ZorronNodeProps) {
  const { t } = useT();
  const d = data as LogicNodeData;
  return (
    <NodeShell
      type="logic"
      label={d.label ?? t('nodeFallback.logic')}
      selected={selected}
      showSource={false}
    >
      <div className="space-y-1.5">
        <p className="text-[11px] text-amber-200/80">
          {t('nodeFallback.logicCheck', { type: d.checkType ?? 'variable' })}
        </p>
        {d.varName && (
          <p className="rounded-md bg-slate-800/50 px-2 py-1 font-mono text-[10px] text-slate-300">
            {d.varName} {d.operator ?? '>='} {d.value ?? 0}
          </p>
        )}
        <div className="flex justify-between pt-1">
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">TRUE</span>
          <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-rose-300">FALSE</span>
        </div>
      </div>
      {/* True output (top-right) */}
      <Handle
        id="true"
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-950 !bg-emerald-400 !transition-transform hover:!scale-125"
        style={{ top: '58%', boxShadow: '0 0 6px rgba(52,211,153,0.5)' }}
      />
      <Handle
        id="false"
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-950 !bg-rose-400 !transition-transform hover:!scale-125"
        style={{ top: '82%', boxShadow: '0 0 6px rgba(251,113,133,0.5)' }}
      />
    </NodeShell>
  );
}

export const LogicNode = memo(LogicNodeImpl);
