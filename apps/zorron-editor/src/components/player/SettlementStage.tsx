/**
 * SettlementStage - renders the final settlement result.
 *
 * Restores the original project layout: sect badge, character sprite,
 * layered personality texts (layerA / layerB), an interactive 3D vector
 * radar, settlement action buttons, and a restart button.
 */

import { memo, useMemo } from 'react';
import { useT } from '@/i18n/useT';
import { useProjectStore } from '@/stores/projectStore';
import type { GameState } from '@/engine/GameEngine';
import { VectorScene } from '@/components/vector3d/VectorScene';
import cdnMapping from '@/assets/cdn-mapping.json';

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
    const sectId = result.sect?.id;
    if (!sectId) return undefined;
    const key = `${sectId} - 已编辑.png` as keyof typeof cdnMapping;
    return cdnMapping[key] || `/workspace/sprite/${sectId} - 已编辑.png`;
  }, [result.sect?.id]);

  const axisLabels = settings.vectorSpace?.dimensions ?? { x: 'X', y: 'Y', z: 'Z' };
  const sects = settings.vectorSpace?.sects ?? [];

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {result.coverUrl && (
        <img
          src={result.coverUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/85 to-slate-950" />

      <div className="relative flex h-full flex-col items-center overflow-y-auto p-5 text-center sm:p-8">
        <div className="flex w-full max-w-3xl flex-col items-center gap-5">
          {result.sect && (
            <span className="rounded-full border border-pink-400/40 bg-pink-500/10 px-4 py-1 text-sm uppercase tracking-widest text-pink-200">
              {result.sect.name}
            </span>
          )}

          <h1 className="text-3xl font-bold text-slate-100 sm:text-5xl">
            {result.title}
          </h1>

          {result.description && (
            <p className="max-w-xl text-slate-300">{result.description}</p>
          )}

          {/* Sect character sprite. */}
          {spriteUrl && (
            <img
              src={spriteUrl}
              alt={result.sect?.name ?? ''}
              className="max-h-72 w-auto rounded-xl object-contain drop-shadow-2xl sm:max-h-96"
            />
          )}

          {/* Layered personality texts from the original project data. */}
          {layerA && (
            <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 text-left backdrop-blur-sm">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200 sm:text-base sm:leading-8">
                {layerA}
              </p>
            </div>
          )}

          {layerB && (
            <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/40 p-5 text-left backdrop-blur-sm">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
                {layerB}
              </p>
            </div>
          )}

          {/* Interactive 3D vector radar. */}
          {sects.length > 0 && (
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t('vector3d.title')}
                </h3>
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
                  {t('vector3d.sects', { n: sects.length })}
                </span>
              </div>
              <VectorScene
                axisLabels={axisLabels}
                sects={sects}
                userVector={result.finalVector}
                highlightedSectId={result.sect?.id ?? null}
                height={240}
              />
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="rounded-md bg-slate-900/60 p-1.5">
                  <div className="text-red-400">{axisLabels.x}</div>
                  <div className="font-mono text-cyan-300">{result.finalVector.x.toFixed(2)}</div>
                </div>
                <div className="rounded-md bg-slate-900/60 p-1.5">
                  <div className="text-green-400">{axisLabels.y}</div>
                  <div className="font-mono text-cyan-300">{result.finalVector.y.toFixed(2)}</div>
                </div>
                <div className="rounded-md bg-slate-900/60 p-1.5">
                  <div className="text-blue-400">{axisLabels.z}</div>
                  <div className="font-mono text-cyan-300">{result.finalVector.z.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 text-xs text-slate-500">
            <span>
              {t('player.magnitude')} {result.magnitude.toFixed(2)}
            </span>
            <span>
              {t('player.quadrant')} {result.quadrant}
            </span>
            <span>
              {t('player.distance')}{' '}
              {result.distance === Infinity ? '—' : result.distance.toFixed(2)}
            </span>
          </div>

          {/* Settlement action buttons (e.g. 查看结局 / 彩蛋按钮). */}
          {result.buttons && result.buttons.length > 0 && onSettlementButton && (
            <div className="flex flex-wrap justify-center gap-3">
              {result.buttons.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => onSettlementButton(btn.id)}
                  className="rounded-full bg-gradient-to-r from-pink-600 to-rose-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg hover:from-pink-500 hover:to-rose-400"
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
              className="rounded-full border border-slate-600 bg-slate-900/70 px-6 py-2 text-sm text-slate-200 hover:bg-slate-800"
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
