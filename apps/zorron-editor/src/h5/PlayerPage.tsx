/**
 * PlayerPage - standalone player route at `/player/:projectId`.
 *
 * Loads a project by id from the API and renders the PlayerShell full-screen
 * without any editor chrome. Used for sharing published narratives.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PlayerShell } from '@/components/player/PlayerShell';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { useT, tt } from '@/i18n/useT';
import { createEmptyFlowData } from '@/types/flow';
import type { FlowData } from '@/types/flow';
import * as projectService from '@/services/project.service';

/** Loading state for the player page. */
type PlayerPageState =
  | { status: 'loading' }
  | { status: 'ready'; flowData: FlowData }
  | { status: 'error'; message: string };

/** Standalone player page. */
export function PlayerPage() {
  const { t } = useT();
  const { projectId } = useParams<{ projectId: string }>();
  const [state, setState] = useState<PlayerPageState>({ status: 'loading' });
  const loadFlow = useEditorStore((s) => s.loadFlow);
  const setSettings = useProjectStore((s) => s.setSettings);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!projectId) {
        if (!cancelled) {
          setState({ status: 'error', message: tt('player.noProjectId') });
        }
        return;
      }
      try {
        const detail = await projectService.getPlayableProject(projectId);
        if (cancelled) return;
        const flow = detail.data ?? createEmptyFlowData();
        loadFlow(flow.nodes ?? [], flow.edges ?? []);
        setSettings(flow.settings ?? createEmptyFlowData().settings);
        setState({ status: 'ready', flowData: flow });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : tt('player.loadProjectFail');
        setState({ status: 'error', message });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId, loadFlow]);

  if (state.status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="text-sm">{t('player.loadingPlayer')}</div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-slate-950 text-center text-slate-400">
        <div className="text-base font-medium text-rose-400">{t('player.loadFail')}</div>
        <div className="text-sm opacity-70">{state.message}</div>
        <a
          href="/"
          className="mt-4 rounded-full border border-slate-600 bg-slate-900/70 px-6 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          {t('player.backToEditor')}
        </a>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950" data-testid="player-page">
      <PlayerShell flowData={state.flowData} />
    </div>
  );
}
