import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Sparkles } from 'lucide-react';
import { NodeShell } from './NodeShell';
import type { NodeType } from '@/types/flow';

export function CustomNodeImpl({ id, type, selected, data }: NodeProps) {
  const customLabel = (data.label as string) || (data.customName as string) || type;
  const description = (data.description as string) || 'AI 扩展自定义功能节点';

  return (
    <NodeShell
      type={type as NodeType}
      label={customLabel}
      selected={selected}
      icon={<Sparkles size={14} className="text-pink-400" />}
      subtitle="自定义扩展"
    >
      <div className="p-2.5 text-xs text-slate-300">
        <p className="line-clamp-2 text-[11px] text-slate-400">{description}</p>
        <div className="mt-2 rounded bg-slate-950/60 p-1.5 font-mono text-[10px] text-pink-300/80 border border-pink-500/20">
          type: {type}
        </div>
      </div>
    </NodeShell>
  );
}

export const CustomNode = memo(CustomNodeImpl);
