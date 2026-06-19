/**
 * PlayerShell - top-level player component.
 *
 * Subscribes to the player store and dispatches to the correct stage based on
 * the current node type. Also manages the audio manager lifecycle.
 */

import { useEffect, memo } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { getAudioManager } from '@/engine/AudioManager';
import { StartStage } from './StartStage';
import { SceneStage } from './SceneStage';
import { VideoStage } from './VideoStage';
import { LinkStage } from './LinkStage';
import { SettlementStage } from './SettlementStage';
import type { FlowData } from '@/types/flow';

/** Props for PlayerShell. */
export interface PlayerShellProps {
  /** The flow data to play. */
  flowData: FlowData;
  /** Called when the user exits the player. */
  onExit?: () => void;
}

function PlayerShellImpl({ flowData, onExit }: PlayerShellProps) {
  const state = usePlayerStore((s) => s.state);
  const isRunning = usePlayerStore((s) => s.isRunning);
  const start = usePlayerStore((s) => s.start);
  const restart = usePlayerStore((s) => s.restart);
  const stop = usePlayerStore((s) => s.stop);

  // Boot the engine on mount or when flowData changes.
  useEffect(() => {
    start(flowData);
    return () => {
      stop();
      getAudioManager().stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowData]);

  // Drive BGM from the current scene.
  useEffect(() => {
    if (state?.scene?.bgm) {
      getAudioManager().playBgm(state.scene.bgm);
    }
  }, [state?.scene?.bgm]);

  if (!isRunning || !state) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {state.currentNodeType === 'start' && <StartStage state={state} />}
      {state.currentNodeType === 'scene' && <SceneStage state={state} />}
      {state.currentNodeType === 'video' && <VideoStage state={state} />}
      {state.currentNodeType === 'link' && <LinkStage state={state} />}
      {state.currentNodeType === 'settlement' && (
        <SettlementStage state={state} onRestart={restart} />
      )}

      {onExit && (
        <button
          type="button"
          onClick={onExit}
          className="absolute left-4 top-4 z-10 rounded-full border border-slate-600 bg-slate-900/70 px-4 py-2 text-xs text-slate-200 backdrop-blur-sm hover:bg-slate-800"
        >
          Exit
        </button>
      )}
    </div>
  );
}

export const PlayerShell = memo(PlayerShellImpl);
