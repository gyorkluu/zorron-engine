/**
 * StartStage - intro screen for the start node.
 */

import { memo } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useT } from '@/i18n/useT';
import type { GameState } from '@/engine/GameEngine';

/** Props for StartStage. */
export interface StartStageProps {
  state: GameState;
}

function StartStageImpl({ state }: StartStageProps) {
  const { t } = useT();
  const advance = usePlayerStore((s) => s.advanceFromStart);
  const start = state.start;
  if (!start) return null;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-6 bg-slate-950 p-8 text-center">
      {start.coverUrl && (
        <img
          src={start.coverUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 to-slate-950" />
      <div className="relative space-y-4">
        {start.title && (
          <h1 className="text-4xl font-bold text-slate-100 sm:text-5xl">{start.title}</h1>
        )}
        {start.intro && (
          <p className="max-w-md text-slate-300">{start.intro}</p>
        )}
      </div>
      <button
        type="button"
        onClick={advance}
        className="relative rounded-full bg-cyan-500/20 px-8 py-3 text-sm font-medium text-cyan-200 hover:bg-cyan-500/30"
      >
        {t('player.begin')}
      </button>
    </div>
  );
}

export const StartStage = memo(StartStageImpl);
