/**
 * GalGame player toolkit: settings, read-state tracking and auto pacing.
 *
 * These are the behaviours players expect from any visual-novel style engine
 * and that the architecture spec calls for under "GalGame 核心套件":
 * configurable text speed and volumes, remembering which lines have been seen,
 * skipping read text, and an Auto mode that paces itself from voice duration.
 */

import type { GameEngine, GameState } from '@/engine/GameEngine';

const SETTINGS_STORAGE_KEY = 'zorron:player-settings';
const READ_STATE_KEY_PREFIX = 'zorron:read:';

/** Player-adjustable playback preferences. */
export interface PlayerSettings {
  /** Typewriter interval per character, in milliseconds. */
  textSpeedMs: number;
  /** Extra pause before auto-advancing past a line, in milliseconds. */
  autoDelayMs: number;
  /** BGM track volume (0–1). */
  bgmVolume: number;
  /** Voice track volume (0–1). */
  voiceVolume: number;
  /** SFX track volume (0–1). */
  sfxVolume: number;
  /** Ambient track volume (0–1). */
  ambientVolume: number;
  /** Whether Skip fast-forwards through already-read lines. */
  skipRead: boolean;
  /** Whether Auto halts on a choice instead of picking one. */
  autoStopOnChoice: boolean;
}

/** Factory defaults, also used when stored settings are corrupt. */
export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  textSpeedMs: 30,
  autoDelayMs: 800,
  bgmVolume: 0.7,
  voiceVolume: 1,
  sfxVolume: 0.8,
  ambientVolume: 0.6,
  skipRead: true,
  autoStopOnChoice: true,
};

/** Clamp a number into an inclusive range. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Coerce anything read from storage into a valid PlayerSettings object. */
function normalize(raw: unknown): PlayerSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PLAYER_SETTINGS };
  const input = raw as Partial<Record<keyof PlayerSettings, unknown>>;
  const num = (v: unknown, fallback: number, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v)
      ? clamp(v, min, max)
      : fallback;

  return {
    textSpeedMs: num(input.textSpeedMs, DEFAULT_PLAYER_SETTINGS.textSpeedMs, 0, 200),
    autoDelayMs: num(input.autoDelayMs, DEFAULT_PLAYER_SETTINGS.autoDelayMs, 0, 5000),
    bgmVolume: num(input.bgmVolume, DEFAULT_PLAYER_SETTINGS.bgmVolume, 0, 1),
    voiceVolume: num(input.voiceVolume, DEFAULT_PLAYER_SETTINGS.voiceVolume, 0, 1),
    sfxVolume: num(input.sfxVolume, DEFAULT_PLAYER_SETTINGS.sfxVolume, 0, 1),
    ambientVolume: num(input.ambientVolume, DEFAULT_PLAYER_SETTINGS.ambientVolume, 0, 1),
    skipRead: typeof input.skipRead === 'boolean' ? input.skipRead : true,
    autoStopOnChoice:
      typeof input.autoStopOnChoice === 'boolean' ? input.autoStopOnChoice : true,
  };
}

/** Load persisted settings, falling back to defaults when unavailable. */
export function loadPlayerSettings(): PlayerSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_PLAYER_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : { ...DEFAULT_PLAYER_SETTINGS };
  } catch {
    return { ...DEFAULT_PLAYER_SETTINGS };
  }
}

/** Persist settings; silently ignores storage failures (private mode). */
export function savePlayerSettings(settings: PlayerSettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable — settings simply won't persist */
  }
}

/**
 * Tracks which nodes a player has already seen, per project.
 *
 * Backed by localStorage with an in-memory mirror so `isRead()` stays
 * synchronous (hot path — it is consulted while skipping).
 */
class ReadTracker {
  private cache = new Map<string, Set<string>>();

  private key(projectId: string): string {
    return `${READ_STATE_KEY_PREFIX}${projectId}`;
  }

  /** Load a project's read set into memory. Safe to call repeatedly. */
  hydrate(projectId: string): void {
    if (this.cache.has(projectId)) return;
    const set = new Set<string>();
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.key(projectId));
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const id of parsed) if (typeof id === 'string') set.add(id);
          }
        }
      } catch {
        /* corrupt entry — start clean */
      }
    }
    this.cache.set(projectId, set);
  }

  /** Whether the player has already seen this node. */
  isRead(projectId: string, nodeId: string | null): boolean {
    if (!nodeId) return false;
    this.hydrate(projectId);
    return this.cache.get(projectId)?.has(nodeId) ?? false;
  }

  /** Mark a node as seen and persist the change. */
  markRead(projectId: string, nodeId: string | null): void {
    if (!nodeId) return;
    this.hydrate(projectId);
    const set = this.cache.get(projectId);
    if (!set || set.has(nodeId)) return;
    set.add(nodeId);
    this.persist(projectId, set);
  }

  /** How many distinct nodes the player has seen in this project. */
  countRead(projectId: string): number {
    this.hydrate(projectId);
    return this.cache.get(projectId)?.size ?? 0;
  }

  /** Forget all read state for a project. */
  clearProject(projectId: string): void {
    this.cache.delete(projectId);
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(this.key(projectId));
    } catch {
      /* ignore */
    }
  }

  private persist(projectId: string, set: Set<string>): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.key(projectId), JSON.stringify([...set]));
    } catch {
      /* quota or private mode — in-memory state still works this session */
    }
  }
}

/** Shared read-state tracker instance. */
export const readTracker = new ReadTracker();

/** Dialogue shape needed to compute auto pacing. */
export interface PaceableDialogue {
  text?: string;
  /** Duration extracted by the server-side ffprobe pipeline, in seconds. */
  voiceDurationSec?: number;
}

/**
 * How long Auto mode should linger on a line before advancing.
 *
 * Prefers the real voice duration when the asset was analysed by ffprobe;
 * otherwise falls back to typewriter duration + a configurable pause. That
 * keeps Auto readable for projects without voice acting.
 */
export function computeAutoDelayMs(
  dialogue: PaceableDialogue | undefined,
  settings: PlayerSettings,
): number {
  const base = settings.autoDelayMs;
  if (!dialogue) return base;

  if (dialogue.voiceDurationSec && dialogue.voiceDurationSec > 0) {
    // Voice is authoritative: wait it out plus a short beat.
    return Math.round(dialogue.voiceDurationSec * 1000) + base;
  }

  const length = dialogue.text?.length ?? 0;
  if (length === 0) return base;
  return Math.round(length * settings.textSpeedMs) + base;
}

/**
 * Advance past the current frame without player input.
 *
 * Only node types that can make progress unattended are handled. Input nodes
 * (rating, multi-select, text-input, rank-order, number-picker, minigame) and
 * the settlement node return false so Auto and Skip never invent an answer on
 * the player's behalf.
 *
 * @returns true when the engine actually moved.
 */
export function autoAdvance(
  engine: GameEngine,
  state: GameState,
  settings: PlayerSettings,
): boolean {
  switch (state.currentNodeType) {
    case 'start':
      engine.advanceFromStart();
      return true;
    case 'stage':
      engine.advanceFromStage();
      return true;
    case 'video':
      engine.skipVideo();
      return true;
    case 'media':
      engine.advanceFromMedia();
      return true;
    case 'scene': {
      // Choices are the player's to make unless they explicitly opt out.
      if (settings.autoStopOnChoice) return false;
      const first = state.choices.find((c) => !c.isLocked);
      if (!first) return false;
      engine.selectChoice(first.id);
      return true;
    }
    default:
      return false;
  }
}

/** Outcome of one skip tick. */
export type SkipResult =
  /** Moved past a frame. */
  | 'advanced'
  /** Hit unread dialogue — skip should disengage. */
  | 'unread'
  /** Current node cannot be skipped (input or terminal). */
  | 'unsupported';

/**
 * Fast-forward one frame while Skip is engaged.
 *
 * When `skipRead` is on, unread dialogue stops the skip so the player never
 * accidentally blows past new content.
 */
export function skipStep(
  engine: GameEngine,
  state: GameState,
  settings: PlayerSettings,
  isRead: (nodeId: string | null) => boolean,
): SkipResult {
  if (settings.skipRead && !isRead(state.currentNodeId)) return 'unread';
  return autoAdvance(engine, state, settings) ? 'advanced' : 'unsupported';
}
