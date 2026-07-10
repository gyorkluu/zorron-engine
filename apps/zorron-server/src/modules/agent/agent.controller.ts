/**
 * Agent controller - thin orchestration layer between routes and service.
 */

import * as service from './agent.service';
import { SCENARIO_TYPES, NODE_CAPABILITIES, SETTLEMENT_STRATEGIES } from './scenarioTypes';
import { SCENARIO_PRESETS, findPreset } from './scenarioPresets';
import { listVisualBlocks } from './visualBlocks';
import type {
  CompileRequest,
  CompileResponse,
  IterateRequest,
  PublishResponse,
  SaveSessionRequest,
  SessionDetail,
  ListSessionsQuery,
  BenchmarkRequest,
  BenchmarkResponse,
} from './agent.schema';

/** Context shape injected by auth middleware. */
export interface AgentContext {
  user: { id: string; email: string };
}

/** GET /api/agent/scenario-types */
export function getScenarioTypes() {
  return { types: SCENARIO_TYPES };
}

/** GET /api/agent/node-capabilities */
export function getNodeCapabilities() {
  return {
    nodes: NODE_CAPABILITIES,
    settlementStrategies: SETTLEMENT_STRATEGIES,
  };
}

/** GET /api/agent/presets - list all built-in scenario presets. */
export function getPresets() {
  return {
    presets: SCENARIO_PRESETS.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      type: p.type,
    })),
  };
}

/** GET /api/agent/presets/:id - get a preset's full ScenarioIntent template. */
export function getPreset(id: string) {
  const preset = findPreset(id);
  if (!preset) {
    return null;
  }
  return preset;
}

/** GET /api/agent/visual-blocks - list all available visual block types (ECO-002). */
export function getVisualBlocks() {
  return { blocks: listVisualBlocks() };
}

/** POST /api/agent/compile */
export async function compile(
  ctx: AgentContext,
  body: CompileRequest,
): Promise<CompileResponse> {
  return service.compile(ctx.user, body);
}

/** POST /api/agent/compile/iterate */
export async function iterate(
  ctx: AgentContext,
  body: IterateRequest,
): Promise<CompileResponse> {
  return service.iterate(ctx.user, body);
}

/** POST /api/agent/projects/:id/publish */
export async function publish(
  ctx: AgentContext,
  projectId: string,
): Promise<PublishResponse> {
  return service.publish(ctx.user, projectId);
}

/** POST /api/agent/sessions */
export async function saveSession(
  body: SaveSessionRequest,
): Promise<SessionDetail> {
  return service.saveSession(body);
}

/** GET /api/agent/sessions */
export async function listSessions(
  query: ListSessionsQuery,
) {
  return service.listSessions(query);
}

/** POST /api/agent/benchmark - measure simulation throughput (SCALE-004). */
export function benchmark(
  _ctx: AgentContext,
  body: BenchmarkRequest,
): BenchmarkResponse {
  return service.benchmark(body);
}
