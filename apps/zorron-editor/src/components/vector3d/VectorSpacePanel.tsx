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
import { VectorScene } from './VectorScene';
import type { PersonalityVector, SectAnchor } from '@/types/flow';
import { ZERO_VECTOR } from '@/engine/vectorMath';

/** Props for the VectorSpacePanel. */
export interface VectorSpacePanelProps {
  /** Override the user vector (e.g. for preview in the editor). */
  userVector?: PersonalityVector;
  /** Override the highlighted sect id (e.g. the matched settlement sect). */
  highlightedSectId?: string | null;
  /** Compact mode for embedding in the settlement stage. */
  compact?: boolean;
  /** Optional class name. */
  className?: string;
}

function VectorSpacePanelImpl({
  userVector,
  highlightedSectId = null,
  compact = false,
  className,
}: VectorSpacePanelProps) {
  // Always read the project settings for axis labels and sect anchors.
  const settings = useProjectStore((s) => s.settings);
  // Read the live player vector (if the player is running).
  const playerState = usePlayerStore((s) => s.state);

  const vectorSpace = settings.vectorSpace;
  const axisLabels = vectorSpace.dimensions ?? { x: 'X', y: 'Y', z: 'Z' };
  const sects: SectAnchor[] = vectorSpace.sects ?? [];

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
        Vector space is disabled. Enable it in the project settings to
        visualize the 3D personality space.
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
          3D Vector Space
        </h3>
        <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
          {sects.length} sects
        </span>
      </div>
      <VectorScene
        axisLabels={axisLabels}
        sects={sects}
        userVector={effectiveVector}
        highlightedSectId={highlightedSectId}
        height={compact ? 240 : 320}
      />
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="rounded-md bg-slate-900/60 p-1.5">
          <div className="text-red-400">{axisLabels.x}</div>
          <div className="font-mono text-cyan-300">
            {effectiveVector.x.toFixed(2)}
          </div>
        </div>
        <div className="rounded-md bg-slate-900/60 p-1.5">
          <div className="text-green-400">{axisLabels.y}</div>
          <div className="font-mono text-cyan-300">
            {effectiveVector.y.toFixed(2)}
          </div>
        </div>
        <div className="rounded-md bg-slate-900/60 p-1.5">
          <div className="text-blue-400">{axisLabels.z}</div>
          <div className="font-mono text-cyan-300">
            {effectiveVector.z.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

export const VectorSpacePanel = memo(VectorSpacePanelImpl);
