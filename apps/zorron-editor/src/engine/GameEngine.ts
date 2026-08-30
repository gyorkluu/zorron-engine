/**
 * GameEngine - framework-agnostic narrative state machine.
 *
 * Ported from the legacy `zorron-editor/src/game/GameEngine.ts` (Vue era) into a
 * pure TypeScript module with no DOM or framework dependencies.
 *
 * Core responsibilities:
 * - Start a project from its `start` node.
 * - Traverse nodes: scene (choices), logic (branching), setter (variables),
 *   calculator (apply pending vector deltas), settlement (final result),
 *   video/link (terminal media nodes).
 * - Maintain variables, fragments, the personality vector and pending vector.
 * - Expose a subscribe/notify API so React stores can observe state changes.
 *
 * Algorithm notes (v1.4.0):
 * - Choices accumulate a `pendingVector` that is only applied when a
 *   `calculator` node is traversed. This lets designers control when vector
 *   modifications take effect.
 * - Settlement uses 3D Euclidean nearest-neighbor matching with quadrant
 *   locking (see `engine/vectorMath.ts`).
 */

import {
  type FlowData,
  type FlowNode,
  type FlowEdge,
  type GameNodeData,
  type BaseNodeData,
  type SceneNodeData,
  type LogicNodeData,
  type SetterNodeData,
  type SettlementNodeData,
  type MinigameNodeData,
  type RatingNodeData,
  type MultiSelectNodeData,
  type TextInputNodeData,
  type RankOrderNodeData,
  type NumberPickerNodeData,
  type SceneChoice,
  type PersonalityVector,
  type ResultAnchor,
  type SectAnchor,
  type SectResultTexts,
  type SettlementButton,
  type SettlementButtonAction,
  type SettlementVariableModifier,
  type NodeType,
  type Variables,
  type SettlementResultMapping,
  type StageNodeData,
} from '@/types/flow';
import { evaluateGuard } from '@zorron/flow-schema';
import {
  add,
  magnitude,
  quadrant,
  ZERO_VECTOR,
} from './vectorMath';
import { getNodeProcessor } from './nodeRegistry';
import type { NodeProcessResult } from './processors/types';

/** A choice presented to the player for the current scene. */
export interface PlayerChoice {
  id: string;
  text: string;
  interaction?: SceneChoice['interaction'];
  holdDuration?: number;
  slashDirection?: SceneChoice['slashDirection'];
  /** Optional icon image URL displayed alongside the choice text. */
  icon?: string;
  /** Edge condition expression for locking/unlocking. */
  guard?: string;
  isLocked?: boolean;
}

/** Dialogue Backlog item for GalGame historical log reader. */
export interface BacklogItem {
  id: string;
  nodeId: string;
  speaker?: string;
  text: string;
  voiceUrl?: string;
  timestamp: number;
  choiceSelected?: string;
}

/** Complete serializable snapshot for Save/Load system. */
export interface GameStateSnapshot {
  schemaVersion: '2.0.0';
  timestamp: number;
  currentNodeId: string | null;
  variables: Variables;
  fragments: string[];
  vector?: PersonalityVector;
  pendingVector?: PersonalityVector;
  history: string[];
  backlog: BacklogItem[];
  bgmUrl?: string | null;
  bgmPositionSec?: number;
}

/** Result of a settlement node evaluation. */
export interface SettlementResult {
  anchor: ResultAnchor | null;
  distance: number;
  /** Vector-specific fields — only populated when vectorSpace is enabled. */
  magnitude?: number;
  finalVector?: PersonalityVector;
  quadrant?: string;
  /** Matched result mapping title/description from the settlement node. */
  title: string;
  description?: string;
  coverUrl?: string;
  /** Layered personality texts from the original project data. */
  resultTexts?: SectResultTexts;
  /** Buttons configured on the settlement node. */
  buttons?: SettlementButton[];
  /** Matched result mapping entry (for dev/debug). */
  mapping?: SettlementResultMapping;
  /** Visual blocks declared on the settlement node (for dynamic rendering). */
  visualBlocks?: Array<{ type: string; props?: Record<string, unknown> }>;
  /** Snapshot of all variables at settlement time (for custom blocks). */
  variables?: Variables;
}

/** Snapshot of the engine state exposed to subscribers. */
export interface GameState {
  currentNodeId: string | null;
  currentNodeType: NodeType | null;
  history: string[];
  variables: Variables;
  /** Vector state — only populated when vectorSpace is enabled. */
  vector?: PersonalityVector;
  fragments: string[];
  choices: PlayerChoice[];
  isFinished: boolean;
  /** Present when the engine reached a settlement node. */
  settlementResult: SettlementResult | null;
  /** Present when the engine reached a stage 2.0 node. */
  stage: StageNodeData | null;
  /** Present when the engine reached a video node. */
  video: { url: string; autoPlay: boolean; skipAllowed: boolean } | null;
  /** Present when the engine reached a link node. */
  link: { url: string; title?: string; description?: string } | null;
  /** Present when the engine reached a start node (intro screen). */
  start: { title?: string; intro?: string; coverUrl?: string } | null;
  /** Present when the engine reached a scene node. */
  scene: {
    dialogue?: string;
    backgroundUrl?: string;
    background?: string;
    characterUrl?: string;
    character?: string;
    spiritGuide?: string;
    focusObject?: string;
    speaker?: string;
    bgm?: string;
    sfx?: string;
    isBackgroundRemote?: boolean;
    isSpiritGuideRemote?: boolean;
    isFocusObjectRemote?: boolean;
  } | null;
  /** Present when the engine reached a minigame node (waits for score submission). */
  minigame: { gameUrl: string; passingScore?: number; scoreVariable?: string } | null;
  /** Present when the engine reached a rating node (waits for rating submission). */
  rating: {
    min: number;
    max: number;
    step?: number;
    prompt?: string;
    variable?: string;
    /** Optional labels for the slider endpoints. */
    minLabel?: string;
    maxLabel?: string;
  } | null;
  /** Present when the engine reached a multi-select node (waits for selection submission). */
  multiSelect: {
    question?: string;
    options: Array<{ id: string; label: string; description?: string; icon?: string }>;
    minSelect?: number;
    maxSelect?: number;
    variable?: string;
  } | null;
  /** Present when the engine reached a media node (display image/audio/video). */
  media: {
    mediaType: 'image' | 'audio' | 'video';
    url: string;
    autoAdvance?: boolean;
    durationMs?: number;
  } | null;
  /** Present when the engine reached a text-input node (waits for text submission). */
  textInput: {
    question?: string;
    placeholder?: string;
    hint?: string;
    variable?: string;
    required?: boolean;
    maxLength?: number;
  } | null;
  /** Present when the engine reached a rank-order node (waits for ordering submission). */
  rankOrder: {
    question?: string;
    hint?: string;
    variable?: string;
    items: Array<{ id: string; label: string; description?: string }>;
  } | null;
  /** Present when the engine reached a number-picker node (waits for value submission). */
  numberPicker: {
    question?: string;
    hint?: string;
    variable?: string;
    min: number;
    max: number;
    step: number;
    unit?: string;
    defaultValue: number;
  } | null;
  /** Background image URL for the current interactive stage (read from node data). */
  stageBackgroundUrl?: string | null;
}

/** Listener callback for state changes. */
export type StateListener = (state: GameState) => void;

/** Maximum number of restorable frames kept for step-back. */
const FRAME_HISTORY_LIMIT = 50;

/** Maximum number of backlog lines retained in memory. */
const BACKLOG_LIMIT = 200;

/**
 * Presentation fields that are mutually exclusive per rendered frame. When a
 * processor's state patch does not declare one of these, the engine clears it,
 * so a previously rendered node can never leak stale frame data forward.
 */
const MUTUALLY_EXCLUSIVE_FIELDS = [
  'start',
  'scene',
  'stage',
  'video',
  'link',
  'media',
  'minigame',
  'rating',
  'multiSelect',
  'textInput',
  'rankOrder',
  'numberPicker',
  'settlementResult',
] as const;

/** Build the initial empty game state. */
function createInitialState(): GameState {
  return {
    currentNodeId: null,
    currentNodeType: null,
    history: [],
    variables: {},
    // vector is only populated when vectorSpace is enabled (set in constructor).
    fragments: [],
    choices: [],
    isFinished: false,
    settlementResult: null,
    stage: null,
    video: null,
    link: null,
    start: null,
    scene: null,
    minigame: null,
    rating: null,
    multiSelect: null,
    media: null,
    textInput: null,
    rankOrder: null,
    numberPicker: null,
    stageBackgroundUrl: null,
  };
}

/**
 * The GameEngine. Construct with a FlowData; call `start()` to begin and
 * `selectChoice(choiceId)` to advance through scene choices.
 */
export class GameEngine {
  private nodes: FlowNode[];
  private edges: FlowEdge[];
  private variables: Variables;
  /** Snapshot of the initial variables from FlowData — used to reset on restart. */
  private initialVariables: Variables;
  private settings: FlowData['settings'];
  private fragments: Set<string> = new Set();
  private currentVector: PersonalityVector = { ...ZERO_VECTOR };
  private pendingVector: PersonalityVector = { ...ZERO_VECTOR };
  private currentNodeId: string | null = null;
  private history: string[] = [];
  private backlogBuffer: BacklogItem[] = [];
  /**
   * Snapshots of rendered frames, newest last, powering GalGame step-back.
   * Passthrough nodes never land here because they render nothing.
   */
  private frameHistory: GameStateSnapshot[] = [];
  /** True while `restore()` replays a frame, suppressing history capture. */
  private restoring = false;
  private listeners: Set<StateListener> = new Set();
  private state: GameState = createInitialState();

  /** Whether the vector space is enabled in project settings. */
  private get isVectorEnabled(): boolean {
    return this.settings.vectorSpace?.enabled ?? false;
  }

  constructor(flowData: FlowData) {
    this.nodes = flowData.nodes ?? [];
    this.edges = flowData.edges ?? [];
    this.initialVariables = { ...(flowData.variables ?? {}) };
    this.variables = { ...this.initialVariables };
    this.settings = flowData.settings ?? {};
  }

  /** Start the narrative. Returns the initial state. */
  start(): GameState {
    this.currentVector = { ...ZERO_VECTOR };
    this.pendingVector = { ...ZERO_VECTOR };
    this.fragments.clear();
    this.history = [];
    // Reset variables to the initial FlowData snapshot so that re-runs
    // don't carry over previously filled values (which would trigger
    // auto-skip on scene nodes whose setter target is already populated).
    this.variables = { ...this.initialVariables };

    const startNode = this.nodes.find((n) => n.type === 'start');
    const firstScene = this.nodes.find((n) => n.type === 'scene');
    const entry = startNode ?? firstScene ?? null;

    if (!entry) {
      this.state = { ...createInitialState(), isFinished: true };
      this.notify();
      return this.state;
    }

    this.enterNode(entry.id);
    return this.state;
  }

  /** Select a choice on the current scene or stage node. Returns the new state. */
  selectChoice(choiceId: string): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node) return this.state;

    let choice: { id: string; text: string; targetNodeId?: string; vector?: PersonalityVector; dropFragmentId?: string | null; guard?: string } | undefined;

    if (node.type === 'scene') {
      const data = node.data as SceneNodeData;
      choice = data.choices?.find((c) => c.id === choiceId);
    } else if (node.type === 'stage') {
      const data = node.data as StageNodeData;
      choice = data.interaction?.choices?.find((c) => c.id === choiceId);
    }

    if (!choice) return this.state;

    // Check guard condition if present
    if (choice.guard) {
      const isAllowed = evaluateGuard(choice.guard, { variables: this.variables, fragments: this.fragments });
      if (!isAllowed) {
        return this.state; // Blocked by guard
      }
    }

    // Record selected choice in the last backlog entry
    if (this.backlogBuffer.length > 0) {
      this.backlogBuffer[this.backlogBuffer.length - 1].choiceSelected = choice.text;
    }

    // Accumulate pending vector delta (applied at the next calculator node).
    // Skipped when the vector space is disabled in project settings.
    if (this.isVectorEnabled && choice.vector) {
      this.pendingVector = add(this.pendingVector, choice.vector);
    }
    // Collect fragment if dropped by this choice.
    if (choice.dropFragmentId) {
      this.fragments.add(choice.dropFragmentId);
    }

    // Find the next node via the choice's source handle (choiceId) or targetNodeId.
    let nextId: string | null = null;
    if (choice.targetNodeId) {
      nextId = choice.targetNodeId;
    } else {
      nextId = this.findTargetNodeId(node.id, choiceId);
    }

    if (!nextId) {
      // No outgoing edge: end the flow.
      this.state = { ...this.state, isFinished: true, choices: [] };
      this.notify();
      return this.state;
    }

    this.enterNode(nextId);
    return this.state;
  }

  /** Select a button on the current settlement node. Returns the new state. */
  selectSettlementButton(buttonId: string): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node || node.type !== 'settlement') return this.state;

    const data = node.data as SettlementNodeData;
    const button = data.buttons?.find((b) => b.id === buttonId);
    if (!button) return this.state;

    // Apply per-button actions (variable writes).
    for (const action of button.actions ?? []) {
      this.applySettlementAction(action);
    }

    // Apply node-level variable modifiers as a fallback/compatibility layer.
    for (const modifier of data.variableModifiers ?? data.modifiers ?? []) {
      this.applySettlementModifier(modifier);
    }

    // Resolve the outgoing edge via the button's output handle.
    const handleId = button.outputHandleId ?? `button_${(data.buttons ?? []).indexOf(button)}`;
    const nextId = this.findTargetNodeId(node.id, handleId) ?? this.findTargetNodeId(node.id, null);

    if (!nextId) {
      this.state = { ...this.state, isFinished: true, choices: [] };
      this.notify();
      return this.state;
    }

    this.enterNode(nextId);
    return this.state;
  }

  /** Apply a settlement button action to the variables map. */
  private applySettlementAction(action: SettlementButtonAction): void {
    const variable = action.varName ?? action.variableName ?? '';
    if (!variable) return;
    const operator = action.action ?? 'set';
    this.applyAssignment(variable, action.value ?? 0, operator);
  }

  /** Apply a settlement node-level variable modifier. */
  private applySettlementModifier(modifier: SettlementVariableModifier): void {
    const variable = modifier.variableName ?? modifier.varName ?? '';
    if (!variable) return;
    const operator = modifier.operation ?? modifier.action ?? 'set';
    this.applyAssignment(variable, modifier.value ?? 0, operator);
  }

  /** Advance from settlement node to next connected node. */
  advanceFromSettlement(targetNodeId?: string): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node || node.type !== 'settlement') return this.state;
    const nextId = targetNodeId ?? (node.data as any).targetNodeId ?? this.findTargetNodeId(node.id, null);
    if (!nextId) {
      this.state = { ...this.state, isFinished: true };
      this.notify();
      return this.state;
    }
    this.enterNode(nextId);
    return this.state;
  }

  /** Skip the current video node (advances to the next node). */
  skipVideo(): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node || node.type !== 'video') return this.state;
    const nextId = this.findTargetNodeId(node.id, null);
    if (!nextId) {
      this.state = { ...this.state, isFinished: true, video: null };
      this.notify();
      return this.state;
    }
    this.enterNode(nextId);
    return this.state;
  }

  /** Get the current state snapshot. */
  getState(): GameState {
    return this.state;
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Reset the engine to its initial state (keeps the same FlowData). */
  reset(): GameState {
    this.state = createInitialState();
    this.currentNodeId = null;
    this.history = [];
    this.fragments.clear();
    this.currentVector = { ...ZERO_VECTOR };
    this.pendingVector = { ...ZERO_VECTOR };
    this.backlogBuffer = [];
    this.frameHistory = [];
    this.restoring = false;
    this.notify();
    return this.state;
  }

  // ---- Internal traversal -------------------------------------------------

  /** Enter a node by id, processing passthrough nodes recursively. */
  private enterNode(nodeId: string): void {
    const node = this.getNode(nodeId);
    if (!node) {
      this.state = { ...this.state, isFinished: true };
      this.notify();
      return;
    }

    // Auto-skip: when the engine already has prior knowledge of a variable
    // (e.g. via JX3 推栏号 lookup), scene nodes that would write that variable
    // are skipped — together with their downstream setter node — to avoid
    // overwriting the known value and to streamline the user flow.
    if (node.type === 'scene') {
      const skipTarget = this.findSceneSkipTarget(node);
      if (skipTarget) {
        this.enterNode(skipTarget);
        return;
      }
    }

    this.currentNodeId = nodeId;
    this.history = [...this.history, nodeId];

    // Read stage background from any node's base data — applies to all interactive stages.
    const nodeData = node.data as BaseNodeData;
    this.state = {
      ...this.state,
      stageBackgroundUrl: nodeData?.backgroundUrl ?? null,
    };

    const processor = getNodeProcessor(node.type as NodeType);
    if (!processor) {
      // Unknown node type: stop rather than silently rendering nothing.
      this.state = { ...this.state, isFinished: true };
      this.notify();
      return;
    }

    const result = processor({
      node,
      variables: this.variables,
      fragments: this.fragments,
      currentVector: this.currentVector,
      pendingVector: this.pendingVector,
      anchors: this.settings.vectorSpace?.sects ?? [],
      vectorEnabled: this.isVectorEnabled,
      findTargetNodeId: (sourceId, handleId) =>
        this.findTargetNodeId(sourceId, handleId),
      getNode: (id) => this.getNode(id),
    });

    this.applyProcessResult(result);

    if (result.finish) {
      this.state = { ...this.state, isFinished: true };
      this.notify();
      return;
    }

    // Passthrough nodes resolve to their successor immediately; the terminal
    // presentational node in the chain performs the single notify().
    if (result.nextNodeId) {
      this.enterNode(result.nextNodeId);
      return;
    }

    // Presentational frame: remember it so the player can step back. Skipped
    // while restoring, otherwise a rollback would push a duplicate frame.
    if (!this.restoring) {
      this.frameHistory.push(this.snapshot());
      if (this.frameHistory.length > FRAME_HISTORY_LIMIT) {
        this.frameHistory.shift();
      }
    }

    this.notify();
  }

  /** Whether a previously rendered frame is available to step back to. */
  canGoBack(): boolean {
    return this.frameHistory.length >= 2;
  }

  /**
   * Step back to the previously rendered frame (GalGame rollback).
   *
   * Restores variables, fragments, vector and backlog exactly as they were
   * when that frame was shown, so re-reading or re-choosing behaves
   * consistently with the first pass.
   */
  goBack(): GameState {
    if (!this.canGoBack()) return this.state;
    // Discard the frame currently on screen.
    this.frameHistory.pop();
    const previous = this.frameHistory[this.frameHistory.length - 1];
    if (!previous) return this.state;

    this.restoring = true;
    this.restore(previous);
    this.restoring = false;
    return this.state;
  }

  /**
   * Apply a processor result to the engine.
   *
   * Order matters: variables are written first so a node's own guards and
   * backlog entries observe the mutations it declared.
   */
  private applyProcessResult(result: NodeProcessResult): void {
    if (result.variables) {
      this.variables = { ...this.variables, ...result.variables };
    }
    if (result.addFragments?.length) {
      for (const id of result.addFragments) this.fragments.add(id);
    }
    if (result.vectorDelta && this.isVectorEnabled) {
      this.pendingVector = add(this.pendingVector, result.vectorDelta);
    }
    if (result.flushVector) {
      this.currentVector = add(this.currentVector, this.pendingVector);
      this.pendingVector = { ...ZERO_VECTOR };
    }
    if (result.backlog?.length) {
      for (const entry of result.backlog) {
        this.backlogBuffer.push({
          id: `bl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          nodeId: entry.nodeId,
          speaker: entry.speaker,
          text: entry.text,
          voiceUrl: entry.voiceUrl,
        });
      }
      if (this.backlogBuffer.length > BACKLOG_LIMIT) {
        this.backlogBuffer = this.backlogBuffer.slice(-BACKLOG_LIMIT);
      }
    }
    if (result.state) {
      this.state = { ...this.clearExclusiveFields(result.state), ...result.state };
    }
  }

  /**
   * Null out presentation fields a processor did not claim, so a stale frame
   * from a previous node can never leak into the current one.
   */
  private clearExclusiveFields(patch: Partial<GameState>): GameState {
    const next: GameState = { ...this.state };
    for (const field of MUTUALLY_EXCLUSIVE_FIELDS) {
      if (!(field in patch)) {
        (next as unknown as Record<string, unknown>)[field] = null;
      }
    }
    return next;
  }

  /** Advance from the start node to its successor. */
  advanceFromStart(): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node || node.type !== 'start') return this.state;
    const nextId = this.findTargetNodeId(node.id, null);
    if (!nextId) {
      this.state = { ...this.state, isFinished: true };
      this.notify();
      return this.state;
    }
    this.enterNode(nextId);
    return this.state;
  }

  /**
   * Auto-skip helper: when the engine has prior knowledge of a variable
   * (e.g. via JX3 推栏号 lookup), scene nodes that would write that variable
   * are skipped entirely — including their downstream setter node.
   *
   * Detection rule: inspect the scene's first choice's target setter. If
   * that setter's first assignment writes a variable that already has a
   * non-empty value, return the setter's downstream node id so the engine
   * can advance past the scene + setter in one hop.
   *
   * @returns target node id to advance to, or null when no skip applies.
   */
  private findSceneSkipTarget(sceneNode: FlowNode): string | null {
    const data = sceneNode.data as SceneNodeData;
    const firstChoice = data.choices?.[0];
    if (!firstChoice?.targetNodeId) return null;
    const setter = this.getNode(firstChoice.targetNodeId);
    if (!setter || setter.type !== 'setter') return null;
    const setterData = setter.data as SetterNodeData;
    const assignment = setterData.assignments?.[0];
    if (!assignment) return null;
    // Only 'set' operations can be auto-skipped. 'add'/'sub' accumulate
    // onto an existing value (e.g. game_view_score starts at 0), so the
    // scene must still be visited to collect the player's choice.
    if (assignment.operator !== 'set') return null;
    const current = this.variables[assignment.variable];
    if (current === undefined || current === null || current === '') return null;
    // Variable already populated — find setter's downstream node.
    return this.findTargetNodeId(setter.id, null);
  }

  /** Advance directly from current Stage node to target node. */
  advanceFromStage(targetNodeId?: string): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node || node.type !== 'stage') return this.state;

    const nextId = targetNodeId || this.findTargetNodeId(node.id, null);
    if (!nextId) {
      this.state = { ...this.state, isFinished: true, stage: null };
      this.notify();
      return this.state;
    }
    this.enterNode(nextId);
    return this.state;
  }

  /** Retrieve dialogue backlog entries. */
  getBacklog(): BacklogItem[] {
    return [...this.backlogBuffer];
  }

  /** Capture full serializable game state snapshot for Save slot. */
  snapshot(extra?: { bgmUrl?: string | null; bgmPositionSec?: number }): GameStateSnapshot {
    return {
      schemaVersion: '2.0.0',
      timestamp: Date.now(),
      currentNodeId: this.currentNodeId,
      variables: { ...this.variables },
      fragments: [...this.fragments],
      vector: this.isVectorEnabled ? { ...this.currentVector } : undefined,
      pendingVector: this.isVectorEnabled ? { ...this.pendingVector } : undefined,
      history: [...this.history],
      backlog: [...this.backlogBuffer],
      bgmUrl: extra?.bgmUrl,
      bgmPositionSec: extra?.bgmPositionSec,
    };
  }

  /** Restore engine state from a previously saved snapshot. */
  restore(snapshot: GameStateSnapshot): GameState {
    this.currentNodeId = snapshot.currentNodeId;
    this.variables = { ...snapshot.variables };
    this.fragments = new Set(snapshot.fragments ?? []);
    this.currentVector = snapshot.vector ? { ...snapshot.vector } : { ...ZERO_VECTOR };
    this.pendingVector = snapshot.pendingVector ? { ...snapshot.pendingVector } : { ...ZERO_VECTOR };
    this.history = [...(snapshot.history ?? [])];

    if (snapshot.currentNodeId) {
      this.enterNode(snapshot.currentNodeId);
    } else {
      this.notify();
    }

    // Preserve exact backlog buffer from snapshot
    this.backlogBuffer = [...(snapshot.backlog ?? [])];
    return this.state;
  }

  /** Apply a setter assignment to the variables map. */
  private applyAssignment(
    variable: string,
    value: string | number | boolean,
    operator: 'set' | 'add' | 'sub',
  ): void {
    if (operator === 'set') {
      this.variables[variable] = value;
      return;
    }
    // add/sub only make sense for numbers
    const current = Number(this.variables[variable] ?? 0);
    const delta = Number(value);
    if (operator === 'add') {
      this.variables[variable] = current + delta;
    } else {
      this.variables[variable] = current - delta;
    }
  }

  /** Complete minigame either with pass/fail boolean or score. */
  completeMinigame(success: boolean): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node || node.type !== 'minigame') return this.state;
    const data = node.data as MinigameNodeData;

    let nextId: string | null = null;
    if (success) {
      nextId = data.passTargetNodeId ?? this.findTargetNodeId(node.id, null);
    } else {
      nextId = data.failTargetNodeId ?? this.findTargetNodeId(node.id, 'fail') ?? this.findTargetNodeId(node.id, null);
    }

    if (!nextId) {
      this.state = { ...this.state, isFinished: true, minigame: null };
      this.notify();
      return this.state;
    }
    this.enterNode(nextId);
    return this.state;
  }

  /** Submit a minigame score; advances the flow if it meets the passing score. */
  submitMinigame(score: number): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node || node.type !== 'minigame') return this.state;
    const data = node.data as MinigameNodeData;
    const passing = data.passingScore ?? 0;
    if (score < passing) {
      // Score below threshold — stay on the minigame node (let UI retry).
      return this.state;
    }
    if (data.scoreVariable) {
      this.variables[data.scoreVariable] = score;
    }
    const nextId = data.passTargetNodeId ?? this.findTargetNodeId(node.id, null);
    if (!nextId) {
      this.state = { ...this.state, isFinished: true, minigame: null };
      this.notify();
      return this.state;
    }
    this.enterNode(nextId);
    return this.state;
  }

  /** Submit a rating value; writes the variable and advances the flow. */
  submitRating(value: number): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node || node.type !== 'rating') return this.state;
    const data = node.data as RatingNodeData;
    const min = data.min ?? (data as any).minRating ?? 1;
    const max = data.max ?? (data as any).maxRating ?? 5;
    const clamped = Math.max(min, Math.min(max, value));
    if (data.variable) {
      this.variables[data.variable] = clamped;
    }
    const nextId = (data as any).targetNodeId ?? this.findTargetNodeId(node.id, null);
    if (!nextId) {
      this.state = { ...this.state, isFinished: true, rating: null };
      this.notify();
      return this.state;
    }
    this.enterNode(nextId);
    return this.state;
  }

  /** Submit multi-select choices; writes the variable and advances the flow. */
  submitMultiSelect(optionIds: string[]): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node || node.type !== 'multi-select') return this.state;
    const data = node.data as MultiSelectNodeData;
    const min = data.minSelected ?? data.minSelect ?? 0;
    const max = data.maxSelected ?? data.maxSelect ?? 0;
    if (optionIds.length < min) return this.state;
    if (max > 0 && optionIds.length > max) return this.state;
    if (data.variable) {
      this.variables[data.variable] = optionIds.join(',');
    }
    const nextId = (data as any).targetNodeId ?? this.findTargetNodeId(node.id, null);
    if (!nextId) {
      this.state = { ...this.state, isFinished: true, multiSelect: null };
      this.notify();
      return this.state;
    }
    this.enterNode(nextId);
    return this.state;
  }

  /** Advance from the current media node to its successor. */
  advanceFromMedia(): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node || node.type !== 'media') return this.state;
    const nextId = (node.data as any).targetNodeId ?? this.findTargetNodeId(node.id, null);
    if (!nextId) {
      this.state = { ...this.state, isFinished: true, media: null };
      this.notify();
      return this.state;
    }
    this.enterNode(nextId);
    return this.state;
  }

  /** Submit text input; writes the variable and advances the flow. */
  submitTextInput(value: string): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node || node.type !== 'text-input') return this.state;
    const data = node.data as TextInputNodeData;
    const trimmed = value.trim();
    if (data.required && !trimmed) return this.state;
    if (data.variable) {
      this.variables[data.variable] = trimmed;
    }
    const nextId = (data as any).targetNodeId ?? this.findTargetNodeId(node.id, null);
    if (!nextId) {
      this.state = { ...this.state, isFinished: true, textInput: null };
      this.notify();
      return this.state;
    }
    this.enterNode(nextId);
    return this.state;
  }

  /** Submit a rank ordering; writes the variable and advances the flow. */
  submitRankOrder(orderedIds: string[]): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node || node.type !== 'rank-order') return this.state;
    const data = node.data as RankOrderNodeData;
    if (data.variable) {
      this.variables[data.variable] = orderedIds.join(',');
    }
    const nextId = (data as any).targetNodeId ?? this.findTargetNodeId(node.id, null);
    if (!nextId) {
      this.state = { ...this.state, isFinished: true, rankOrder: null };
      this.notify();
      return this.state;
    }
    this.enterNode(nextId);
    return this.state;
  }

  /** Submit a number-picker value; writes the variable and advances the flow. */
  submitNumberPicker(value: number): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node || node.type !== 'number-picker') return this.state;
    const data = node.data as NumberPickerNodeData;
    const step = data.step && data.step > 0 ? data.step : 1;
    // Clamp value to [min, max] and align to step grid.
    let clamped = Math.max(data.min, Math.min(data.max, value));
    const offset = (clamped - data.min) % step;
    if (offset !== 0) {
      // Round to nearest step.
      clamped = clamped - offset;
    }
    if (data.variable) {
      this.variables[data.variable] = clamped;
    }
    const nextId = this.findTargetNodeId(node.id, null);
    if (!nextId) {
      this.state = { ...this.state, isFinished: true, numberPicker: null };
      this.notify();
      return this.state;
    }
    this.enterNode(nextId);
    return this.state;
  }

  // ---- Helpers ------------------------------------------------------------

  /**
   * Bulk-merge variables from an external source (e.g. the JX3 推栏号
   * lookup response). Values present in `values` overwrite the existing
   * ones; keys not present are left untouched.
   *
   * Used by `submitTextInputWithLookup` before advancing to the next node,
   * so that the auto-skip logic in `enterNode` sees the populated variables
   * and skips already-known scene nodes.
   */
  applyVariables(values: Record<string, string | number | boolean>): void {
    this.variables = { ...this.variables, ...values };
  }

  /** Find a node by id. */
  private getNode(id: string): FlowNode | undefined {
    return this.nodes.find((n) => n.id === id);
  }

  /** Find the target node id for a source node + optional source handle. */
  private findTargetNodeId(sourceId: string, handleId: string | null): string | null {
    let edge = this.edges.find(
      (e) => e.source === sourceId && (e.sourceHandle ?? null) === (handleId ?? null),
    );
    if (!edge && handleId === null) {
      edge = this.edges.find(
        (e) =>
          e.source === sourceId &&
          (e.sourceHandle === null || e.sourceHandle === undefined || e.sourceHandle === ''),
      );
    }
    return edge ? edge.target : null;
  }

  /** Notify all subscribers of the current state. */
  private notify(): void {
    // Refresh the public state snapshot with current internal values.
    this.state = {
      ...this.state,
      variables: { ...this.variables },
      vector: { ...this.currentVector },
      fragments: [...this.fragments],
      history: [...this.history],
    };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

/** Compare two numbers with a string operator. */
function compare(a: number, op: LogicNodeData['operator'], b: number): boolean {
  switch (op) {
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    case '==':
      return a === b;
    case '>':
      return a > b;
    case '<':
      return a < b;
    default:
      return false;
  }
}

/** Re-export engine types for consumers. */
export type { FlowData, FlowNode, FlowEdge, GameNodeData, ResultAnchor, SectAnchor };
