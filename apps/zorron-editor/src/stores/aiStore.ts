/**
 * AI Store (Zustand) - Manages AI Copilot chat history, pending patches, diff highlights.
 */

import { create } from 'zustand';
import type { CanvasAction, ValidationIssue } from '@/engine/actionValidator';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  /** Suggested Canvas Actions waiting for user approval. */
  actions?: CanvasAction[];
  /** Validation issues found during action auditing. */
  issues?: ValidationIssue[];
  /** Execution status of the action card. */
  actionState?: 'pending' | 'applied' | 'rejected';
}

interface AIState {
  /** Whether the AI Copilot side panel is open. */
  isOpen: boolean;
  /** Chat messages history. */
  messages: ChatMessage[];
  /** Active pending actions awaiting confirmation. */
  pendingActions: CanvasAction[] | null;
  /** Active highlighted node ids for visual diff glow. */
  diffNodeIds: string[];
  /** Whether AI is currently processing/thinking. */
  isThinking: boolean;

  // Actions
  togglePanel: () => void;
  setIsOpen: (isOpen: boolean) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setThinking: (isThinking: boolean) => void;
  setPendingActions: (actions: CanvasAction[] | null, diffNodeIds?: string[]) => void;
  clearDiff: () => void;
  clearHistory: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  isOpen: false,
  messages: [
    {
      id: 'msg_welcome',
      role: 'assistant',
      content:
        '你好！我是 Zorron AI 创作助手。你可以输入自然语言向我描述你想要创建的交互场景（问答、剧情测试、多选等），或者选中画布中的节点让我帮你修改属性与添加分支逻辑。',
      timestamp: Date.now(),
    },
  ],
  pendingActions: null,
  diffNodeIds: [],
  isThinking: false,

  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),
  setIsOpen: (isOpen) => set({ isOpen }),

  addMessage: (msg) => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({
      messages: [
        ...s.messages,
        { ...msg, id, timestamp: Date.now() },
      ],
    }));
    return id;
  },

  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  setThinking: (isThinking) => set({ isThinking }),

  setPendingActions: (actions, diffNodeIds = []) =>
    set({ pendingActions: actions, diffNodeIds }),

  clearDiff: () => set({ pendingActions: null, diffNodeIds: [] }),

  clearHistory: () =>
    set({
      messages: [
        {
          id: 'msg_welcome',
          role: 'assistant',
          content: '对话记录已清空。有什么我可以帮你的吗？',
          timestamp: Date.now(),
        },
      ],
      pendingActions: null,
      diffNodeIds: [],
    }),
}));
