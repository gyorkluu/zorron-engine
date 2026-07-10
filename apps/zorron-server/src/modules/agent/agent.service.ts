/**
 * Agent service - business logic for the Agent API.
 *
 * Orchestrates FlowBuilder + SimulationValidator to compile ScenarioIntent
 * into validated FlowData, and manages test session persistence.
 */

import { eq, sql, and } from 'drizzle-orm';
import { db } from '../../config/database';
import { projects, testSessions } from '../../db/schema';
import { AppError } from '../../shared/errors';
import { buildFlow } from './flowBuilder';
import { validateFlow, type SimulationResult } from './simulationValidator';
import { findPreset } from './scenarioPresets';
import type {
  ScenarioIntent,
  CompileRequest,
  CompileResponse,
  ValidationIssue,
  SaveSessionRequest,
  SessionDetail,
  ListSessionsQuery,
  SimulationConfig,
} from './agent.schema';

// ── Types ──

interface AuthUser {
  id: string;
  email: string;
}

// ── Compile ──

/** Resolve the effective ScenarioIntent from presetId, intent, and overrides. */
function resolveIntent(req: CompileRequest): ScenarioIntent {
  // Case 1: presetId provided (with optional overrides).
  if (req.presetId) {
    const preset = findPreset(req.presetId);
    if (!preset) {
      throw new AppError('PRESET_001', `Preset not found: ${req.presetId}`, 404);
    }
    const base = preset.intent;
    // Shallow merge: overrides replace top-level fields of the preset intent.
    if (req.overrides && Object.keys(req.overrides).length > 0) {
      return { ...base, ...req.overrides } as ScenarioIntent;
    }
    return base;
  }

  // Case 2: intent provided directly (Phase 2 compatible).
  if (req.intent) {
    return req.intent;
  }

  // refine() in the schema should prevent this, but guard just in case.
  throw new AppError('AGENT_001', 'Either intent or presetId must be provided', 400);
}

/** Compile a ScenarioIntent into validated FlowData. */
export async function compile(
  user: AuthUser,
  req: CompileRequest,
): Promise<CompileResponse> {
  const { projectId, simulation: simConfig } = req;

  // 0. Resolve effective intent (from presetId + overrides, or direct intent).
  const intent = resolveIntent(req);

  // 1. Build FlowData from intent.
  const flowData = buildFlow(intent);

  // 2. Validate with simulation.
  const simResult = validateFlow(flowData as unknown as Parameters<typeof validateFlow>[0], {
    runs: simConfig?.runs ?? 200,
    seed: simConfig?.seed,
    maxSteps: simConfig?.maxStepsPerRun ?? 200,
  });

  // 3. Determine status: success if no error-severity issues.
  const hasErrors = simResult.issues.some((i) => i.severity === 'error');
  const status = hasErrors ? 'issues' : 'success';

  // 4. Save or update project.
  let savedProjectId: string | undefined;
  if (!hasErrors) {
    if (projectId) {
      // Update existing project.
      const [updated] = await db
        .update(projects)
        .set({
          title: intent.title,
          description: intent.description,
          data: flowData,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId))
        .returning({ id: projects.id });
      savedProjectId = updated?.id;
    } else {
      // Create new project.
      const [created] = await db
        .insert(projects)
        .values({
          ownerId: user.id,
          title: intent.title,
          description: intent.description ?? null,
          data: flowData,
        })
        .returning({ id: projects.id });
      savedProjectId = created?.id;
    }
  }

  return {
    projectId: savedProjectId,
    status,
    flowData: flowData as Record<string, unknown>,
    issues: simResult.issues,
    simulation: {
      totalRuns: simResult.totalRuns,
      deadEnds: simResult.deadEnds,
      timedOuts: simResult.timedOuts,
      nodeCoverage: simResult.nodeCoverage,
      settlementDistribution: simResult.settlementDistribution,
    },
  };
}

// ── Iterate ──

/** Iterate on an existing project based on previous validation issues. */
export async function iterate(
  user: AuthUser,
  req: {
    projectId: string;
    intent: ScenarioIntent;
    issues?: ValidationIssue[];
    simulation?: SimulationConfig;
  },
): Promise<CompileResponse> {
  // Verify the project exists and belongs to the user.
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, req.projectId));
  if (!project) {
    throw new AppError('PROJECT_001', 'Project not found', 404);
  }
  if (project.ownerId !== user.id) {
    throw new AppError('AUTH_003', 'Not authorized to modify this project', 403);
  }

  return compile(user, {
    intent: req.intent,
    projectId: req.projectId,
    simulation: req.simulation,
  });
}

// ── Publish ──

/** Publish a project so it's playable. */
export async function publish(
  user: AuthUser,
  projectId: string,
): Promise<{ projectId: string; playUrl: string; isPublished: boolean }> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) {
    throw new AppError('PROJECT_001', 'Project not found', 404);
  }
  if (project.ownerId !== user.id) {
    throw new AppError('AUTH_003', 'Not authorized to publish this project', 403);
  }

  await db
    .update(projects)
    .set({ isPublished: true, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  // The play URL points to the frontend player.
  // In production this would be a configured base URL.
  const playUrl = `/play/${projectId}`;

  return { projectId, playUrl, isPublished: true };
}

// ── Sessions ──

/** Save a test session result. */
export async function saveSession(
  req: SaveSessionRequest,
): Promise<SessionDetail> {
  // Verify the project exists and is published.
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, req.projectId));
  if (!project) {
    throw new AppError('PROJECT_001', 'Project not found', 404);
  }
  if (!project.isPublished) {
    throw new AppError('PROJECT_002', 'Project is not published', 400);
  }

  const [session] = await db
    .insert(testSessions)
    .values({
      projectId: req.projectId,
      userIdentifier: req.userIdentifier,
      settlementResult: req.settlementResult,
      metadata: req.metadata ?? null,
    })
    .returning();

  // SCALE-003: fire-and-forget webhook dispatch for "session.completed" event.
  // Errors are caught to prevent webhook failures from blocking the save.
  dispatchSessionCompleted(session, project).catch(() => {
    // Swallow: delivery failures are logged in the deliveries table.
  });

  return toSessionDetail(session);
}

/**
 * Dispatches a "session.completed" webhook event to matching subscriptions.
 *
 * Imported dynamically to avoid a circular dependency between the agent and
 * subscription modules.
 */
async function dispatchSessionCompleted(
  session: typeof testSessions.$inferSelect,
  project: typeof projects.$inferSelect,
): Promise<void> {
  const { dispatchEvent } = await import('../subscription/subscription.service');
  await dispatchEvent({
    eventType: 'session.completed',
    projectId: session.projectId,
    sessionId: session.id,
    payload: {
      eventType: 'session.completed',
      sessionId: session.id,
      projectId: session.projectId,
      userIdentifier: session.userIdentifier,
      settlementResult: session.settlementResult as Record<string, unknown>,
      timestamp: session.createdAt.toISOString(),
    },
  });
}

/** List test sessions by user identifier or project id. */
export async function listSessions(
  query: ListSessionsQuery,
): Promise<{ data: SessionDetail[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
  const conditions = [];
  if (query.userIdentifier) {
    // Use exact match for user identifier.
    conditions.push(eq(testSessions.userIdentifier, query.userIdentifier));
  }
  if (query.projectId) {
    conditions.push(eq(testSessions.projectId, query.projectId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const offset = (query.page - 1) * query.pageSize;
  const rows = await db
    .select()
    .from(testSessions)
    .where(where)
    .orderBy(testSessions.createdAt)
    .limit(query.pageSize)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(testSessions)
    .where(where);

  const totalPages = Math.ceil(count / query.pageSize);

  return {
    data: rows.map(toSessionDetail),
    meta: { page: query.page, pageSize: query.pageSize, total: count, totalPages },
  };
}

// ── Helpers ──

function toSessionDetail(row: typeof testSessions.$inferSelect): SessionDetail {
  return {
    id: row.id,
    projectId: row.projectId,
    userIdentifier: row.userIdentifier,
    settlementResult: row.settlementResult as Record<string, unknown>,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
