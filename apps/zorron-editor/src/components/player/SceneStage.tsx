/**
 * SceneStage - renders a scene node: background, focus object, character,
 * dialogue and choices.
 *
 * Uses `.player-*` semantic classes so the entire scene re-skins when the
 * player theme changes (modern teal-dark / ancient gold-ink). Keeps the
 * typewriter effect and atmospheric media layers.
 */

import { memo } from 'react';
import { useTypewriter } from '@/hooks/useTypewriter';
import { resolveMediaUrl } from '@/lib/media';
import { ChoiceLayer } from './ChoiceLayer';
import type { GameState } from '@/engine/GameEngine';

/** Props for SceneStage. */
export interface SceneStageProps {
  state: GameState;
}

function SceneStageImpl({ state }: SceneStageProps) {
  const scene = state.scene;
  const { displayed, done, skip } = useTypewriter({
    text: scene?.dialogue ?? '',
    speed: 25,
  });

  const backgroundUrl = resolveMediaUrl(
    scene?.backgroundUrl ?? scene?.background,
    scene?.isBackgroundRemote,
  );
  const characterUrl = resolveMediaUrl(
    scene?.characterUrl ?? scene?.spiritGuide ?? scene?.character,
    scene?.isSpiritGuideRemote,
  );
  const focusObjectUrl = resolveMediaUrl(scene?.focusObject, scene?.isFocusObjectRemote);

  return (
    <div className="player-bg relative h-full w-full overflow-hidden">
      {/* Background layer */}
      <div className="absolute inset-0 z-0">
        {backgroundUrl ? (
          <img src={backgroundUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black/90" />
      </div>

      {/* Focus object / item layer */}
      {focusObjectUrl && (
        <div className="absolute left-1/2 top-[28%] z-[2] w-[180px] -translate-x-1/2 -translate-y-1/2 sm:w-[240px] md:w-[280px]">
          <img
            src={focusObjectUrl}
            alt=""
            className="h-full w-full object-contain drop-shadow-[0_0_20px_hsl(var(--p-accent)/0.3)]"
          />
        </div>
      )}

      {/* Main content: dialogue + choices, scrollable when many options */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-end overflow-y-auto p-3 sm:p-4 md:p-6">
        {/* Choices layer */}
        {done && state.choices.length > 0 && (
          <div className={`mb-3 w-full max-w-lg sm:max-w-xl md:max-w-2xl ${focusObjectUrl ? 'mt-12' : ''} ${state.choices.length > 8 ? 'mt-auto mb-auto pt-4' : ''}`}>
            <ChoiceLayer choices={state.choices} />
          </div>
        )}

        {/* Dialogue + character layer */}
        <div className="flex w-full max-w-lg flex-col items-center justify-end sm:max-w-xl md:max-w-2xl">
          <div className="relative flex w-full items-end justify-center">
            {/* Character portrait */}
            {characterUrl && (
              <div className="pointer-events-none relative z-[11] -mb-2 -mr-8 h-[120px] sm:-mr-10 sm:h-[160px] md:-mr-16 md:h-[220px] lg:h-[280px]">
                <img
                  src={characterUrl}
                  alt=""
                  className="relative h-full w-auto object-contain drop-shadow-[0_0_16px_hsl(var(--p-accent)/0.25)]"
                />
              </div>
            )}

            {/* Dialogue box */}
            <div
              onClick={skip}
              className="player-card relative z-10 w-full cursor-pointer p-4 backdrop-blur-md sm:p-5"
            >
              {scene?.speaker && (
                <div className="player-btn absolute -top-3 left-3 inline-flex items-center px-3 py-1 text-xs font-medium tracking-wide sm:px-4">
                  {scene.speaker}
                </div>
              )}
              <p className="player-text min-h-[2.5rem] text-sm leading-relaxed sm:text-base">
                {displayed}
                {!done && <span className="player-accent-text ml-0.5 animate-pulse">▌</span>}
              </p>
              {!done && (
                <div className="absolute bottom-3 right-4">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: 'hsl(var(--p-accent))', boxShadow: '0 0 8px hsl(var(--p-accent) / 0.5)' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const SceneStage = memo(SceneStageImpl);
