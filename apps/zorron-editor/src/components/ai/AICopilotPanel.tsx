import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Trash2, Bot, HelpCircle, Layers, Zap } from 'lucide-react';
import { useAIStore } from '@/stores/aiStore';
import { useEditorStore } from '@/stores/editorStore';
import { sendAICopilotPrompt } from '@/services/ai.service';
import { AIChatMessage } from './AIChatMessage';
import { cn } from '@/lib/utils';

export function AICopilotPanelImpl() {
  const isOpen = useAIStore((s) => s.isOpen);
  const setIsOpen = useAIStore((s) => s.setIsOpen);
  const messages = useAIStore((s) => s.messages);
  const isThinking = useAIStore((s) => s.isThinking);
  const addMessage = useAIStore((s) => s.addMessage);
  const setThinking = useAIStore((s) => s.setThinking);
  const clearHistory = useAIStore((s) => s.clearHistory);

  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  const [inputPrompt, setInputPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  /** Submit prompt to AI Copilot */
  const handleSubmit = useCallback(async () => {
    const text = inputPrompt.trim();
    if (!text || isThinking) return;

    setInputPrompt('');
    addMessage({ role: 'user', content: text });
    setThinking(true);

    try {
      const res = await sendAICopilotPrompt(text, nodes, edges, selectedNodeId);
      addMessage({
        role: 'assistant',
        content: res.reply,
        actions: res.actions,
        issues: res.audit?.issues,
        actionState: 'pending',
      });
    } catch (err) {
      addMessage({
        role: 'assistant',
        content: `请求 AI 助手出错: ${err instanceof Error ? err.message : '未知错误'}`,
      });
    } finally {
      setThinking(false);
    }
  }, [inputPrompt, isThinking, addMessage, setThinking, nodes, edges, selectedNodeId]);

  /** Quick prompt presets */
  const handleQuickPrompt = useCallback(
    (promptText: string) => {
      setInputPrompt(promptText);
    },
    [],
  );

  if (!isOpen) return null;

  return (
    <aside className="relative flex h-full w-80 flex-col border-l border-slate-800/80 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-xl z-20">
      {/* Panel Header */}
      <div className="flex h-12 items-center justify-between border-b border-slate-800/80 px-3.5 bg-slate-900/50">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
            <Sparkles size={14} />
          </div>
          <span>Zorron AI Copilot</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearHistory}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="清空对话历史"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Context Badge */}
      <div className="flex items-center justify-between border-b border-slate-800/60 bg-slate-900/30 px-3.5 py-1.5 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-1.5 truncate">
          <Layers size={12} className="text-cyan-400 shrink-0" />
          <span>
            {selectedNode ? `当前节点: [${selectedNode.type}] ${selectedNode.id}` : '全局画布工程'}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
          {nodes.length} 节点
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg) => (
          <AIChatMessage key={msg.id} message={msg} />
        ))}

        {isThinking && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic py-2 pl-2">
            <Bot size={14} className="animate-spin text-cyan-400" />
            <span>AI 思考中并匹配节点技能...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Presets */}
      <div className="px-3 py-2 border-t border-slate-800/40 bg-slate-950/40">
        <div className="text-[10px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
          <Zap size={11} className="text-amber-400" /> 快捷场景指令:
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <button
            type="button"
            onClick={() => handleQuickPrompt('自动生成《剑网3·风起稻香》全节点互动影游Demo工程')}
            className="rounded-lg border border-purple-500/40 bg-purple-950/30 px-2 py-1 text-purple-200 hover:bg-purple-900/40 hover:border-purple-400 transition-colors flex items-center gap-1 font-medium"
          >
            <Sparkles size={10} className="text-purple-400" />
            <span>✨ 生成全节点互动Demo</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickPrompt('帮我搭一个标准的问答测评工程')}
            className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-200 transition-colors"
          >
            + 标准问答测评
          </button>
          <button
            type="button"
            onClick={() => handleQuickPrompt('优化当前节点的文本代入感')}
            className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-200 transition-colors"
          >
            ~ 优化节点文案
          </button>
        </div>
      </div>

      {/* Input Form */}
      <div className="border-t border-slate-800/80 p-3 bg-slate-900/60">
        <div className="relative flex items-center">
          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="描述你想修改或创建的内容..."
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-2.5 pr-10 text-xs text-slate-100 placeholder-slate-400 focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!inputPrompt.trim() || isThinking}
            className="absolute right-2 bottom-2 rounded-lg bg-cyan-600 p-1.5 text-white hover:bg-cyan-500 disabled:opacity-40 transition-all shadow-md"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export const AICopilotPanel = memo(AICopilotPanelImpl);
