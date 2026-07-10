/**
 * VectorSpacePanel - 3D personality vector space visualization panel.
 *
 * Feature-flagged via `VITE_FEATURE_VECTOR_3D`. When the flag is off, this
 * component renders nothing. When on, it shows the 3D vector scene with the
 * current user vector (from the player store or a live preview from the
 * editor's calculator nodes) and the sect anchors configured in the project
 * settings.
 *
 * The panel is designed to be embedded in the editor (as a floating overlay
 * or a docked panel) and in the settlement stage of the player.
 */

import { memo, useMemo } from 'react';
import { featureFlags } from '@/lib/featureFlags';
import { useProjectStore } from '@/stores/projectStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useT } from '@/i18n/useT';
import { VectorScene } from './VectorScene';
import type { PersonalityVector, ResultAnchor } from '@/types/flow';
import { ZERO_VECTOR } from '@/engine/vectorMath';

/** Props for the VectorSpacePanel. */
export interface VectorSpacePanelProps {
  /** Override the user vector (e.g. for preview in the editor). */
  userVector?: PersonalityVector;
  /** Override the highlighted sect id (e.g. the matched settlement sect). */
  highlightedAnchorId?: string | null;
  /** Compact mode for embedding in the settlement stage. */
  compact?: boolean;
  /** Optional class name. */
  className?: string;
}

function VectorSpacePanelImpl({
  userVector,
  highlightedAnchorId = null,
  compact = false,
  className,
}: VectorSpacePanelProps) {
  const { t } = useT();
  // Always read the project settings for axis labels and sect anchors.
  const settings = useProjectStore((s) => s.settings);
  // Read the live player vector (if the player is running).
  const playerState = usePlayerStore((s) => s.state);

  const vectorSpace = settings.vectorSpace;
  const axisLabels = vectorSpace.dimensions ?? { x: 'X', y: 'Y', z: 'Z' };
  const sects: ResultAnchor[] = vectorSpace.sects ?? [];

  const effectiveVector: PersonalityVector = useMemo(() => {
    if (userVector) return userVector;
    if (playerState?.vector) return playerState.vector;
    return { ...ZERO_VECTOR };
  }, [userVector, playerState?.vector]);

  // If the feature flag is off, render nothing.
  if (!featureFlags.vector3d) return null;

  // If the vector space is not enabled in project settings, show a hint.
  if (!vectorSpace.enabled) {
    return (
      <div
        className={`rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center text-xs text-slate-500 ${className ?? ''}`}
        data-testid="vector-space-disabled"
      >
        {t('vector3d.disabled')}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-950/60 p-3 ${className ?? ''}`}
      data-testid="vector-space-panel"
    >
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
        userVector={effectiveVector}
        highlightedAnchorId={highlightedAnchorId}
        height={compact ? 240 : 320}
      />
      <div className="mt-2 flex flex-wrap gap-2 text-center text-[10px]">
        {Object.entries(axisLabels).map(([axisId, label]) => (
          <div key={axisId} className="min-w-[4rem] flex-1 rounded-md bg-slate-900/60 p-1.5">
            <div className="text-red-400">{label}</div>
            <div className="font-mono text-cyan-300">
              {(effectiveVector[axisId] ?? 0).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const VectorSpacePanel = memo(VectorSpacePanelImpl);
