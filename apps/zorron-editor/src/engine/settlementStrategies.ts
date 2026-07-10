/**
 * Settlement strategy registry.
 *
 * Each strategy implements a different algorithm for matching the player's
 * final state (vector + variables + fragments) to a result anchor. The
 * registry allows new strategies to be registered without modifying the
 * engine core.
 *
 * Built-in strategies:
 * - vector-nearest: Euclidean nearest anchor (default, legacy behavior)
 * - threshold: first anchor whose threshold rule on a vector axis is satisfied
 * - count-tally: anchor with the highest tally of collected fragments/variables
 * - variable-map: anchor matched by game variable value comparison
 */

import type {
  ResultAnchor,
  SettlementNodeData,
  SettlementResultMapping,
  Vector,
  Variables,
} from '@/types/flow';
import { findNearestAnchor } from './vectorMath';

/** Context passed to every settlement strategy. */
export interface SettlementContext {
  /** The player's final personality vector. */
  finalVector: Vector;
  /** Magnitude of the final vector. */
  magnitude: number;
  /** Quadrant string of the final vector. */
  quadrant: string;
  /** Game variables at settlement time. */
  variables: Variables;
  /** Fragment IDs collected by the player. */
  fragments: Set<string>;
  /** Result anchors from the project's vector space config. */
  anchors: ResultAnchor[];
  /** The settlement node's raw data (includes strategy + strategyConfig). */
  nodeData: SettlementNodeData;
}

/** Output of a settlement strategy. */
export interface SettlementOutput {
  /** The matched result anchor, or null if none matched. */
  anchor: ResultAnchor | null;
  /** Distance metric (Euclidean for vector-nearest, 0 for others). */
  distance: number;
  /** The result mapping to display. */
  mapping: SettlementResultMapping | undefined;
}

/** A pluggable settlement algorithm. */
export interface SettlementStrategy {
  /** Unique strategy identifier (e.g. 'vector-nearest'). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Short description. */
  description: string;
  /** Execute the strategy and return the matched anchor + mapping. */
  execute(ctx: SettlementContext): SettlementOutput;
}

// --- Helpers ---

/** Find a mapping by resultId, falling back to the first mapping. */
function resolveMapping(
  anchorId: string | undefined,
  mappings: SettlementResultMapping[] | undefined,
): SettlementResultMapping | undefined {
  if (!mappings || mappings.length === 0) return undefined;
  if (anchorId) {
    const match = mappings.find((m) => m.resultId === anchorId);
    if (match) return match;
  }
  return mappings[0];
}

/** Compare two numbers with a string operator. */
function compareNum(a: number, op: string, b: number): boolean {
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

// --- Built-in strategies ---

/** vector-nearest: Euclidean nearest anchor (default, legacy behavior). */
const vectorNearestStrategy: SettlementStrategy = {
  id: 'vector-nearest',
  name: 'Vector Nearest',
  description: 'Match the anchor closest to the player vector by Euclidean distance.',
  execute(ctx: SettlementContext): SettlementOutput {
    const { anchor, distance } = findNearestAnchor(ctx.finalVector, ctx.anchors);
    const mapping = resolveMapping(anchor?.id, ctx.nodeData.resultMapping);
    return { anchor, distance, mapping };
  },
};

/** threshold: first anchor whose threshold rule on a vector axis is satisfied. */
const thresholdStrategy: SettlementStrategy = {
  id: 'threshold',
  name: 'Threshold',
  description: 'Match the first anchor whose threshold rule on a vector axis is satisfied.',
  execute(ctx: SettlementContext): SettlementOutput {
    const config = (
      ctx.nodeData.strategyConfig as
        | { rules?: Array<{ axisId: string; operator: string; value: number; anchorId: string }> }
        | undefined
    )?.rules;
    const rules = config ?? [];

    for (const rule of rules) {
      const val = ctx.finalVector[rule.axisId] ?? 0;
      if (compareNum(val, rule.operator, rule.value)) {
        const anchor = ctx.anchors.find((a) => a.id === rule.anchorId) ?? null;
        const mapping = resolveMapping(rule.anchorId, ctx.nodeData.resultMapping);
        return { anchor, distance: 0, mapping };
      }
    }

    // No rule matched: return null anchor with first mapping.
    const mapping = resolveMapping(undefined, ctx.nodeData.resultMapping);
    return { anchor: null, distance: Infinity, mapping };
  },
};

/** count-tally: anchor with the highest tally of collected fragments/variables. */
const countTallyStrategy: SettlementStrategy = {
  id: 'count-tally',
  name: 'Count Tally',
  description: 'Match the anchor with the highest tally of collected fragments or variable sums.',
  execute(ctx: SettlementContext): SettlementOutput {
    const config = (
      ctx.nodeData.strategyConfig as
        | {
            tallyBy?: 'fragments' | 'variable';
            mappings?: Array<{ fragmentId?: string; variableName?: string; anchorId: string }>;
          }
        | undefined
    );
    const tallyBy = config?.tallyBy ?? 'fragments';
    const mappings = config?.mappings ?? [];

    const tally = new Map<string, number>();
    for (const m of mappings) {
      const current = tally.get(m.anchorId) ?? 0;
      if (tallyBy === 'fragments' && m.fragmentId && ctx.fragments.has(m.fragmentId)) {
        tally.set(m.anchorId, current + 1);
      } else if (tallyBy === 'variable' && m.variableName) {
        tally.set(m.anchorId, current + Number(ctx.variables[m.variableName] ?? 0));
      }
    }

    let bestAnchorId: string | undefined;
    let bestCount = -1;
    for (const [anchorId, count] of tally) {
      if (count > bestCount) {
        bestCount = count;
        bestAnchorId = anchorId;
      }
    }

    const anchor = bestAnchorId
      ? (ctx.anchors.find((a) => a.id === bestAnchorId) ?? null)
      : null;
    const mapping = resolveMapping(bestAnchorId, ctx.nodeData.resultMapping);
    return { anchor, distance: 0, mapping };
  },
};

/** variable-map: anchor matched by game variable value comparison. */
const variableMapStrategy: SettlementStrategy = {
  id: 'variable-map',
  name: 'Variable Map',
  description: 'Match the first anchor whose variable comparison rule is satisfied.',
  execute(ctx: SettlementContext): SettlementOutput {
    const config = (
      ctx.nodeData.strategyConfig as
        | {
            variableName?: string;
            rules?: Array<{ operator: string; value: number; anchorId: string }>;
            fallbackAnchorId?: string;
          }
        | undefined
    );
    const varName = config?.variableName;
    const rules = config?.rules ?? [];

    if (varName) {
      const val = Number(ctx.variables[varName] ?? 0);
      for (const rule of rules) {
        if (compareNum(val, rule.operator, rule.value)) {
          const anchor = ctx.anchors.find((a) => a.id === rule.anchorId) ?? null;
          const mapping = resolveMapping(rule.anchorId, ctx.nodeData.resultMapping);
          return { anchor, distance: 0, mapping };
        }
      }
    }

    // Fallback anchor if configured.
    const fallbackId = config?.fallbackAnchorId;
    const anchor = fallbackId
      ? (ctx.anchors.find((a) => a.id === fallbackId) ?? null)
      : null;
    const mapping = resolveMapping(fallbackId, ctx.nodeData.resultMapping);
    return { anchor, distance: 0, mapping };
  },
};

// --- Registry ---

/** Registry for settlement strategies. */
class SettlementStrategyRegistry {
  private strategies = new Map<string, SettlementStrategy>();

  /** Register a strategy. */
  register(strategy: SettlementStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  /** Get a strategy by id. */
  get(id: string): SettlementStrategy | undefined {
    return this.strategies.get(id);
  }

  /** Resolve a strategy by id, falling back to vector-nearest. */
  resolve(id: string | undefined): SettlementStrategy {
    return this.strategies.get(id ?? 'vector-nearest') ?? vectorNearestStrategy;
  }

  /** List all registered strategies. */
  list(): SettlementStrategy[] {
    return Array.from(this.strategies.values());
  }

  /** Clear all registered strategies (for testing). */
  clear(): void {
    this.strategies.clear();
  }
}

/** Singleton registry instance. */
export const settlementStrategyRegistry = new SettlementStrategyRegistry();

// Register built-in strategies (side-effect import).
settlementStrategyRegistry.register(vectorNearestStrategy);
settlementStrategyRegistry.register(thresholdStrategy);
settlementStrategyRegistry.register(countTallyStrategy);
settlementStrategyRegistry.register(variableMapStrategy);

// Re-export built-in strategy ids as constants for type-safe references.
export const STRATEGY_IDS = {
  VECTOR_NEAREST: 'vector-nearest',
  THRESHOLD: 'threshold',
  COUNT_TALLY: 'count-tally',
  VARIABLE_MAP: 'variable-map',
} as const;
