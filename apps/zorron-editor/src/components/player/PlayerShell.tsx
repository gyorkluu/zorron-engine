/**
 * PlayerShell - top-level player component.
 *
 * Subscribes to the player store and dispatches to the correct stage based on
 * the current node type. Also manages the audio manager lifecycle.
 */

import { useEffect, useState, memo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layout,
  FolderKanban,
  RotateCcw,
  Sparkles,
  Save,
  Download,
  BookOpen,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { useT } from '@/i18n/useT';
import { getAudioManager } from '@/engine/AudioManager';
import { getPlayerStage } from '@/engine/nodeRegistry';
// Side-effect import: registers every built-in node type so the registry can
// resolve a PlayerStage renderer below.
import '@/components/flow/nodes';
import { resolveMediaUrl } from '@/lib/media';
import { SaveLoadModal } from './SaveLoadModal';
import { BacklogModal } from './BacklogModal';
import type { FlowData } from '@/types/flow';

/** Props for PlayerShell. */
export interface PlayerShellProps {
  /** The flow data to play. */
  flowData: FlowData;
  /** Called when the user exits the player. */
  onExit?: () => void;
}

function PlayerShellImpl({ flowData, onExit }: PlayerShellProps) {
  const { t } = useT();
  const navigate = useNavigate();
  const state = usePlayerStore((s) => s.state);
  const [isSaveLoadOpen, setIsSaveLoadOpen] = useState(false);
  const [saveLoadMode, setSaveLoadMode] = useState<'save' | 'load'>('save');
  const [isBacklogOpen, setIsBacklogOpen] = useState(false);
  const isRunning = usePlayerStore((s) => s.isRunning);
  const start = usePlayerStore((s) => s.start);
  const restart = usePlayerStore((s) => s.restart);
  const selectSettlementButton = usePlayerStore((s) => s.selectSettlementButton);
  const stop = usePlayerStore((s) => s.stop);
  const globalBgmUrl = resolveMediaUrl(flowData.settings?.bgmUrl);
  const theme = flowData.settings?.theme ?? 'modern';

  // Boot the engine on mount or when flowData changes.
  useEffect(() => {
    start(flowData);
    return () => {
      stop();
      getAudioManager().stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowData]);

  // Unlock audio on first user gesture inside the player shell.
  const unlockAudio = useCallback(() => {
    void getAudioManager().unlock();
  }, []);

  // Drive BGM from the current scene or project settings.
  useEffect(() => {
    const sceneBgm = resolveMediaUrl(
      state?.scene?.bgm,
      state?.scene?.isBackgroundRemote,
    );
    const url = sceneBgm ?? globalBgmUrl;
    if (url) {
      getAudioManager().playBgm(url);
    } else if (state?.currentNodeType === 'settlement') {
      getAudioManager().stopAll();
    }
  }, [state?.scene?.bgm, state?.scene?.isBackgroundRemote, state?.currentNodeType, globalBgmUrl]);

  // Drive one-shot SFX when entering a new scene.
  useEffect(() => {
    const sfxUrl = resolveMediaUrl(state?.scene?.sfx);
    if (sfxUrl) {
      getAudioManager().playSfx(sfxUrl);
    }
  }, [state?.scene?.sfx]);

  if (!isRunning || !state) {
    return (
      <div data-theme={theme} className="player-bg player-font flex h-full w-full items-center justify-center text-slate-400">
        {t('player.loading')}
      </div>
    );
  }

  /**
   * Resolve the current node's renderer from the node registry.
   *
   * Node types declare their `PlayerStage` in `definitions.ts`, so supporting a
   * new node type in the player requires no change to this shell.
   */
  const renderStage = () => {
    const nodeType = state.currentNodeType;
    if (!nodeType) return null;
    const Stage = getPlayerStage(nodeType);
    if (!Stage) return null;
    return (
      <Stage
        state={state}
        onRestart={restart}
        onSettlementButton={selectSettlementButton}
      />
    );
  };

  return (
    <div
      data-theme={theme}
      className="player-bg player-font relative h-full w-full overflow-hidden"
      onClick={unlockAudio}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') unlockAudio();
      }}
    >
      {/* Top Floating Header & Navigation Bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between p-3 sm:p-4">
        {/* Left: Quick exit & current status badge */}
        <div className="pointer-events-auto flex items-center gap-2">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-900/80 px-3.5 py-1.5 text-xs font-medium text-slate-300 shadow-md backdrop-blur-md transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              <RotateCcw size={12} />
              <span>{t('player.restart')}</span>
            </button>
          )}
          <div className="hidden items-center gap-1.5 rounded-full border border-slate-800/60 bg-slate-950/60 px-3 py-1 text-[11px] font-medium text-slate-400 backdrop-blur-md sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="capitalize">{state.currentNodeType} 节点</span>
          </div>
        </div>

        {/* Center/Right: GalGame Quick Toolset (Save, Load, Backlog) */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSaveLoadMode('save');
              setIsSaveLoadOpen(true);
            }}
            className="flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 shadow-md backdrop-blur-md hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
            title="保存当前进度 (F5)"
          >
            <Save size={12} />
            <span>保存</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSaveLoadMode('load');
              setIsSaveLoadOpen(true);
            }}
            className="flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 shadow-md backdrop-blur-md hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
            title="读取存档 (F8)"
          >
            <Download size={12} />
            <span>读取</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBacklogOpen(true)}
            className="flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 shadow-md backdrop-blur-md hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
            title="查看历史对话记录 (L)"
          >
            <BookOpen size={12} />
            <span>回顾</span>
          </button>
        </div>

        {/* Right: Quick shortcuts to Editor & Projects */}
        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            to="/projects"
            className="flex items-center gap-1.5 rounded-full border border-slate-800/80 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 shadow-lg backdrop-blur-md transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white"
            title="查看云端工程列表"
          >
            <FolderKanban size={13} className="text-slate-400" />
            <span className="hidden sm:inline">工程列表</span>
          </Link>
          <Link
            to="/editor"
            className="group flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-1.5 text-xs font-medium text-cyan-200 shadow-lg shadow-cyan-500/10 backdrop-blur-md transition-all hover:border-cyan-400 hover:bg-cyan-500/25 hover:text-white"
            title="进入可视化节点编辑器"
          >
            <Layout size={13} className="text-cyan-400 transition-transform group-hover:scale-110" />
            <span>节点编辑器</span>
          </Link>
        </div>
      </header>

      {/* Current node's stage — resolved from the node registry. */}
      {renderStage()}

      {/* GalGame Modals */}
      <SaveLoadModal
        isOpen={isSaveLoadOpen}
        mode={saveLoadMode}
        onClose={() => setIsSaveLoadOpen(false)}
      />
      <BacklogModal
        isOpen={isBacklogOpen}
        onClose={() => setIsBacklogOpen(false)}
      />
    </div>
  );
}

export const PlayerShell = memo(PlayerShellImpl);

