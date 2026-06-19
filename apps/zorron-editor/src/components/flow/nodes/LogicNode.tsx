/**
 * Logic node - branches the flow based on a condition.
 *
 * Exposes two source handles: "true" and "false".
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type { LogicNodeData } from '@/types/flow';

function LogicNodeImpl({ data, selected }: ZorronNodeProps) {
  const d = data as LogicNodeData;
  return (
    <NodeShell
      type="logic"
      label={d.label ?? 'Logic'}
      selected={selected}
      showSource={false}
      icon="?"
    >
      <div className="space-y-1">
        <p className="text-amber-200/80">
          {d.checkType ?? 'variable'} check
        </p>
        {d.varName && (
          <p className="font-mono text-[11px] text-slate-400">
            {d.varName} {d.operator ?? '>='} {d.value ?? 0}
          </p>
        )}
        <div className="flex justify-between pt-1">
          <span className="text-[10px] text-emerald-300">true</span>
          <span className="text-[10px] text-rose-300">false</span>
        </div>
      </div>
      {/* True output (top-right) */}
      <Handle
        id="true"
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-emerald-400"
        style={{ top: '55%' }}
      />
      {/* False output (bottom-right) */}
      <Handle
        id="false"
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-rose-400"
        style={{ top: '80%' }}
      />
    </NodeShell>
  );
}

export const LogicNode = memo(LogicNodeImpl);
