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
  type SceneNodeData,
  type LogicNodeData,
  type SetterNodeData,
  type CalculatorNodeData,
  type SettlementNodeData,
  type VideoNodeData,
  type LinkNodeData,
  type StartNodeData,
  type SceneChoice,
  type PersonalityVector,
  type SectAnchor,
  type SectResultTexts,
  type SettlementButton,
  type SettlementButtonAction,
  type SettlementVariableModifier,
  type NodeType,
  type Variables,
  type SettlementResultMapping,
} from '@/types/flow';
import {
  add,
  magnitude,
  quadrant,
  findNearestSect,
  ZERO_VECTOR,
} from './vectorMath';

/** A choice presented to the player for the current scene. */
export interface PlayerChoice {
  id: string;
  text: string;
  interaction: SceneChoice['interaction'];
  holdDuration?: number;
  slashDirection?: SceneChoice['slashDirection'];
}

/** Result of a settlement node evaluation. */
export interface SettlementResult {
  sect: SectAnchor | null;
  distance: number;
  magnitude: number;
  finalVector: PersonalityVector;
  quadrant: string;
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
}

/** Snapshot of the engine state exposed to subscribers. */
export interface GameState {
  currentNodeId: string | null;
  currentNodeType: NodeType | null;
  history: string[];
  variables: Variables;
  vector: PersonalityVector;
  fragments: string[];
  choices: PlayerChoice[];
  isFinished: boolean;
  /** Present when the engine reached a settlement node. */
  settlementResult: SettlementResult | null;
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
}

/** Listener callback for state changes. */
export type StateListener = (state: GameState) => void;

/** Build the initial empty game state. */
function createInitialState(): GameState {
  return {
    currentNodeId: null,
    currentNodeType: null,
    history: [],
    variables: {},
    vector: { ...ZERO_VECTOR },
    fragments: [],
    choices: [],
    isFinished: false,
    settlementResult: null,
    video: null,
    link: null,
    start: null,
    scene: null,
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
  private settings: FlowData['settings'];
  private fragments: Set<string> = new Set();
  private currentVector: PersonalityVector = { ...ZERO_VECTOR };
  private pendingVector: PersonalityVector = { ...ZERO_VECTOR };
  private currentNodeId: string | null = null;
  private history: string[] = [];
  private lastSettlementResult: SettlementResult | null = null;
  private listeners: Set<StateListener> = new Set();
  private state: GameState = createInitialState();

  constructor(flowData: FlowData) {
    this.nodes = flowData.nodes ?? [];
    this.edges = flowData.edges ?? [];
    this.variables = { ...(flowData.variables ?? {}) };
    this.settings = flowData.settings ?? {
      vectorSpace: { enabled: false, dimensions: { x: '处世', y: '立场', z: '性情' } },
    };
  }

  /** Start the narrative. Returns the initial state. */
  start(): GameState {
    this.currentVector = { ...ZERO_VECTOR };
    this.pendingVector = { ...ZERO_VECTOR };
    this.fragments.clear();
    this.history = [];
    this.lastSettlementResult = null;
    this.variables = { ...this.variables };

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

  /** Select a choice on the current scene node. Returns the new state. */
  selectChoice(choiceId: string): GameState {
    if (!this.currentNodeId) return this.state;
    const node = this.getNode(this.currentNodeId);
    if (!node || node.type !== 'scene') return this.state;

    const data = node.data as SceneNodeData;
    const choice = data.choices?.find((c) => c.id === choiceId);
    if (!choice) return this.state;

    // Accumulate pending vector delta (applied at the next calculator node).
    if (choice.vector) {
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
    this.lastSettlementResult = null;
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

    this.currentNodeId = nodeId;
    this.history = [...this.history, nodeId];

    switch (node.type) {
      case 'logic':
        this.processLogic(node);
        return;
      case 'setter':
        this.processSetter(node);
        return;
      case 'calculator':
        this.processCalculator(node);
        return;
      case 'settlement':
        this.processSettlement(node);
        return;
      case 'start':
        this.processStart(node);
        return;
      case 'scene':
        this.processScene(node);
        return;
      case 'video':
        this.processVideo(node);
        return;
      case 'link':
        this.processLink(node);
        return;
      default:
        this.state = { ...this.state, isFinished: true };
        this.notify();
    }
  }

  private processStart(node: FlowNode): void {
    const data = node.data as StartNodeData;
    const nextId = this.findTargetNodeId(node.id, null);
    this.state = {
      ...this.state,
      currentNodeId: node.id,
      currentNodeType: 'start',
      start: {
        title: data.title,
        intro: data.intro,
        coverUrl: data.coverUrl ?? data.cover,
      },
      choices: [],
      isFinished: false,
    };
    this.notify();
    // Auto-advance from start to the next node after a tick (UI may show intro).
    // The player UI triggers advance explicitly; we do NOT auto-advance here.
    void nextId;
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

  private processScene(node: FlowNode): void {
    const data = node.data as SceneNodeData;
    const choices: PlayerChoice[] = (data.choices ?? []).map((c) => ({
      id: c.id,
      text: c.text,
      interaction: c.interaction,
      holdDuration: c.holdDuration,
      slashDirection: c.slashDirection,
    }));
    this.state = {
      ...this.state,
      currentNodeId: node.id,
      currentNodeType: 'scene',
      scene: {
        dialogue: data.dialogue,
        backgroundUrl: data.backgroundUrl ?? data.background,
        background: data.background,
        characterUrl: data.characterUrl ?? data.character ?? data.spiritGuide,
        character: data.character,
        spiritGuide: data.spiritGuide,
        focusObject: data.focusObject,
        speaker: data.speaker,
        bgm: data.bgm,
        sfx: data.sfx,
        isBackgroundRemote: data.isBackgroundRemote,
        isSpiritGuideRemote: data.isSpiritGuideRemote,
        isFocusObjectRemote: data.isFocusObjectRemote,
      },
      choices,
      isFinished: false,
      video: null,
      link: null,
      start: null,
      settlementResult: null,
    };
    this.notify();
  }

  private processLogic(node: FlowNode): void {
    const data = node.data as LogicNodeData;
    const result = this.evaluateLogic(data);
    const handleId = result ? 'true' : 'false';
    const nextId = this.findTargetNodeId(node.id, handleId) ?? this.findTargetNodeId(node.id, null);
    if (!nextId) {
      this.state = { ...this.state, isFinished: true };
      this.notify();
      return;
    }
    this.enterNode(nextId);
  }

  /** Evaluate a logic node's condition against the current variables/fragments. */
  private evaluateLogic(data: LogicNodeData): boolean {
    const checkType = data.checkType ?? 'variable';
    if (checkType === 'count') {
      const count = this.fragments.size;
      const threshold = data.countThreshold ?? 0;
      return compare(count, data.operator ?? '>=', threshold);
    }
    if (checkType === 'has-specific') {
      return this.fragments.has(data.targetFragmentId ?? '');
    }
    // variable check
    const current = Number(this.variables[data.varName ?? ''] ?? 0);
    return compare(current, data.operator ?? '>=', data.value ?? 0);
  }

  private processSetter(node: FlowNode): void {
    const data = node.data as SetterNodeData;
    for (const assignment of data.assignments ?? []) {
      this.applyAssignment(assignment.variable, assignment.value, assignment.operator);
    }
    const nextId = this.findTargetNodeId(node.id, null);
    if (!nextId) {
      this.state = { ...this.state, isFinished: true };
      this.notify();
      return;
    }
    this.enterNode(nextId);
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

  private processCalculator(node: FlowNode): void {
    const data = node.data as CalculatorNodeData;
    // Apply pending vector deltas.
    if (
      this.pendingVector.x !== 0 ||
      this.pendingVector.y !== 0 ||
      this.pendingVector.z !== 0
    ) {
      this.currentVector = add(this.currentVector, this.pendingVector);
      this.pendingVector = { ...ZERO_VECTOR };
    }
    // Optionally store the vector into a target variable.
    if (data.targetVariable) {
      this.variables[data.targetVariable] = magnitude(this.currentVector);
    }
    const nextId = this.findTargetNodeId(node.id, null);
    if (!nextId) {
      this.state = { ...this.state, isFinished: true };
      this.notify();
      return;
    }
    this.enterNode(nextId);
  }

  private processSettlement(node: FlowNode): void {
    const data = node.data as SettlementNodeData;
    const finalVector = { ...this.currentVector };
    const mag = magnitude(finalVector);
    const playerQuadrant = quadrant(finalVector);

    // Resolve sect anchors from project settings, then match by nearest neighbor.
    const sects = this.settings.vectorSpace?.sects ?? [];
    const { sect, distance: nearestDistance } = findNearestSect(finalVector, sects);

    // Find a matching result mapping (first whose condition is satisfied, else first).
    const mapping = data.resultMapping?.[0];

    const result: SettlementResult = {
      sect,
      distance: nearestDistance,
      magnitude: mag,
      finalVector,
      quadrant: playerQuadrant,
      title: mapping?.title ?? sect?.name ?? 'Settlement',
      description: mapping?.description ?? sect?.description,
      coverUrl: mapping?.coverUrl ?? sect?.coverUrl,
      resultTexts: sect?.resultTexts,
      buttons: data.buttons,
      mapping,
    };
    this.lastSettlementResult = result;

    this.state = {
      ...this.state,
      currentNodeId: node.id,
      currentNodeType: 'settlement',
      settlementResult: result,
      choices: [],
      isFinished: true,
      video: null,
      link: null,
      start: null,
      scene: null,
    };
    this.notify();
  }

  private processVideo(node: FlowNode): void {
    const data = node.data as VideoNodeData;
    this.state = {
      ...this.state,
      currentNodeId: node.id,
      currentNodeType: 'video',
      video: {
        url: data.videoUrl,
        autoPlay: data.autoPlay,
        skipAllowed: data.skipAllowed,
      },
      choices: [],
      isFinished: false,
    };
    this.notify();
  }

  private processLink(node: FlowNode): void {
    const data = node.data as LinkNodeData;
    this.state = {
      ...this.state,
      currentNodeId: node.id,
      currentNodeType: 'link',
      link: {
        url: data.url,
        title: data.title,
        description: data.description,
      },
      choices: [],
      isFinished: true,
    };
    this.notify();
  }

  // ---- Helpers ------------------------------------------------------------

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
export type { FlowData, FlowNode, FlowEdge, GameNodeData, SectAnchor };
