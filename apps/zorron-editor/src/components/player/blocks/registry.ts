/**
 * Visual block system — composable pieces for the settlement page.
 *
 * A settlement node declares an ordered list of block types; each type renders
 * one facet of the result (badge, sprite, radar, bars, tags…). Authors reorder
 * and configure blocks instead of being handed a fixed layout, and new block
 * types register here without touching SettlementStage.
 */

import type { ComponentType } from 'react';
import type { GameState, SettlementResult } from '@/engine/GameEngine';
import type { ProjectSettings, ResultAnchor } from '@/types/flow';

/** Props every visual block receives. */
export interface VisualBlockProps {
  /** The settlement result being rendered. */
  result: SettlementResult;
  /** Block configuration authored on the settlement node. */
  config?: Record<string, unknown>;
  /** Project settings — gives blocks access to vector dimension labels. */
  settings?: ProjectSettings;
  /** Full engine state, for blocks that need live variables. */
  state?: GameState;
}

/** A registered block type. */
export interface VisualBlockDefinition {
  /** Stable type id referenced by settlement nodes (e.g. 'radar'). */
  type: string;
  /** Human-readable label shown in the editor picker. */
  label: string;
  /** Short description for the editor picker. */
  description: string;
  /** Props applied when the block is added in the editor. */
  defaultConfig?: Record<string, unknown>;
  /** Renderer. */
  Component: ComponentType<VisualBlockProps>;
}

const registry = new Map<string, VisualBlockDefinition>();

/** Register a visual block type. Idempotent per `type`. */
export function registerVisualBlock(def: VisualBlockDefinition): void {
  registry.set(def.type, def);
}

/** Look up a block definition by type. */
export function getVisualBlock(type: string): VisualBlockDefinition | undefined {
  return registry.get(type);
}

/** All registered blocks, in registration order. */
export function getAllVisualBlocks(): VisualBlockDefinition[] {
  return Array.from(registry.values());
}

/** Constraint helpers shared by the chart blocks. */
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/** Resolve the axis list a project declares, as ordered `{ id, label }` pairs. */
export function resolveAxes(
  settings: ProjectSettings | undefined,
  result: SettlementResult,
): Array<{ id: string; label: string }> {
  const dimensions = settings?.vectorSpace?.dimensions ?? {};
  const entries = Object.entries(dimensions);
  if (entries.length > 0) {
    return entries.map(([id, label]) => ({ id, label: String(label) }));
  }
  // Fall back to whatever axes the final vector actually carries.
  return Object.keys(result.finalVector ?? {}).map((id) => ({ id, label: id }));
}

/** Nearest anchors by distance, for "other endings" listings. */
export function rankAnchors(
  anchors: ResultAnchor[] | undefined,
  result: SettlementResult,
  limit = 5,
): ResultAnchor[] {
  const list = anchors ?? [];
  if (list.length === 0) return [];
  const current = result.anchor?.id;
  return [...list]
    .filter((a) => a.id !== current)
    .slice(0, limit);
}
