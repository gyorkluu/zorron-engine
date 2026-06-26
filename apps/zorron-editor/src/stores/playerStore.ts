/**
 * Player store (Zustand) - bridges the framework-agnostic GameEngine with React.
 *
 * Holds a GameEngine instance and mirrors its `GameState` so components can
 * subscribe via Zustand selectors. All mutations delegate to the engine.
 */

import { create } from 'zustand';
import { GameEngine, type GameState } from '@/engine/GameEngine';
import type { FlowData } from '@/types/flow';

/** Player store state shape. */
interface PlayerStoreState {
  /** The current engine state snapshot. */
  state: GameState | null;
  /** Whether the player is currently running. */
  isRunning: boolean;
  /** The active engine instance (null when not running). */
  engine: GameEngine | null;

  /** Load a project and start the engine. */
  start: (flowData: FlowData) => GameState;
  /** Select a choice on the current scene node. */
  selectChoice: (choiceId: string) => void;
  /** Select a button on the current settlement node. */
  selectSettlementButton: (buttonId: string) => void;
  /** Advance from a start node. */
  advanceFromStart: () => void;
  /** Skip the current video node. */
  skipVideo: () => void;
  /** Reset the engine to the beginning. */
  restart: () => void;
  /** Stop the player and release the engine. */
  stop: () => void;
}

export const usePlayerStore = create<PlayerStoreState>((set, get) => ({
  state: null,
  isRunning: false,
  engine: null,

  start: (flowData) => {
    // Tear down any previous engine.
    const previous = get().engine;
    if (previous) {
      previous.reset();
    }
    const engine = new GameEngine(flowData);
    // Subscribe so the store mirrors engine state on every change.
    engine.subscribe((next) => {
      set({ state: next });
    });
    const initial = engine.start();
    set({ engine, state: initial, isRunning: true });
    return initial;
  },

  selectChoice: (choiceId) => {
    const engine = get().engine;
    if (!engine) return;
    engine.selectChoice(choiceId);
  },

  selectSettlementButton: (buttonId) => {
    const engine = get().engine;
    if (!engine) return;
    engine.selectSettlementButton(buttonId);
  },

  advanceFromStart: () => {
    const engine = get().engine;
    if (!engine) return;
    engine.advanceFromStart();
  },

  skipVideo: () => {
    const engine = get().engine;
    if (!engine) return;
    engine.skipVideo();
  },

  restart: () => {
    const engine = get().engine;
    if (!engine) return;
    engine.reset();
    engine.start();
  },

  stop: () => {
    const engine = get().engine;
    if (engine) {
      engine.reset();
    }
    set({ engine: null, state: null, isRunning: false });
  },
}));
