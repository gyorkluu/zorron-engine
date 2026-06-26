/**
 * PreviewOverlay - full-screen in-editor preview player.
 *
 * Renders the current canvas as a playable flow inside a phone-sized
 * PlayerShell. The overlay captures the flowData snapshot on mount so
 * editing changes don't restart the player mid-preview.
 */

import { memo, useState } from 'react';
import { PlayerShell } from '@/components/player/PlayerShell';
import { buildCurrentFlowData } from '@/hooks/useAutoSave';
import { useEditorStore } from '@/stores/editorStore';
import { useT } from '@/i18n/useT';
import type { FlowData } from '@/types/flow';

/** Props for PreviewOverlay. */
export interface PreviewOverlayProps {
  /** Called when the user exits the preview. */
  onExit: () => void;
}

function PreviewOverlayImpl({ onExit }: PreviewOverlayProps) {
  const { t } = useT();
  const nodes = useEditorStore((s) => s.nodes);
  // Snapshot the flow once on mount so preview isn't disrupted by edits.
  const [flowData] = useState<FlowData>(() => buildCurrentFlowData());

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      {/* Title bar */}
      <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-slate-800/60 bg-slate-950/80 px-4 backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-slate-100">{t('preview.title')}</h2>
        <button
          type="button"
          onClick={onExit}
          className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800"
        >
          {t('preview.exit')}
        </button>
      </header>

      {/* Stage */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {nodes.length === 0 ? (
          <p className="text-sm text-slate-400">{t('preview.empty')}</p>
        ) : (
          <div className="h-full w-full max-w-[430px] overflow-hidden rounded-xl border border-slate-800 bg-black shadow-2xl">
            <PlayerShell flowData={flowData} />
          </div>
        )}
      </div>
    </div>
  );
}

export const PreviewOverlay = memo(PreviewOverlayImpl);
