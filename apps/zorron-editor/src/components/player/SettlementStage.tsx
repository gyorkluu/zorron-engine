/**
 * SettlementStage - renders the final settlement result.
 */

import { memo } from 'react';
import type { GameState } from '@/engine/GameEngine';
import { VectorSpacePanel } from '@/components/vector3d/VectorSpacePanel';
import { featureFlags } from '@/lib/featureFlags';

/** Props for SettlementStage. */
export interface SettlementStageProps {
  state: GameState;
  onRestart?: () => void;
}

function SettlementStageImpl({ state, onRestart }: SettlementStageProps) {
  const result = state.settlementResult;
  if (!result) return null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {result.coverUrl && (
        <img
          src={result.coverUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/80 to-slate-950" />

      <div className="relative flex h-full flex-col items-center justify-center gap-6 overflow-y-auto p-8 text-center">
        {result.sect && (
          <span className="rounded-full border border-pink-400/40 bg-pink-500/10 px-4 py-1 text-sm uppercase tracking-widest text-pink-200">
            {result.sect.name}
          </span>
        )}
        <h1 className="text-4xl font-bold text-slate-100 sm:text-5xl">
          {result.title}
        </h1>
        {result.description && (
          <p className="max-w-xl text-slate-300">{result.description}</p>
        )}

        {/* 3D vector space visualization (feature-flagged). */}
        {featureFlags.vector3d && (
          <div className="w-full max-w-md">
            <VectorSpacePanel
              userVector={result.finalVector}
              highlightedSectId={result.sect?.id ?? null}
              compact
            />
          </div>
        )}

        {/* Vector readout (always shown as a fallback). */}
        {!featureFlags.vector3d && (
          <div className="grid grid-cols-3 gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 backdrop-blur-sm">
            <VectorReadout label="X" value={result.finalVector.x} />
            <VectorReadout label="Y" value={result.finalVector.y} />
            <VectorReadout label="Z" value={result.finalVector.z} />
          </div>
        )}

        <div className="flex gap-3 text-xs text-slate-500">
          <span>Magnitude: {result.magnitude.toFixed(2)}</span>
          <span>Quadrant: {result.quadrant}</span>
          <span>Distance: {result.distance === Infinity ? '—' : result.distance.toFixed(2)}</span>
        </div>

        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            className="mt-4 rounded-full border border-slate-600 bg-slate-900/70 px-6 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Restart
          </button>
        )}
      </div>
    </div>
  );
}

function VectorReadout({ label, value }: { label: string; value: number }) {
  const sign = value >= 0 ? '+' : '';
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className="font-mono text-lg text-cyan-300">
        {sign}
        {value.toFixed(2)}
      </span>
    </div>
  );
}

export const SettlementStage = memo(SettlementStageImpl);
