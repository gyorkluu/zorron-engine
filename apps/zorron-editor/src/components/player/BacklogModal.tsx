import { useEffect, useRef } from 'react';
import { BookOpen, X, Volume2, GitBranch } from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { getAudioManager } from '@/engine/AudioManager';
import type { BacklogItem } from '@/engine/GameEngine';

export interface BacklogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BacklogModal({ isOpen, onClose }: BacklogModalProps) {
  const engine = usePlayerStore((s) => s.engine);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const backlog: BacklogItem[] = engine ? engine.getBacklog() : [];

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isOpen, backlog.length]);

  if (!isOpen) return null;

  const handlePlayVoice = (voiceUrl?: string) => {
    if (!voiceUrl) return;
    getAudioManager().playVoice(voiceUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative flex h-[75vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">对话历史回顾 (BACKLOG)</h3>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
              {backlog.length} 条
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Backlog Items List */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-4 pr-2">
          {backlog.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              暂无历史对话记录
            </div>
          ) : (
            backlog.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl border border-white/5 bg-slate-900/50 p-3.5 transition-colors hover:border-cyan-500/20 hover:bg-slate-900/80"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.speaker ? (
                      <span className="rounded-md border border-cyan-500/30 bg-cyan-950/60 px-2 py-0.5 text-xs font-semibold text-cyan-300">
                        {item.speaker}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">旁白</span>
                    )}

                    {item.voiceUrl && (
                      <button
                        type="button"
                        onClick={() => handlePlayVoice(item.voiceUrl)}
                        title="重播角色语音"
                        className="flex items-center gap-1 rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                      >
                        <Volume2 size={11} />
                        <span>重播</span>
                      </button>
                    )}
                  </div>

                  <span className="font-mono text-[10px] text-slate-600">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-200">
                  {item.text}
                </p>

                {item.choiceSelected && (
                  <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/20 px-2.5 py-1 text-[11px] text-amber-300">
                    <GitBranch size={12} className="text-amber-400" />
                    <span>玩家选择：{item.choiceSelected}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
