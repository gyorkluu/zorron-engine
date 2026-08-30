/**
 * GalGame player store — preferences and playback modes.
 *
 * Deliberately separate from `playerStore`, which owns the engine instance and
 * the JX3 submission flow. Settings and Auto/Skip state are read on every
 * frame, so they get their own store to avoid re-rendering on engine churn.
 */

import { create } from 'zustand';
import {
  DEFAULT_PLAYER_SETTINGS,
  loadPlayerSettings,
  savePlayerSettings,
  readTracker,
  type PlayerSettings,
} from '@/engine/galgame';

export interface GalgameStoreState {
  /** Project being played — scopes the read-state tracker. */
  projectId: string;
  /** Player preferences, persisted to localStorage. */
  settings: PlayerSettings;
  /** Auto mode: advance through dialogue without player input. */
  autoMode: boolean;
  /** Skip mode: fast-forward through lines already read. */
  skipMode: boolean;
  /** Whether the settings dialog is open. */
  settingsOpen: boolean;

  /** Bind the store to a project and hydrate its read state. */
  attachProject: (projectId: string) => void;
  /** Merge a settings patch and persist it. */
  updateSettings: (patch: Partial<PlayerSettings>) => void;
  /** Restore factory defaults. */
  resetSettings: () => void;
  /** Leave Auto/Skip (called on restart, exit and unread stops). */
  resetModes: () => void;
  setAuto: (on: boolean) => void;
  toggleAuto: () => void;
  setSkip: (on: boolean) => void;
  toggleSkip: () => void;
  setSettingsOpen: (open: boolean) => void;

  /** Whether a node has been read in the current project. */
  isRead: (nodeId: string | null) => boolean;
  /** Mark a node as read in the current project. */
  markRead: (nodeId: string | null) => void;
  /** Forget all read state for the current project. */
  clearReadState: () => void;
}

export const useGalgameStore = create<GalgameStoreState>((set, get) => ({
  projectId: 'local',
  settings: loadPlayerSettings(),
  autoMode: false,
  skipMode: false,
  settingsOpen: false,

  attachProject: (projectId) => {
    readTracker.hydrate(projectId);
    set({ projectId, autoMode: false, skipMode: false });
  },

  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    savePlayerSettings(next);
    set({ settings: next });
  },

  resetSettings: () => {
    const next = { ...DEFAULT_PLAYER_SETTINGS };
    savePlayerSettings(next);
    set({ settings: next });
  },

  resetModes: () => set({ autoMode: false, skipMode: false }),

  setAuto: (on) => set({ autoMode: on, skipMode: on ? false : get().skipMode }),
  toggleAuto: () => {
    const on = !get().autoMode;
    set({ autoMode: on, skipMode: on ? false : get().skipMode });
  },

  setSkip: (on) => set({ skipMode: on, autoMode: on ? false : get().autoMode }),
  toggleSkip: () => {
    const on = !get().skipMode;
    set({ skipMode: on, autoMode: on ? false : get().autoMode });
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  isRead: (nodeId) => readTracker.isRead(get().projectId, nodeId),
  markRead: (nodeId) => readTracker.markRead(get().projectId, nodeId),
  clearReadState: () => readTracker.clearProject(get().projectId),
}));
