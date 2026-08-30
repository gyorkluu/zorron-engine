import { memo } from 'react';
import type { InspectorFormProps } from '@/engine/nodeRegistry';
import type { BaseNodeData } from '@/types/flow';

export function CustomNodeFormImpl({ node, update }: InspectorFormProps) {
  const data = node.data as BaseNodeData & Record<string, unknown>;

  return (
    <div className="space-y-4 text-xs text-slate-200">
      <div>
        <label className="block mb-1 font-medium text-slate-400">节点名称 (Title)</label>
        <input
          type="text"
          value={(data.label as string) || (data.customName as string) || node.type}
          onChange={(e) => update({ label: e.target.value })}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-slate-400">描述信息 (Description)</label>
        <textarea
          value={(data.description as string) || ''}
          onChange={(e) => update({ description: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-2.5 text-[11px] text-purple-300">
        <p className="font-semibold mb-1">✨ AI 扩展属性 (Dynamic Schema Data)</p>
        <pre className="overflow-x-auto font-mono text-[10px] text-slate-300">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export const CustomNodeForm = memo(CustomNodeFormImpl);
