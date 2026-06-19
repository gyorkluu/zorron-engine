/**
 * useAutoSave - debounced auto-save of the current project.
 *
 * Watches the editor canvas (nodes/edges) and project metadata; when the
 * combined FlowData diverges from the last saved snapshot, schedules a save
 * after `delay` ms of inactivity. Only fires when `enabled` is true and the
 * project is dirty.
 */

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import {
  useProjectStore,
  buildFlowData,
} from '@/stores/projectStore';
import type { FlowData } from '@/types/flow';

/** Props for useAutoSave. */
export interface UseAutoSaveOptions {
  /** Debounce delay in milliseconds. Defaults to 3000. */
  delay?: number;
  /** Master switch (e.g. disabled while loading). Defaults to true. */
  enabled?: boolean;
}

/**
 * Build the current FlowData snapshot from the editor + project stores.
 * Exposed for testing and reuse by the manual save button.
 */
export function buildCurrentFlowData(): FlowData {
  const editor = useEditorStore.getState();
  const project = useProjectStore.getState();
  return buildFlowData(
    {
      variables: project.variables,
      settings: project.settings,
      version: project.version,
    },
    editor.nodes,
    editor.edges,
  );
}

/**
 * Schedule a debounced save whenever the canvas or project metadata changes.
 */
export function useAutoSave({ delay = 3000, enabled = true }: UseAutoSaveOptions = {}): void {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const variables = useProjectStore((s) => s.variables);
  const settings = useProjectStore((s) => s.settings);
  const version = useProjectStore((s) => s.version);
  const id = useProjectStore((s) => s.id);
  const saveStatus = useProjectStore((s) => s.saveStatus);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // Don't auto-save while a save is already in flight or after an error
    // (let the user retry manually).
    if (saveStatus === 'saving' || saveStatus === 'error') return;

    const flowData = buildCurrentFlowData();
    const project = useProjectStore.getState();
    if (!project.isDirty(flowData)) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const latest = buildCurrentFlowData();
      const latestProject = useProjectStore.getState();
      if (latestProject.isDirty(latest)) {
        void latestProject.save(latest);
      }
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [nodes, edges, variables, settings, version, id, saveStatus, enabled, delay]);
}
