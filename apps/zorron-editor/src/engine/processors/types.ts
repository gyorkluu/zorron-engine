/**
 * Node processor contract — the engine's plugin surface for node behaviour.
 *
 * Every node type contributes one pure `NodeProcessor`. It inspects the node
 * data plus a read-only view of the engine and *describes* what should change;
 * the engine applies the result. Because processors never touch engine
 * internals they stay unit-testable in isolation and the engine no longer
 * needs a giant switch over node types.
 *
 * Three processor shapes exist:
 *  - **Presentational**: return a `state` patch and let the engine notify once.
 *  - **Passthrough**: mutate variables / vectors and return `nextNodeId`; the
 *    engine recurses immediately so no intermediate frame is rendered.
 *  - **Terminal with result**: return a `state` patch carrying the settlement
 *    result and stop.
 */

import type { ComponentType } from 'react';
import type { ZodType } from 'zod';
import type {
  FlowNode,
  Variables,
  PersonalityVector,
  ResultAnchor,
} from '@/types/flow';
import type { GameState } from '@/engine/GameEngine';

/** Read-only view of the engine handed to a processor. */
export interface NodeProcessorContext {
  /** The node currently being entered. */
  node: FlowNode;
  /** Current variable map. */
  variables: Variables;
  /** Currently collected fragments. */
  fragments: Set<string>;
  /** Accumulated vector. */
  currentVector: PersonalityVector;
  /** Vector deltas awaiting the next calculator node. */
  pendingVector: PersonalityVector;
  /** Result anchors configured on the project. */
  anchors: ResultAnchor[];
  /** Whether the project enables the vector space. */
  vectorEnabled: boolean;
  /** Resolve the outgoing node id for a handle (edge lookup). */
  findTargetNodeId: (sourceId: string, handleId: string | null) => string | null;
  /** Look up any node by id. */
  getNode: (id: string) => FlowNode | undefined;
}

/** A backlog line contributed by a processor (engine fills id/timestamp). */
export interface ProcessorBacklogEntry {
  nodeId: string;
  speaker?: string;
  text: string;
  voiceUrl?: string;
}

/** What a processor asks the engine to do. */
export interface NodeProcessResult {
  /** Partial GameState patch merged by the engine. */
  state?: Partial<GameState>;
  /** Variable writes to apply. */
  variables?: Record<string, string | number | boolean>;
  /** Fragment ids to collect. */
  addFragments?: string[];
  /** Vector delta accumulated into `pendingVector`. */
  vectorDelta?: PersonalityVector;
  /** Consume `pendingVector` into `currentVector` right away. */
  flushVector?: boolean;
  /** Backlog lines to append. */
  backlog?: ProcessorBacklogEntry[];
  /** Continue immediately to this node (passthrough nodes). */
  nextNodeId?: string | null;
  /** Terminate the run. */
  finish?: boolean;
}

/** Pure function describing one node type's behaviour. */
export type NodeProcessor = (ctx: NodeProcessorContext) => NodeProcessResult;

/** Props handed to a node type's player renderer. */
export interface PlayerStageProps {
  /** Current engine state. */
  state: GameState;
  /** Restart the run — provided to settlement stages. */
  onRestart?: () => void;
  /** Handle a settlement button press — provided to settlement stages. */
  onSettlementButton?: (buttonId: string) => void;
}

/** Player-side renderer for a node type. */
export type PlayerStageComponent = ComponentType<PlayerStageProps>;

/**
 * Optional Zod schema for a node's `data` payload.
 *
 * Registered here so validation, editor forms and the AI compiler all read the
 * same contract instead of maintaining parallel copies.
 */
export type NodeDataSchema = ZodType<any>;
