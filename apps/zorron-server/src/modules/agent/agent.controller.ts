/**
 * Agent controller - thin orchestration layer between routes and service.
 */

import * as service from './agent.service';
import { SCENARIO_TYPES, NODE_CAPABILITIES, SETTLEMENT_STRATEGIES } from './scenarioTypes';
import type {
  CompileRequest,
  CompileResponse,
  IterateRequest,
  PublishResponse,
  SaveSessionRequest,
  SessionDetail,
  ListSessionsQuery,
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
