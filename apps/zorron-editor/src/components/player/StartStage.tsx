/**
 * StartStage - intro screen for the start node.
 *
 * Uses semantic `.player-*` classes so it adapts to the active theme
 * (modern teal-dark or ancient gold-ink).
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
    <div className="player-bg relative flex h-full w-full flex-col items-center justify-center gap-6 p-8 text-center">
      {start.coverUrl && (
        <img
          src={start.coverUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/90" />
      <div className="relative space-y-4">
        {start.title && (
          <h1 className="player-text text-4xl font-bold sm:text-5xl">{start.title}</h1>
        )}
        {start.intro && (
          <p className="player-text-muted max-w-md">{start.intro}</p>
        )}
      </div>
      <button
        type="button"
        onClick={advance}
        className="player-btn relative px-8 py-3 text-sm font-medium"
      >
        {t('player.begin')}
      </button>
    </div>
  );
}

export const StartStage = memo(StartStageImpl);
