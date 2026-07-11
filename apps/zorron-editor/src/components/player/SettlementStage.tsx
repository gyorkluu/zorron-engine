/**
 * SettlementStage - renders the final settlement result.
 *
 * Uses `.player-*` semantic classes (theme-aware) so the stage re-skins
 * automatically under modern / ancient / future themes. Sect badge,
 * character sprite, layered personality texts, an interactive 3D vector
 * radar (when enabled), settlement action buttons, and a restart button.
 */

import { memo, useMemo } from 'react';
import { useT } from '@/i18n/useT';
import { useProjectStore } from '@/stores/projectStore';
import type { GameState } from '@/engine/GameEngine';
import { VectorScene } from '@/components/vector3d/VectorScene';
import { SocialCardSummary } from './SocialCardSummary';
import cdnMapping from '@/assets/cdn-mapping.json';
import { featureFlags } from '@/lib/featureFlags';

/** Props for SettlementStage. */
export interface SettlementStageProps {
  state: GameState;
  onRestart?: () => void;
  onSettlementButton?: (buttonId: string) => void;
}

function SettlementStageImpl({ state, onRestart, onSettlementButton }: SettlementStageProps) {
  const { t } = useT();
  const result = state.settlementResult;
  const settings = useProjectStore((s) => s.settings);

  if (!result) return null;

  const layerA = result.resultTexts?.layerA;
  const layerB = result.resultTexts?.layerB;

  const spriteUrl = useMemo(() => {
    const sectId = result.anchor?.id;
    if (!sectId) return undefined;
    const key = `${sectId} - 已编辑.png` as keyof typeof cdnMapping;
    return cdnMapping[key] || `/workspace/sprite/${sectId} - 已编辑.png`;
  }, [result.anchor?.id]);

  const isVectorEnabled = settings.vectorSpace?.enabled ?? false;
  const axisLabels = settings.vectorSpace?.dimensions ?? {};
  const sects = useMemo(() => {
    if (!isVectorEnabled) return [];
    const list = settings.vectorSpace?.sects ?? [];
    if (list.length === 0 && result?.anchor) {
      return [result.anchor];
    }
    return list;
  }, [settings.vectorSpace?.sects, result?.anchor, isVectorEnabled]);

  const formatVectorValue = (val: number) => {
    const formatted = val.toFixed(2);
    return val >= 0 ? `+${formatted}` : formatted;
  };

  return (
    <div className="player-bg player-font relative h-full w-full overflow-hidden">
      {result.coverUrl && (
        <img
          src={result.coverUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, hsl(var(--p-bg) / 0.6), hsl(var(--p-bg) / 0.85), hsl(var(--p-bg)))',
        }}
      />

      <div className="player-text relative flex h-full flex-col items-center overflow-y-auto p-5 text-center sm:p-8">
        <div className="flex w-full max-w-3xl flex-col items-center gap-5">
          {/* Custom visual block: JX3 social card summary. */}
          {result.visualBlocks?.some((b) => b.type === 'social-card-summary') && result.variables && (
            <SocialCardSummary variables={result.variables} />
          )}

          {result.anchor && (
            <span className="player-btn player-radius-full px-4 py-1 text-sm uppercase tracking-widest">
              {result.anchor.name}
            </span>
          )}

          <h1 className="text-3xl font-bold sm:text-5xl">
            {result.title}
          </h1>

          {result.description && (
            <p className="player-text-muted max-w-xl">{result.description}</p>
          )}

          {/* Sect character sprite. */}
          {spriteUrl && (
            <img
              src={spriteUrl}
              alt={result.anchor?.name ?? ''}
              className="player-radius max-h-72 w-auto object-contain drop-shadow-2xl sm:max-h-96"
            />
          )}

          {/* Layered personality texts from the original project data. */}
          {layerA && (
            <div className="player-card w-full p-5 text-left backdrop-blur-sm">
              <p className="player-text whitespace-pre-wrap text-sm leading-7 sm:text-base sm:leading-8">
                {layerA}
              </p>
            </div>
          )}

          {layerB && (
            <div className="player-card w-full p-5 text-left backdrop-blur-sm" style={{ opacity: 0.85 }}>
              <p className="player-text-muted whitespace-pre-wrap text-sm leading-7 sm:text-base sm:leading-8">
                {layerB}
              </p>
            </div>
          )}

          {/* Interactive 3D vector radar — only when vectorSpace is enabled. */}
          {isVectorEnabled && featureFlags.vector3d && sects.length > 0 && (
            <div className="player-card w-full max-w-md p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="player-text-muted text-xs font-semibold uppercase tracking-wider">
                  {t('vector3d.title')}
                </h3>
                <span
                  className="player-radius-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: 'hsl(var(--p-accent) / 0.2)',
                    color: 'hsl(var(--p-accent-text))',
                  }}
                >
                  {t('vector3d.anchors', { n: sects.length })}
                </span>
              </div>
              <VectorScene
                axisLabels={axisLabels}
                sects={sects}
                userVector={result.finalVector ?? {}}
                highlightedAnchorId={result.anchor?.id ?? null}
                height={240}
              />
              <div className="mt-2 flex flex-wrap gap-2 text-center text-[10px]">
                {Object.entries(axisLabels).map(([axisId, label]) => (
                  <div key={axisId} className="player-surface player-radius min-w-[4rem] flex-1 p-1.5">
                    <div className="player-text-muted">{label}</div>
                    <div className="player-accent-text font-mono">
                      {formatVectorValue(result.finalVector?.[axisId] ?? 0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flat vector readout — only when vectorSpace is enabled but 3D feature flag is off. */}
          {isVectorEnabled && !featureFlags.vector3d && (
            <div className="mt-2 flex flex-wrap gap-2 text-center text-xs">
              {Object.entries(axisLabels).map(([axisId, label]) => (
                <div key={axisId} className="player-surface player-radius min-w-[4rem] flex-1 p-2">
                  <div className="player-text-muted mb-1 font-semibold">{label}</div>
                  <span className="player-accent-text font-mono">
                    {formatVectorValue(result.finalVector?.[axisId] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Vector stats (magnitude/quadrant/distance) — only when vectorSpace is enabled. */}
          {isVectorEnabled && (
            <div className="player-text-muted flex gap-3 text-xs">
              <span>
                {t('player.magnitude')} {(result.magnitude ?? 0).toFixed(2)}
              </span>
              <span>
                {t('player.quadrant')} {result.quadrant ?? ''}
              </span>
              <span>
                {t('player.distance')}{' '}
                {result.distance === Infinity ? '—' : result.distance.toFixed(2)}
              </span>
            </div>
          )}

          {/* Settlement action buttons (e.g. 查看结局 / 彩蛋按钮). */}
          {result.buttons && result.buttons.length > 0 && onSettlementButton && (
            <div className="flex flex-wrap justify-center gap-3">
              {result.buttons.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => onSettlementButton(btn.id)}
                  className="player-btn px-6 py-2.5 text-sm font-medium"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}

          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="player-surface player-border player-text player-radius px-6 py-2 text-sm transition-colors"
              style={{ opacity: 0.7 }}
            >
              {t('player.restart')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const SettlementStage = memo(SettlementStageImpl);
