import { memo, useCallback } from 'react';
import { Check, X, Locate, AlertTriangle, Sparkles } from 'lucide-react';
import type { CanvasAction, ValidationIssue } from '@/engine/actionValidator';
import { useEditorStore } from '@/stores/editorStore';
import { useAIStore } from '@/stores/aiStore';
import { registerCustomNodeType } from '@/engine/nodeRegistry';
import { cn } from '@/lib/utils';

export interface AIActionCardProps {
  messageId: string;
  actions: CanvasAction[];
  issues?: ValidationIssue[];
  actionState?: 'pending' | 'applied' | 'rejected';
}

function AIActionCardImpl({
  messageId,
  actions,
  issues = [],
  actionState = 'pending',
}: AIActionCardProps) {
  const updateMessage = useAIStore((s) => s.updateMessage);
  const clearDiff = useAIStore((s) => s.clearDiff);
  const setPendingActions = useAIStore((s) => s.setPendingActions);

  const focusNode = useEditorStore((s) => s.focusNode);
  const addNode = useEditorStore((s) => s.addNode);
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const removeNode = useEditorStore((s) => s.removeNode);
  const loadFlow = useEditorStore((s) => s.loadFlow);
  const onConnect = useEditorStore((s) => s.onConnect);

  /** Focus node on canvas when user clicks locate. */
  const handleLocate = useCallback(
    (action: CanvasAction) => {
      let targetId: string | null = null;
      if (action.type === 'UPDATE_NODE_DATA' || action.type === 'DELETE_NODE') {
        targetId = action.nodeId;
      } else if (action.type === 'CONNECT_NODES') {
        targetId = action.sourceId;
      }
      if (targetId) {
        focusNode(targetId);
      }
    },
    [focusNode],
  );

  /** Apply all sanitized actions to the active canvas. */
  const handleApply = useCallback(() => {
    const createdNodeIds: string[] = [];

    actions.forEach((act) => {
      if (act.type === 'LOAD_FLOW_DATA') {
        loadFlow(act.nodes, act.edges);
      } else if (act.type === 'CONNECT_NODES') {
        onConnect({
          source: act.sourceId,
          target: act.targetId,
          sourceHandle: act.sourceHandle ?? null,
          targetHandle: act.targetHandle ?? null,
        });
      } else if (act.type === 'REGISTER_CUSTOM_NODE_TYPE') {
        registerCustomNodeType(act.customType, act.label, act.accent, act.defaultData);
      } else if (act.type === 'CREATE_NODE') {
        const id = addNode(act.nodeType, act.position || { x: 300, y: 300 });
        if (act.data) {
          updateNodeData(id, act.data);
        }
        createdNodeIds.push(id);
      } else if (act.type === 'UPDATE_NODE_DATA') {
        updateNodeData(act.nodeId, act.patch);
      } else if (act.type === 'DELETE_NODE') {
        removeNode(act.nodeId);
      }
    });

    if (createdNodeIds.length > 0) {
      focusNode(createdNodeIds[0]);
    }

    updateMessage(messageId, { actionState: 'applied' });
    clearDiff();
  }, [actions, addNode, updateNodeData, removeNode, loadFlow, onConnect, focusNode, updateMessage, messageId, clearDiff]);

  /** Reject the action card. */
  const handleReject = useCallback(() => {
    updateMessage(messageId, { actionState: 'rejected' });
    clearDiff();
  }, [updateMessage, messageId, clearDiff]);

  const hasWarnings = issues.some((i) => i.severity === 'warning');

  return (
    <div
      className={cn(
        'mt-2.5 rounded-xl border p-3.5 text-xs transition-all shadow-md backdrop-blur-md',
        actionState === 'applied'
          ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
          : actionState === 'rejected'
          ? 'border-slate-800 bg-slate-900/40 text-slate-400 opacity-60'
          : 'border-cyan-500/40 bg-slate-900/80 text-slate-200 ring-1 ring-cyan-500/20',
      )}
    >
      <div className="flex items-center justify-between font-medium">
        <div className="flex items-center gap-1.5 text-cyan-300">
          <Sparkles size={14} />
          <span>AI 建议变更集合 ({actions.length} 项)</span>
        </div>
        {actionState === 'applied' && (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 font-semibold">
            <Check size={12} /> 已应用
          </span>
        )}
        {actionState === 'rejected' && (
          <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
            <X size={12} /> 已驳回
          </span>
        )}
      </div>

      {/* Issues/Guardrail Warnings */}
      {hasWarnings && (
        <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-[11px] text-amber-300 flex items-start gap-1.5">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <div>
            {issues.map((iss, i) => (
              <div key={i}>{iss.message}</div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items Detail List */}
      <div className="mt-2.5 space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {actions.map((act, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg bg-slate-950/60 border border-slate-800/80 px-2.5 py-1.5 text-[11px]"
          >
            <span className="truncate font-mono">
              {act.type === 'CREATE_NODE' && `+ 新增节点: [${act.nodeType}]`}
              {act.type === 'UPDATE_NODE_DATA' && `~ 修改节点数据: ${act.nodeId}`}
              {act.type === 'DELETE_NODE' && `- 删除节点: ${act.nodeId}`}
              {act.type === 'CONNECT_NODES' && `→ 连接节点: ${act.sourceId} to ${act.targetId}`}
            </span>
            <button
              type="button"
              onClick={() => handleLocate(act)}
              className="text-slate-400 hover:text-cyan-300 p-0.5 rounded transition-colors"
              title="在画布中定位"
            >
              <Locate size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Controls */}
      {actionState === 'pending' && (
        <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={handleReject}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
          >
            驳回改动
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-600/80 px-3.5 py-1 text-xs font-semibold text-white hover:bg-cyan-500 shadow-md shadow-cyan-500/20 transition-all active:scale-95"
          >
            <Check size={13} />
            确认应用改动
          </button>
        </div>
      )}
    </div>
  );
}

export const AIActionCard = memo(AIActionCardImpl);
