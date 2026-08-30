/**
 * StartStage - intro screen for the start node.
 *
 * Uses semantic `.player-*` classes so it adapts to the active theme
 * (modern teal-dark or ancient gold-ink).
 */

import { memo } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
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
    <div className="player-bg relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-6 sm:p-10 text-center">
      {start.coverUrl && (
        <img
          src={start.coverUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25 filter blur-[1px]"
        />
      )}
      {/* Dynamic ambient radial gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/85 to-slate-950" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl sm:w-[32rem]" />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6 rounded-3xl border border-slate-800/60 bg-slate-950/40 p-8 shadow-2xl backdrop-blur-md sm:p-12">
        {/* Decorative Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-medium text-cyan-300 shadow-sm backdrop-blur-sm">
          <Sparkles size={13} className="animate-spin text-cyan-400" style={{ animationDuration: '6s' }} />
          <span>Zorron Engine · 互动体验</span>
        </div>

        {/* Hero Title with Gradient & Typography */}
        <div className="space-y-3">
          {start.title && (
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              <span className="bg-gradient-to-r from-slate-100 via-cyan-100 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
                {start.title}
              </span>
            </h1>
          )}
          {start.intro && (
            <p className="player-text-muted text-sm leading-relaxed sm:text-base">
              {start.intro}
            </p>
          )}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={advance}
          className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl border border-cyan-500/50 bg-gradient-to-r from-cyan-600/30 via-cyan-500/20 to-teal-500/30 px-8 py-3.5 text-base font-semibold text-cyan-100 shadow-lg shadow-cyan-500/20 backdrop-blur-sm transition-all duration-200 hover:scale-[1.03] hover:border-cyan-400 hover:bg-cyan-500/30 hover:text-white hover:shadow-cyan-500/30 active:scale-[0.98]"
        >
          <span>{t('player.begin')}</span>
          <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}

export const StartStage = memo(StartStageImpl);

