/**
 * Quality repository - data access for scenario variants and session events.
 *
 * Provides CRUD for A/B test variants and event aggregation queries for
 * completion-rate analytics (SCALE-002).
 */

import { eq, and, sql, desc, isNotNull } from 'drizzle-orm';
import { db } from '../../config/database';
import {
  projects,
  scenarioVariants,
  sessionEvents,
  type Project,
  type ScenarioVariant,
  type NewScenarioVariant,
  type NewSessionEvent,
  type SessionEvent,
} from '../../db/schema';

// ── Projects (ownership checks) ──

/** Find a project by id (for ownership verification). */
export async function findProjectById(id: string): Promise<Project | undefined> {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  return project;
}

// ── Variants ──

/** Insert a new scenario variant. */
export async function createVariant(
  data: NewScenarioVariant,
): Promise<ScenarioVariant> {
  const [variant] = await db.insert(scenarioVariants).values(data).returning();
  return variant;
}

/** Find a variant by id. */
export async function findVariantById(
  id: string,
): Promise<ScenarioVariant | undefined> {
  const [variant] = await db
    .select()
    .from(scenarioVariants)
    .where(eq(scenarioVariants.id, id));
  return variant;
}

/** Find a variant by project + key (uniqueness check). */
export async function findVariantByProjectAndKey(
  projectId: string,
  variantKey: string,
): Promise<ScenarioVariant | undefined> {
  const [variant] = await db
    .select()
    .from(scenarioVariants)
    .where(
      and(
        eq(scenarioVariants.projectId, projectId),
        eq(scenarioVariants.variantKey, variantKey),
      ),
    );
  return variant;
}

/** List all variants for a project. */
export async function listVariants(
  projectId: string,
): Promise<ScenarioVariant[]> {
  return db
    .select()
    .from(scenarioVariants)
    .where(eq(scenarioVariants.projectId, projectId))
    .orderBy(desc(scenarioVariants.isControl), scenarioVariants.createdAt);
}

/** Update a variant. */
export async function updateVariant(
  id: string,
  data: Partial<Omit<NewScenarioVariant, 'id' | 'projectId'>>,
): Promise<ScenarioVariant | undefined> {
  const [variant] = await db
    .update(scenarioVariants)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(scenarioVariants.id, id))
    .returning();
  return variant;
}

/** List active variants for traffic assignment. */
export async function listActiveVariants(
  projectId: string,
): Promise<ScenarioVariant[]> {
  return db
    .select()
    .from(scenarioVariants)
    .where(
      and(
        eq(scenarioVariants.projectId, projectId),
        eq(scenarioVariants.isActive, true),
      ),
    );
}

// ── Events ──

/** Insert a session event. */
export async function createEvent(
  data: NewSessionEvent,
): Promise<SessionEvent> {
  const [event] = await db.insert(sessionEvents).values(data).returning();
  return event;
}

/**
 * Count events of a given type for a project (optionally filtered by variant
 * and time range).
 */
export async function countEvents(
  projectId: string,
  eventType: string,
  variantId?: string | null,
): Promise<number> {
  const conditions = [
    eq(sessionEvents.projectId, projectId),
    eq(sessionEvents.eventType, eventType),
  ];
  if (variantId) {
    conditions.push(eq(sessionEvents.variantId, variantId));
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessionEvents)
    .where(and(...conditions));

  return count;
}

/**
 * Aggregate node-level dropoff counts.
 *
 * Returns rows of { nodeId, count } for `abandon` events grouped by nodeId.
 */
export async function getNodeDropoffs(
  projectId: string,
  variantId?: string | null,
): Promise<{ nodeId: string; count: number }[]> {
  const conditions = [
    eq(sessionEvents.projectId, projectId),
    eq(sessionEvents.eventType, 'abandon'),
    isNotNull(sessionEvents.nodeId),
  ];
  if (variantId) {
    conditions.push(eq(sessionEvents.variantId, variantId));
  }

  const rows = await db
    .select({
      nodeId: sessionEvents.nodeId,
      count: sql<number>`count(*)::int`.as('count'),
    })
    .from(sessionEvents)
    .where(and(...conditions))
    .groupBy(sessionEvents.nodeId)
    .orderBy(desc(sql`count`));

  return rows
    .filter((r): r is { nodeId: string; count: number } => r.nodeId !== null)
    .map((r) => ({ nodeId: r.nodeId, count: r.count }));
}

/**
 * Compute the average completion duration from `eventData.duration` across
 * `complete` events. Returns null if no duration data is available.
 */
export async function getAvgCompleteDuration(
  projectId: string,
  variantId?: string | null,
): Promise<number | null> {
  const conditions = [
    eq(sessionEvents.projectId, projectId),
    eq(sessionEvents.eventType, 'complete'),
  ];
  if (variantId) {
    conditions.push(eq(sessionEvents.variantId, variantId));
  }

  const [row] = await db
    .select({
      avg: sql<number | null>`avg((event_data->>'duration')::numeric)`,
    })
    .from(sessionEvents)
    .where(and(...conditions));

  return row?.avg !== null && row?.avg !== undefined
    ? Number(row.avg)
    : null;
}

/**
 * Get aggregated stats per variant for comparison.
 *
 * Returns one row per variant with enter/complete/abandon counts and avg
 * duration.
 */
export async function getVariantStats(
  projectId: string,
): Promise<
  {
    variantId: string;
    variantKey: string;
    label: string | null;
    isControl: boolean;
    enterCount: number;
    completeCount: number;
    abandonCount: number;
    avgDurationMs: number | null;
  }[]
> {
  // LEFT JOIN variants to events so variants with zero events still appear.
  const rows = await db
    .select({
      variantId: scenarioVariants.id,
      variantKey: scenarioVariants.variantKey,
      label: scenarioVariants.label,
      isControl: scenarioVariants.isControl,
      enterCount: sql<number>`count(*) filter (where ${sessionEvents.eventType} = 'enter')::int`,
      completeCount: sql<number>`count(*) filter (where ${sessionEvents.eventType} = 'complete')::int`,
      abandonCount: sql<number>`count(*) filter (where ${sessionEvents.eventType} = 'abandon')::int`,
      avgDurationMs: sql<number | null>`avg((event_data->>'duration')::numeric) filter (where ${sessionEvents.eventType} = 'complete')`,
    })
    .from(scenarioVariants)
    .leftJoin(
      sessionEvents,
      and(
        eq(sessionEvents.variantId, scenarioVariants.id),
        eq(sessionEvents.projectId, projectId),
      ),
    )
    .where(eq(scenarioVariants.projectId, projectId))
    .groupBy(
      scenarioVariants.id,
      scenarioVariants.variantKey,
      scenarioVariants.label,
      scenarioVariants.isControl,
    );

  return rows.map((r) => ({
    variantId: r.variantId,
    variantKey: r.variantKey,
    label: r.label,
    isControl: r.isControl,
    enterCount: r.enterCount,
    completeCount: r.completeCount,
    abandonCount: r.abandonCount,
    avgDurationMs:
      r.avgDurationMs !== null && r.avgDurationMs !== undefined
        ? Number(r.avgDurationMs)
        : null,
  }));
}

/** Count total events for a project (optionally per variant). */
export async function countTotalEvents(
  projectId: string,
  variantId?: string | null,
): Promise<number> {
  const conditions = [eq(sessionEvents.projectId, projectId)];
  if (variantId) {
    conditions.push(eq(sessionEvents.variantId, variantId));
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessionEvents)
    .where(and(...conditions));

  return count;
}
