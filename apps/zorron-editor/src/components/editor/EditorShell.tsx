/**
 * EditorShell - the main three-panel editor layout.
 *
 * Left: AssetPanel (resource management + drag source).
 * Center: FlowCanvas (React Flow node graph) with floating overlays:
 *   - NodePalette (top-left): click/drag to create nodes.
 *   - SimulationTrigger + Preview button (top-right): run Monte Carlo sim / preview player.
 *   - SidePanelToolbar (bottom-left): toggle Variables / Fragments / Templates / History panels.
 *   - VectorSpacePanel (bottom-right, feature-flagged): 3D personality space.
 * Right: InspectorPanel (selected node editor).
 * Top: EditorToolbar (title, save status, import/export/save).
 *
 * Overlays:
 *   - PreviewOverlay (P1-1): full-screen in-editor player.
 *   - OnboardingOverlay (P1-2): 3-step first-use tutorial.
 *   - ConflictDialog (feature-flagged): cloud sync conflict resolution.
 *
 * Wires auto-save and project sync.
 */

import { memo, useCallback, useState } from 'react';
import { AssetPanel } from '@/components/asset/AssetPanel';
import { FlowCanvas } from '@/components/flow/FlowCanvas';
import { NodePalette } from '@/components/flow/NodePalette';
import { TemplateLibrary } from '@/components/flow/TemplateLibrary';
import { InspectorPanel } from '@/components/inspector/InspectorPanel';
import { VariablesPanel } from '@/components/inspector/VariablesPanel';
import { FragmentPanel } from '@/components/inspector/FragmentPanel';
import { HistoryPanel } from '@/components/inspector/HistoryPanel';
import { EditorToolbar } from './EditorToolbar';
import { PreviewOverlay } from './PreviewOverlay';
import { OnboardingOverlay, useOnboarding } from './OnboardingOverlay';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useProjectSync } from '@/hooks/useProjectSync';
import { SimulationTrigger } from '@/components/simulation/SimulationTrigger';
import { VectorSpacePanel } from '@/components/vector3d/VectorSpacePanel';
import { ConflictDialog } from '@/components/workspace/ConflictDialog';
import { featureFlags } from '@/lib/featureFlags';
import { useEditorStore } from '@/stores/editorStore';
import { useT } from '@/i18n/useT';
import type { NodeType } from '@/types/flow';
import { cn } from '@/lib/utils';

/** Props for the EditorShell. */
export interface EditorShellProps {
  /** Optional project id to load (cloud mode). Null = local mode. */
  projectId?: string | null;
}

/** Which side panel is currently open (null = none). */
type SidePanelId = 'variables' | 'fragments' | 'templates' | 'history' | null;

function EditorShellImpl({ projectId = null }: EditorShellProps) {
  const { t } = useT();
  // Hydrate the editor from the backend (or reset for local mode).
  useProjectSync({ projectId });
  // Debounced auto-save whenever the canvas / metadata changes.
  useAutoSave({ delay: 3000, enabled: true });

  const addNode = useEditorStore((s) => s.addNode);

  // P1-1: Preview overlay state.
  const [showPreview, setShowPreview] = useState(false);
  // P2 side panels: only one open at a time.
  const [activeSidePanel, setActiveSidePanel] = useState<SidePanelId>(null);
  // P1-2: Onboarding tutorial (auto-shows on first visit).
  const onboarding = useOnboarding();

  /** Click-to-create from the palette: add at a reasonable center offset. */
  const handleCreateNode = useCallback(
    (type: NodeType) => {
      // Place near the canvas center with a small cascade so successive
      // clicks don't stack on top of each other.
      const count = useEditorStore.getState().nodes.length;
      addNode(type, { x: 250 + count * 40, y: 200 + count * 40 });
    },
    [addNode],
  );

  /** Toggle a side panel; clicking the active one closes it. */
  const toggleSidePanel = useCallback((id: Exclude<SidePanelId, null>) => {
    setActiveSidePanel((prev) => (prev === id ? null : id));
  }, []);

  /** Side panel toolbar button definitions. */
  const sidePanelButtons: Array<{ id: Exclude<SidePanelId, null>; label: string; icon: string }> = [
    { id: 'variables', label: t('vars.title'), icon: 'V' },
    { id: 'fragments', label: t('frag.title'), icon: 'F' },
    { id: 'templates', label: t('tpl.title'), icon: 'T' },
    { id: 'history', label: t('history.title'), icon: 'H' },
  ];

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <EditorToolbar />
      <div className="flex min-h-0 flex-1">
        <AssetPanel />
        <main className="relative min-w-0 flex-1">
          <FlowCanvas className="h-full w-full" />
          {/* Floating node palette overlay on the canvas top-left. */}
          <div className="absolute left-3 top-3 z-10 max-h-[70vh] w-56 overflow-hidden rounded-xl border border-slate-800/60 bg-slate-950/80 shadow-xl backdrop-blur-md">
            <NodePalette onCreateNode={handleCreateNode} />
          </div>

          {/* Floating top-right toolbar: Simulation + Preview. */}
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            <SimulationTrigger />
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="rounded-md border border-cyan-600/50 bg-cyan-600/20 px-3 py-1.5 text-xs font-medium text-cyan-100 shadow-lg backdrop-blur-md hover:bg-cyan-600/30"
              title={t('toolbar.preview.tip')}
            >
              {t('toolbar.preview')}
            </button>
          </div>

          {/* Floating bottom-left side panel toolbar + panel. */}
          <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-2">
            {/* Active panel content (above the toolbar). */}
            {activeSidePanel && (
              <div className="max-h-[60vh] w-72 overflow-hidden rounded-xl border border-slate-800/60 bg-slate-950/90 shadow-2xl backdrop-blur-md">
                {activeSidePanel === 'variables' && <VariablesPanel />}
                {activeSidePanel === 'fragments' && <FragmentPanel />}
                {activeSidePanel === 'templates' && <TemplateLibrary />}
                {activeSidePanel === 'history' && <HistoryPanel />}
              </div>
            )}
            {/* Toolbar buttons. */}
            <div className="flex gap-1.5 rounded-lg border border-slate-800/60 bg-slate-950/80 p-1.5 shadow-lg backdrop-blur-md">
              {sidePanelButtons.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => toggleSidePanel(btn.id)}
                  title={btn.label}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-colors',
                    activeSidePanel === btn.id
                      ? 'bg-cyan-600/30 text-cyan-200 ring-1 ring-cyan-500/50'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                  )}
                >
                  {btn.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Floating 3D vector space panel (feature-flagged). */}
          {featureFlags.vector3d && (
            <div className="absolute bottom-3 right-3 z-10 w-80">
              <VectorSpacePanel compact />
            </div>
          )}
        </main>
        <InspectorPanel />
      </div>

      {/* P1-1: Preview overlay (full-screen in-editor player). */}
      {showPreview && <PreviewOverlay onExit={() => setShowPreview(false)} />}

      {/* P1-2: Onboarding tutorial (shows on first visit). */}
      {onboarding.show && <OnboardingOverlay onDismiss={onboarding.dismiss} />}

      {/* Conflict resolution dialog (feature-flagged, renders when a conflict is active). */}
      {featureFlags.cloudSync && <ConflictDialog />}
    </div>
  );
}

export const EditorShell = memo(EditorShellImpl);
