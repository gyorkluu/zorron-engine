import { memo } from 'react';
import { Bot, User, Cpu } from 'lucide-react';
import type { ChatMessage } from '@/stores/aiStore';
import { AIActionCard } from './AIActionCard';
import { cn } from '@/lib/utils';

export interface AIChatMessageProps {
  message: ChatMessage;
}

function AIChatMessageImpl({ message }: AIChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="my-2 text-center text-[11px] text-slate-400 font-mono italic">
        {message.content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-2.5 my-3 text-xs leading-relaxed transition-all',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border shadow-md',
          isUser
            ? 'border-cyan-500/40 bg-cyan-600 text-white'
            : 'border-purple-500/40 bg-slate-900 text-purple-300',
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Message Box */}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-lg backdrop-blur-md',
          isUser
            ? 'rounded-tr-none bg-cyan-600/20 border border-cyan-500/30 text-cyan-100'
            : 'rounded-tl-none bg-slate-900/80 border border-slate-800 text-slate-200',
        )}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>

        {/* Action Card Attachment */}
        {message.actions && message.actions.length > 0 && (
          <AIActionCard
            messageId={message.id}
            actions={message.actions}
            issues={message.issues}
            actionState={message.actionState}
          />
        )}
      </div>
    </div>
  );
}

export const AIChatMessage = memo(AIChatMessageImpl);
