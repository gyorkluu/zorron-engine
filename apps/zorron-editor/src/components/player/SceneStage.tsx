/**
 * SceneStage - renders a scene node: background, focus object, character,
 * dialogue and choices with ancient-Chinese visual styling and mobile adaptation.
 *
 * Ported from the legacy Vue Player.vue while keeping the React implementation
 * framework-agnostic (media is driven by GameState).
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
    <div className="zorron-scene relative h-full w-full overflow-hidden bg-slate-950 font-serif text-[#f5f0e6]">
      {/* Background layer */}
      <div className="scene-bg-layer absolute inset-0 z-0">
        {backgroundUrl ? (
          <img
            src={backgroundUrl}
            alt=""
            className="scene-bg-img h-full w-full object-cover"
          />
        ) : null}
        <div className="scene-bg-overlay absolute inset-0" />
      </div>

      {/* Focus object / item layer */}
      {focusObjectUrl && (
        <div className="scene-focus-layer absolute left-1/2 top-[30%] z-[2] w-[200px] -translate-x-1/2 -translate-y-1/2 sm:top-[32%] sm:w-[260px] md:w-[300px]">
          <img
            src={focusObjectUrl}
            alt=""
            className="scene-focus-img h-full w-full object-contain drop-shadow-[0_0_25px_rgba(212,175,55,0.4)]"
          />
        </div>
      )}

      {/* Choices layer */}
      <div
        className={`scene-choices-layer absolute left-1/2 top-[50%] z-[5] -translate-x-1/2 -translate-y-1/2 ${focusObjectUrl ? 'mt-20 sm:mt-28 md:mt-36' : ''}`}>
        {done && state.choices.length > 0 && <ChoiceLayer choices={state.choices} />}
      </div>

      {/* Dialogue + character layer */}
      <div className="scene-dialogue-layer absolute inset-x-0 bottom-0 z-10 flex flex-col items-center justify-end p-3 sm:p-4 md:bottom-6 md:p-6">
        <div className="scene-dialogue-wrapper relative flex w-full max-w-[380px] items-end justify-center sm:max-w-[520px] md:max-w-[700px]">
          {/* Character portrait */}
          {characterUrl && (
            <div className="scene-character-container pointer-events-none relative z-[11] -mb-2 -mr-10 h-[140px] sm:-mr-12 sm:h-[180px] md:-mr-20 md:h-[280px] lg:h-[340px]">
              <div className="scene-character-glow absolute bottom-0 left-1/2 h-[180px] w-[110px] -translate-x-1/2 sm:h-[220px] sm:w-[140px] md:h-[320px] md:w-[200px]" />
              <img
                src={characterUrl}
                alt=""
                className="scene-character-img relative h-full w-auto object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.3)]"
              />
            </div>
          )}

          {/* Dialogue box */}
          <div
            onClick={skip}
            className="scene-dialogue-box relative z-10 w-full cursor-pointer rounded-sm border border-[rgba(212,175,55,0.15)] bg-gradient-to-br from-[rgba(20,18,15,0.92)] to-[rgba(30,25,20,0.88)] p-4 backdrop-blur-md sm:p-5 md:p-7"
          >
            {scene?.speaker && (
              <div className="scene-speaker-nameplate absolute -top-4 left-3 inline-flex items-center rounded-sm bg-gradient-to-br from-[rgba(201,64,67,0.9)] to-[rgba(180,50,53,0.9)] px-4 py-1.5 text-xs font-semibold tracking-[3px] text-[#f5f0e6] sm:-top-5 sm:px-5 sm:text-[13px] md:left-6">
                {scene.speaker}
              </div>
            )}
            <p className="min-h-[3.5rem] text-sm leading-relaxed text-[#e8e0d0] text-shadow-sm sm:text-base sm:leading-relaxed md:text-lg md:leading-[2]">
              {displayed}
              {!done && <span className="ml-0.5 animate-pulse">▌</span>}
            </p>
            <div className="scene-continue-indicator absolute bottom-3 right-4 md:bottom-4 md:right-6">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.6)] animate-bounce" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const SceneStage = memo(SceneStageImpl);
