/**
 * SceneStage - renders a scene node: background, character, dialogue and choices.
 */

import { memo } from 'react';
import { useTypewriter } from '@/hooks/useTypewriter';
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

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Background */}
      {scene?.backgroundUrl && (
        <img
          src={scene.backgroundUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

      {/* Character */}
      {scene?.characterUrl && (
        <img
          src={scene.characterUrl}
          alt=""
          className="absolute bottom-32 left-1/2 max-h-[60%] -translate-x-1/2 object-contain drop-shadow-2xl"
        />
      )}

      {/* Speaker + dialogue */}
      <div className="absolute inset-x-0 bottom-0 space-y-3 p-6">
        {scene?.speaker && (
          <p className="text-sm font-semibold text-cyan-300">{scene.speaker}</p>
        )}
        <div
          onClick={skip}
          className="cursor-pointer rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 backdrop-blur-md"
        >
          <p className="min-h-[3rem] text-base leading-relaxed text-slate-100">
            {displayed}
            {!done && <span className="ml-0.5 animate-pulse">▌</span>}
          </p>
        </div>
        {done && state.choices.length > 0 && <ChoiceLayer choices={state.choices} />}
      </div>
    </div>
  );
}

export const SceneStage = memo(SceneStageImpl);
