import React, { useEffect, useState } from 'react';
import {
  Save,
  Download,
  Trash2,
  X,
  Clock,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import type { GameStateSnapshot } from '@/engine/GameEngine';
import { getAudioManager } from '@/engine/AudioManager';

export interface SaveLoadModalProps {
  isOpen: boolean;
  mode: 'save' | 'load';
  projectId?: string;
  onClose: () => void;
}

interface LocalSlot {
  slotIndex: number;
  snapshot: GameStateSnapshot | null;
  chapterTitle?: string;
  updatedAt?: number;
}

const STORAGE_PREFIX = 'zorron_save_slot_';

export function SaveLoadModal({ isOpen, mode, projectId = 'local_project', onClose }: SaveLoadModalProps) {
  const engine = usePlayerStore((s) => s.engine);
  const [slots, setSlots] = useState<LocalSlot[]>([]);
  const [activeTab, setActiveTab] = useState<'save' | 'load'>(mode);

  useEffect(() => {
    setActiveTab(mode);
  }, [mode]);

  // Load slots from localStorage (or fallback to local memory)
  const reloadSlots = () => {
    const loaded: LocalSlot[] = [];
    for (let i = 0; i < 10; i++) {
      const key = `${STORAGE_PREFIX}${projectId}_${i}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          loaded.push({
            slotIndex: i,
            snapshot: parsed.snapshot,
            chapterTitle: parsed.chapterTitle || `存档 ${i + 1}`,
            updatedAt: parsed.updatedAt || parsed.snapshot?.timestamp,
          });
        } catch {
          loaded.push({ slotIndex: i, snapshot: null });
        }
      } else {
        loaded.push({ slotIndex: i, snapshot: null });
      }
    }
    setSlots(loaded);
  };

  useEffect(() => {
    if (isOpen) {
      reloadSlots();
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const handleSaveSlot = (slotIndex: number) => {
    if (!engine) return;
    const audio = getAudioManager();
    const snap = engine.snapshot({
      bgmUrl: audio.getCurrentBgmUrl(),
      bgmPositionSec: audio.getBgmPosition(),
    });

    const currentNode = (engine as any)?.getNode?.(snap.currentNodeId);
    const chapterTitle =
      currentNode?.data?.label ||
      currentNode?.data?.interaction?.dialogue?.speaker ||
      `章节节点 #${snap.currentNodeId || slotIndex + 1}`;

    const payload = {
      slotIndex,
      snapshot: snap,
      chapterTitle,
      updatedAt: Date.now(),
    };

    localStorage.setItem(`${STORAGE_PREFIX}${projectId}_${slotIndex}`, JSON.stringify(payload));
    reloadSlots();
  };

  const handleLoadSlot = (slot: LocalSlot) => {
    if (!slot.snapshot || !engine) return;
    engine.restore(slot.snapshot);
    if (slot.snapshot.bgmUrl) {
      getAudioManager().playBgm(slot.snapshot.bgmUrl);
    }
    onClose();
  };

  const handleDeleteSlot = (slotIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem(`${STORAGE_PREFIX}${projectId}_${slotIndex}`);
    reloadSlots();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl">
        {/* Header with Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('save')}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
                activeTab === 'save'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Save size={15} />
              <span>保存存档 (SAVE)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('load')}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
                activeTab === 'load'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Download size={15} />
              <span>读取存档 (LOAD)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* 10 Save Slots Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {slots.map((slot) => {
            const hasData = slot.snapshot !== null;
            return (
              <div
                key={slot.slotIndex}
                onClick={() => (activeTab === 'save' ? handleSaveSlot(slot.slotIndex) : hasData && handleLoadSlot(slot))}
                className={`group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all cursor-pointer ${
                  hasData
                    ? 'border-cyan-500/30 bg-slate-900/80 hover:border-cyan-400 hover:bg-slate-800/90'
                    : 'border-slate-800/80 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-cyan-500/20 font-mono text-xs font-bold text-cyan-300">
                      {slot.slotIndex + 1}
                    </span>
                    <span className="font-medium text-xs text-slate-200 truncate max-w-[150px]">
                      {hasData ? slot.chapterTitle : '空白存档位'}
                    </span>
                  </div>

                  {hasData && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSlot(slot.slotIndex, e)}
                      title="清除此存档"
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 rounded transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  {hasData ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-slate-500" />
                        <span>{new Date(slot.updatedAt!).toLocaleDateString()} {new Date(slot.updatedAt!).toLocaleTimeString()}</span>
                      </div>
                      <span className="flex items-center gap-0.5 text-cyan-400">
                        <CheckCircle2 size={11} />
                        <span>{activeTab === 'load' ? '点击载入' : '覆盖'}</span>
                      </span>
                    </>
                  ) : (
                    <div className="flex items-center gap-1 text-slate-600">
                      <PlusCircle size={11} />
                      <span>{activeTab === 'save' ? '点击保存新进度' : '无数据'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
