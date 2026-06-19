/**
 * useProjectSync - coordinates loading a project into the editor store and
 * keeping the project store's snapshot in sync.
 *
 * On mount (or when `projectId` changes) it loads the project from the
 * backend (or resets to a blank canvas in local mode) and pushes the flow
 * nodes/edges into `editorStore.loadFlow`.
 */

import { useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import type { FlowNode, FlowEdge } from '@/types/flow';

/** Props for useProjectSync. */
export interface UseProjectSyncOptions {
  /** Project id to load. When null/undefined, operates in local mode. */
  projectId?: string | null;
  /** Skip the initial load (e.g. when the caller manages it manually). */
  skipInitialLoad?: boolean;
}

/** Cast raw flow nodes/edges into the editor store's expected shape. */
function toFlowNodes(nodes: unknown[]): FlowNode[] {
  return nodes as FlowNode[];
}

function toFlowEdges(edges: unknown[]): FlowEdge[] {
  return edges as FlowEdge[];
}

/**
 * Load a project by id (or reset for local mode) and hydrate the editor store.
 */
export function useProjectSync({
  projectId,
  skipInitialLoad = false,
}: UseProjectSyncOptions = {}): void {
  const loadProject = useProjectStore((s) => s.loadProject);
  const loadFlow = useEditorStore((s) => s.loadFlow);

  useEffect(() => {
    if (skipInitialLoad) return;

    let cancelled = false;

    const hydrate = async () => {
      if (projectId) {
        try {
          const detail = await loadProject(projectId);
          if (cancelled) return;
          const flow = detail.data;
          loadFlow(toFlowNodes(flow.nodes ?? []), toFlowEdges(flow.edges ?? []));
        } catch {
          // Error is recorded in the project store; fall back to blank canvas.
          if (!cancelled) loadFlow([], []);
        }
      } else {
        // Local mode: blank canvas, no snapshot.
        useProjectStore.getState().reset();
        loadFlow([], []);
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [projectId, skipInitialLoad, loadProject, loadFlow]);
}
