/**
 * PlayerShell - top-level player component.
 *
 * Subscribes to the player store and dispatches to the correct stage based on
 * the current node type. Also manages the audio manager lifecycle.
 */

import { useEffect, useState, memo, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { useGalgameStore } from '@/stores/galgameStore';
import { useT } from '@/i18n/useT';
import { getAudioManager } from '@/engine/AudioManager';
import { getPlayerStage } from '@/engine/nodeRegistry';
// Side-effect import: registers every built-in node type so the registry can
// resolve a PlayerStage renderer below.
import '@/components/flow/nodes';
import { resolveMediaUrl } from '@/lib/media';
import { SaveLoadModal } from './SaveLoadModal';
import { BacklogModal } from './BacklogModal';
import { SettingsModal } from './SettingsModal';
import { PlayerControlBar } from './PlayerControlBar';
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

  // GalGame playback state: preferences, Auto/Skip modes and read tracking.
  const settings = useGalgameStore((s) => s.settings);
  const settingsOpen = useGalgameStore((s) => s.settingsOpen);
  const setSettingsOpen = useGalgameStore((s) => s.setSettingsOpen);
  const autoMode = useGalgameStore((s) => s.autoMode);
  const skipMode = useGalgameStore((s) => s.skipMode);
  const resetModes = useGalgameStore((s) => s.resetModes);

  // Push volume preferences into the 4-track mixer.
  useEffect(() => {
    const audio = getAudioManager();
    audio.setTrackVolume('bgm', settings.bgmVolume);
    audio.setTrackVolume('ambient', settings.ambientVolume);
    audio.setTrackVolume('voice', settings.voiceVolume);
    audio.setTrackVolume('sfx', settings.sfxVolume);
  }, [
    settings.bgmVolume,
    settings.ambientVolume,
    settings.voiceVolume,
    settings.sfxVolume,
  ]);

  // GalGame shortcuts: Backspace steps back, L opens the backlog.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        resetModes();
        usePlayerStore.getState().engine?.goBack();
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsBacklogOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [resetModes]);

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

  /** Restart from the top, disengaging Auto/Skip first. */
  const handleRestart = useCallback(() => {
    resetModes();
    restart();
  }, [restart, resetModes]);

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
        onRestart={handleRestart}
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
      {/* Top bar: restart on the left, active playback modes on the right. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between p-3 sm:p-4">
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
        </div>

        {(autoMode || skipMode) && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-200 backdrop-blur-md">
            {autoMode ? <span>Auto</span> : null}
            {skipMode ? <span>Skip</span> : null}
          </div>
        )}
      </header>

      {/* Current node's stage — resolved from the node registry. */}
      {renderStage()}

      {/* GalGame playback toolbar: Auto / Skip / step-back / save / settings */}
      <PlayerControlBar
        onOpenBacklog={() => setIsBacklogOpen(true)}
        onOpenSave={() => {
          setSaveLoadMode('save');
          setIsSaveLoadOpen(true);
        }}
        onOpenLoad={() => {
          setSaveLoadMode('load');
          setIsSaveLoadOpen(true);
        }}
      />

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
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export const PlayerShell = memo(PlayerShellImpl);

