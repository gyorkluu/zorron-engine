import React, { useEffect, useCallback } from 'react';
import { useTypewriter } from '@/hooks/useTypewriter';
import { ChoiceLayer } from './ChoiceLayer';
import { DualVideoStage } from './DualVideoStage';
import { getAudioManager } from '@/engine/AudioManager';
import { usePlayerStore } from '@/stores/playerStore';
import type { GameState } from '@/engine/GameEngine';
import type { PlayerStageProps } from '@/engine/processors/types';
import type { StageHitbox } from '@/types/flow';

export interface StageStageProps {
  state: GameState;
}

export function StageStage({ state, characters }: PlayerStageProps) {
  const stage = state.stage;
  const selectChoice = usePlayerStore((s) => s.selectChoice);
  const engine = usePlayerStore((s) => s.engine);

  const dialogue = stage?.interaction?.dialogue;

  // Resolve the speaker: a character reference wins over the free-text name,
  // and gives us the accent colour plus the current expression's sprite.
  const speaker = characters?.find((c) => c.id === dialogue?.characterId);
  const speakerName = speaker?.name ?? dialogue?.speaker;
  const speakerColor = speaker?.color ?? '#22d3ee';
  const speakerSprite =
    speaker?.expressions?.find((e) => e.id === dialogue?.expression)?.url ??
    speaker?.portraitUrl;
  const { displayed, done, skip } = useTypewriter({
    text: dialogue?.text ?? '',
    speed: dialogue?.typewriterSpeed ?? 25,
  });

  const audioManager = getAudioManager();

  // ── 1. Audio Channels Orchestration ───────────────────────────
  useEffect(() => {
    if (!stage) return;

    // BGM track
    if (stage.fx?.bgm?.url) {
      audioManager.playBgm(
        stage.fx.bgm.url,
        stage.fx.bgm.volume ?? 0.8,
        stage.fx.bgm.fadeInMs ?? 1000,
      );
    }

    // Ambient track
    if (stage.fx?.ambient?.url) {
      audioManager.playAmbient(
        stage.fx.ambient.url,
        stage.fx.ambient.volume ?? 0.6,
      );
    }

    // Voice track
    if (dialogue?.voiceUrl) {
      audioManager.playVoice(dialogue.voiceUrl);
    }

    return () => {
      audioManager.stopVoice();
    };
  }, [stage, dialogue?.voiceUrl]);

  // ── 2. Hitbox Interaction ─────────────────────────────────────
  const handleHitboxClick = useCallback(
    (hb: StageHitbox) => {
      if (hb.soundEffect) {
        audioManager.playSfx(hb.soundEffect);
      }
      if ((hb.action === 'jump' || !hb.action || hb.targetNodeId) && hb.targetNodeId && engine) {
        engine.advanceFromStage(hb.targetNodeId);
      } else if ((hb.action === 'collect' || hb.fragmentId) && hb.fragmentId) {
        // Collect fragment
        if (engine) {
          (engine as any).fragments?.add(hb.fragmentId);
        }
      }
    },
    [engine, audioManager],
  );

  // ── 3. QTE Timeout Fallback ───────────────────────────────────
  const handleQteTimeout = useCallback(() => {
    if (stage?.interaction?.defaultTimeoutTargetNodeId && engine) {
      engine.advanceFromStage(stage.interaction.defaultTimeoutTargetNodeId);
    }
  }, [stage?.interaction?.defaultTimeoutTargetNodeId, engine]);

  // ── 4. Video End Auto Advance ──────────────────────────────────
  const handleVideoEnd = useCallback(() => {
    // If there are no choices or active hitboxes, auto advance
    if ((state.choices.length === 0) && engine) {
      engine.advanceFromStage();
    }
  }, [state.choices.length, engine]);

  if (!stage) return null;

  const preloadUrls = (stage.flow?.preloadNext || [])
    .map((nodeId) => {
      const targetNode = (engine as any)?.nodes?.find((n: any) => n.id === nodeId);
      return targetNode?.data?.carrier?.url || targetNode?.data?.videoUrl;
    })
    .filter(Boolean);

  return (
    <div className="player-bg relative h-full w-full overflow-hidden bg-black select-none">
      {/* ── Visual Carrier & Dual Video Pool Layer ───────────── */}
      <div className="absolute inset-0 z-0">
        <DualVideoStage
          carrier={stage.carrier}
          interaction={stage.interaction}
          fx={stage.fx}
          preloadNextUrls={preloadUrls}
          onVideoEnd={handleVideoEnd}
          onHitboxClick={handleHitboxClick}
          onQteTimeout={handleQteTimeout}
        />
      </div>

      {/* ── Foreground Interactive UI (Choices + Dialogue) ───── */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-end overflow-y-auto p-4 sm:p-6 pointer-events-none">
        {/* Choices layer */}
        {state.choices.length > 0 && (
          <div className="mb-4 w-full max-w-lg sm:max-w-xl md:max-w-2xl pointer-events-auto">
            <ChoiceLayer choices={state.choices} onSelect={selectChoice} />
          </div>
        )}

        {/* Character sprite (only when the referenced character has one). */}
        {speakerSprite && (
          <div className="mb-2 flex justify-center">
            <img
              src={speakerSprite}
              alt={speakerName ?? ''}
              className="max-h-32 w-auto object-contain drop-shadow-2xl sm:max-h-44"
            />
          </div>
        )}

        {/* Dialogue Box */}
        {dialogue?.text && (
          <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl pointer-events-auto">
            <div
              onClick={skip}
              className="player-card relative cursor-pointer rounded-xl border border-white/10 bg-black/60 p-4 shadow-2xl backdrop-blur-md transition-all hover:bg-black/70 sm:p-5"
              style={speaker ? { borderColor: `${speakerColor}44` } : undefined}
            >
              {speakerName && (
                <div
                  className="absolute -top-3 left-4 inline-flex items-center rounded-md border px-3 py-0.5 text-xs font-semibold shadow-md"
                  style={{
                    borderColor: `${speakerColor}55`,
                    background: `${speakerColor}1f`,
                    color: speakerColor,
                  }}
                >
                  {speakerName}
                </div>
              )}
              <p className="player-text min-h-[2.5rem] text-sm leading-relaxed text-slate-100 sm:text-base">
                {displayed}
                {!done && <span className="text-cyan-400 ml-0.5 animate-pulse font-bold">▌</span>}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
