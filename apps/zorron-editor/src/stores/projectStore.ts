/**
 * Project store (Zustand) - project metadata, flow data and save status.
 *
 * Coordinates with `editorStore` for the canvas nodes/edges. The editor holds
 * the working copy of nodes/edges; this store holds project metadata, variables,
 * settings and the save lifecycle.
 */

import { create } from 'zustand';
import isEqual from 'lodash.isequal';
import {
  type FlowData,
  type FlowNode,
  type FlowEdge,
  type ProjectSettings,
  type Variables,
  createEmptyFlowData,
} from '@/types/flow';
import type {
  ProjectDetail,
  ProjectListItem,
  ListProjectsQuery,
} from '@/types/project';
import * as projectService from '@/services/project.service';
import { AppError } from '@/lib/errors';
import { useEditorStore } from '@/stores/editorStore';

/** Save lifecycle status shown in the toolbar. */
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

/** Maximum number of version snapshots retained in history. */
const MAX_HISTORY_SNAPSHOTS = 20;

/**
 * A version history snapshot of the full FlowData.
 *
 * Snapshots are pushed automatically on save and can be restored to roll the
 * canvas (nodes/edges) and project metadata (variables/settings) back to a
 * previous state.
 */
export interface VersionSnapshot {
  /** Unique snapshot id (e.g. `snap_<timestamp>`). */
  id: string;
  /** Full FlowData captured at save time. */
  flowData: FlowData;
  /** ISO timestamp when the snapshot was created. */
  createdAt: string;
  /** Human-readable label shown in the history panel. */
  label: string;
}

/** Project store state shape. */
interface ProjectState {
  /** Current project id (null in local/unsaved mode). */
  id: string | null;
  title: string;
  description: string | null;
  coverUrl: string | null;
  isPublished: boolean;
  /** Variables and settings (the non-canvas part of FlowData). */
  variables: Variables;
  settings: ProjectSettings;
  version: string;

  /** Last successfully saved FlowData snapshot (for dirty comparison). */
  lastSavedSnapshot: FlowData | null;
  lastSavedAt: string | null;
  saveStatus: SaveStatus;
  error: string | null;

  /** Version history snapshots (max 20). */
  history: VersionSnapshot[];

  /** Project list (for the dashboard). */
  list: ProjectListItem[];
  listLoading: boolean;

  // Lifecycle
  loadProject: (id: string) => Promise<ProjectDetail>;
  createProject: (title: string, description?: string) => Promise<ProjectDetail>;
  save: (flowData: FlowData) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  importProject: (data: FlowData, title?: string) => Promise<ProjectDetail>;
  fetchList: (query?: ListProjectsQuery) => Promise<void>;

  // Metadata mutations
  setTitle: (title: string) => void;
  setDescription: (description: string | null) => void;
  setVariables: (variables: Variables) => void;
  setSettings: (settings: ProjectSettings) => void;

  // Snapshot helpers
  setSavedSnapshot: (flowData: FlowData) => void;
  isDirty: (flowData: FlowData) => boolean;
  reset: () => void;

  // Version history
  /** Push current flow data as a snapshot. Called on save. */
  pushSnapshot: (flowData: FlowData, label?: string) => void;
  /** Restore a snapshot by id (loads nodes/edges into editorStore). */
  restoreSnapshot: (id: string) => void;
  /** Clear all snapshots. */
  clearHistory: () => void;
}

/** Build a FlowData snapshot from the project store + canvas nodes/edges. */
export function buildFlowData(
  store: Pick<
    ProjectState,
    'variables' | 'settings' | 'version'
  >,
  nodes: FlowNode[],
  edges: FlowEdge[],
): FlowData {
  return {
    nodes,
    edges,
    variables: store.variables,
    settings: store.settings,
    version: store.version,
  };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  id: null,
  title: 'Untitled Project',
  description: null,
  coverUrl: null,
  isPublished: false,
  variables: {},
  settings: createEmptyFlowData().settings,
  version: '1.0.0',
  lastSavedSnapshot: null,
  lastSavedAt: null,
  saveStatus: 'saved',
  error: null,
  history: [],
  list: [],
  listLoading: false,

  loadProject: async (id) => {
    set({ saveStatus: 'saving', error: null });
    try {
      const detail = await projectService.getProject(id);
      const flow = detail.data ?? createEmptyFlowData();
      set({
        id: detail.id,
        title: detail.title,
        description: detail.description,
        coverUrl: detail.coverUrl,
        isPublished: detail.isPublished,
        variables: flow.variables ?? {},
        settings: flow.settings ?? createEmptyFlowData().settings,
        version: flow.version ?? '1.0.0',
        lastSavedSnapshot: flow,
        lastSavedAt: detail.updatedAt,
        saveStatus: 'saved',
      });
      return detail;
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Failed to load project';
      set({ saveStatus: 'error', error: message });
      throw err;
    }
  },

  createProject: async (title, description) => {
    set({ saveStatus: 'saving', error: null });
    try {
      const detail = await projectService.createProject({ title, description });
      const flow = detail.data ?? createEmptyFlowData();
      set({
        id: detail.id,
        title: detail.title,
        description: detail.description,
        coverUrl: detail.coverUrl,
        isPublished: detail.isPublished,
        variables: flow.variables ?? {},
        settings: flow.settings ?? createEmptyFlowData().settings,
        version: flow.version ?? '1.0.0',
        lastSavedSnapshot: flow,
        lastSavedAt: detail.updatedAt,
        saveStatus: 'saved',
      });
      return detail;
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Failed to create project';
      set({ saveStatus: 'error', error: message });
      throw err;
    }
  },

  save: async (flowData) => {
    const { id } = get();
    if (!id) {
      // Local-only mode: just record the snapshot.
      set({
        lastSavedSnapshot: flowData,
        lastSavedAt: new Date().toISOString(),
        saveStatus: 'saved',
      });
      get().pushSnapshot(flowData);
      return;
    }
    set({ saveStatus: 'saving', error: null });
    try {
      const detail = await projectService.updateProject(id, { data: flowData });
      set({
        lastSavedSnapshot: detail.data,
        lastSavedAt: detail.updatedAt,
        saveStatus: 'saved',
      });
      get().pushSnapshot(detail.data);
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Failed to save project';
      set({ saveStatus: 'error', error: message });
      throw err;
    }
  },

  deleteProject: async (id) => {
    await projectService.deleteProject(id);
    set((state) => ({
      list: state.list.filter((p) => p.id !== id),
      ...(state.id === id
        ? {
            id: null,
            title: 'Untitled Project',
            description: null,
            coverUrl: null,
            isPublished: false,
            variables: {},
            settings: createEmptyFlowData().settings,
            lastSavedSnapshot: null,
            lastSavedAt: null,
            saveStatus: 'saved',
          }
        : {}),
    }));
  },

  importProject: async (data, title) => {
    set({ saveStatus: 'saving', error: null });
    try {
      const detail = await projectService.importProject({ data, title });
      const flow = detail.data ?? createEmptyFlowData();
      set({
        id: detail.id,
        title: detail.title,
        description: detail.description,
        coverUrl: detail.coverUrl,
        isPublished: detail.isPublished,
        variables: flow.variables ?? {},
        settings: flow.settings ?? createEmptyFlowData().settings,
        version: flow.version ?? '1.0.0',
        lastSavedSnapshot: flow,
        lastSavedAt: detail.updatedAt,
        saveStatus: 'saved',
      });
      return detail;
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Failed to import project';
      set({ saveStatus: 'error', error: message });
      throw err;
    }
  },

  fetchList: async (query) => {
    set({ listLoading: true });
    try {
      const res = await projectService.listProjects(query);
      set({ list: res.data, listLoading: false });
    } catch {
      set({ listLoading: false });
    }
  },

  setTitle: (title) => set({ title, saveStatus: 'unsaved' }),
  setDescription: (description) => set({ description, saveStatus: 'unsaved' }),
  setVariables: (variables) => set({ variables, saveStatus: 'unsaved' }),
  setSettings: (settings) => set({ settings, saveStatus: 'unsaved' }),

  setSavedSnapshot: (flowData) => {
    set({ lastSavedSnapshot: flowData, lastSavedAt: new Date().toISOString(), saveStatus: 'saved' });
    get().pushSnapshot(flowData);
  },

  isDirty: (flowData) => {
    const { lastSavedSnapshot } = get();
    if (!lastSavedSnapshot) return true;
    return !isEqual(lastSavedSnapshot, flowData);
  },

  pushSnapshot: (flowData, label) => {
    const { history } = get();
    const snapshot: VersionSnapshot = {
      id: `snap_${Date.now()}`,
      flowData,
      createdAt: new Date().toISOString(),
      label: label ?? `Snapshot ${history.length + 1}`,
    };
    // Newest first; cap at MAX_HISTORY_SNAPSHOTS.
    set({ history: [snapshot, ...history].slice(0, MAX_HISTORY_SNAPSHOTS) });
  },

  restoreSnapshot: (id) => {
    const { history } = get();
    const snapshot = history.find((s) => s.id === id);
    if (!snapshot) return;
    const { flowData } = snapshot;
    // Load nodes/edges into the editor store (resets undo/redo history).
    useEditorStore.getState().loadFlow(
      flowData.nodes as FlowNode[],
      flowData.edges as FlowEdge[],
    );
    // Restore project metadata.
    set({
      variables: flowData.variables ?? {},
      settings: flowData.settings ?? createEmptyFlowData().settings,
      version: flowData.version ?? get().version,
      saveStatus: 'unsaved',
    });
  },

  clearHistory: () => set({ history: [] }),

  reset: () =>
    set({
      id: null,
      title: 'Untitled Project',
      description: null,
      coverUrl: null,
      isPublished: false,
      variables: {},
      settings: createEmptyFlowData().settings,
      version: '1.0.0',
      lastSavedSnapshot: null,
      lastSavedAt: null,
      saveStatus: 'saved',
      error: null,
      history: [],
    }),
}));
