/**
 * Quality service - business logic for A/B testing and completion-rate analytics.
 *
 * Orchestrates variant management, event recording, metrics aggregation, and
 * AI authoring suggestions derived from historical data (SCALE-002).
 */

import { AppError } from '../../shared/errors';
import * as repo from './quality.repository';
import type {
  RecordEventRequest,
  EventDetail,
  CreateVariantRequest,
  UpdateVariantRequest,
  VariantDetail,
  MetricsQuery,
  ProjectMetrics,
  VariantComparison,
  AssignVariantResponse,
  Suggestion,
} from './quality.schema';

// ── Types ──

interface AuthUser {
  id: string;
  email: string;
  tenantId?: string | null;
}

// ── Helpers ──

function toVariantDetail(row: Awaited<ReturnType<typeof repo.findVariantById>>): VariantDetail {
  if (!row) throw new Error('Variant row is null');
  return {
    id: row.id,
    projectId: row.projectId,
    variantKey: row.variantKey,
    label: row.label,
    description: row.description,
    weight: row.weight,
    isControl: row.isControl,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toEventDetail(row: Awaited<ReturnType<typeof repo.createEvent>>): EventDetail {
  return {
    id: row.id,
    projectId: row.projectId,
    variantId: row.variantId,
    userIdentifier: row.userIdentifier,
    eventType: row.eventType as 'enter' | 'step' | 'complete' | 'abandon',
    nodeId: row.nodeId,
    eventData: (row.eventData as Record<string, unknown>) ?? {},
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Deterministic hash for variant assignment.
 *
 * Produces a non-negative integer from a string. Used to assign users to
 * variants consistently (same user → same variant) without storing an
 * allocation table.
 */
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const chr = s.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Force 32-bit integer.
  }
  return Math.abs(hash);
}

// ── Event Recording ──

/** Record a player behavior event. */
export async function recordEvent(
  req: RecordEventRequest,
): Promise<EventDetail> {
  // Verify the project exists and is published.
  const project = await repo.findProjectById(req.projectId);
  if (!project) {
    throw new AppError('PROJECT_001', 'Project not found', 404);
  }

  const event = await repo.createEvent({
    projectId: req.projectId,
    variantId: req.variantId ?? null,
    userIdentifier: req.userIdentifier,
    eventType: req.eventType,
    nodeId: req.nodeId ?? null,
    eventData: req.eventData ?? {},
  });

  return toEventDetail(event);
}

// ── Variant Management ──

/** Create a new A/B test variant for a project. */
export async function createVariant(
  user: AuthUser,
  projectId: string,
  req: CreateVariantRequest,
): Promise<VariantDetail> {
  // Verify project ownership.
  const project = await repo.findProjectById(projectId);
  if (!project) {
    throw new AppError('PROJECT_001', 'Project not found', 404);
  }
  if (project.ownerId !== user.id) {
    throw new AppError('AUTH_003', 'Not authorized to modify this project', 403);
  }

  // Check variantKey uniqueness.
  const existing = await repo.findVariantByProjectAndKey(projectId, req.variantKey);
  if (existing) {
    throw new AppError(
      'QUALITY_001',
      `Variant key "${req.variantKey}" already exists for this project`,
      409,
    );
  }

  const variant = await repo.createVariant({
    projectId,
    variantKey: req.variantKey,
    label: req.label ?? null,
    description: req.description ?? null,
    weight: req.weight,
    isControl: req.isControl,
    isActive: true,
    tenantId: project.tenantId,
  });

  return toVariantDetail(variant);
}

/** List all variants for a project. */
export async function listVariants(projectId: string): Promise<{ data: VariantDetail[] }> {
  const variants = await repo.listVariants(projectId);
  return { data: variants.map(toVariantDetail) };
}

/** Update a variant (label, description, weight, active state). */
export async function updateVariant(
  user: AuthUser,
  variantId: string,
  req: UpdateVariantRequest,
): Promise<VariantDetail> {
  const variant = await repo.findVariantById(variantId);
  if (!variant) {
    throw new AppError('QUALITY_002', 'Variant not found', 404);
  }

  // Verify project ownership.
  const project = await repo.findProjectById(variant.projectId);
  if (!project || project.ownerId !== user.id) {
    throw new AppError('AUTH_003', 'Not authorized to modify this variant', 403);
  }

  const updated = await repo.updateVariant(variantId, {
    label: req.label,
    description: req.description,
    weight: req.weight,
    isControl: req.isControl,
    isActive: req.isActive,
  });

  if (!updated) {
    throw new AppError('QUALITY_002', 'Variant not found after update', 404);
  }

  return toVariantDetail(updated);
}

// ── Quality Metrics ──

/** Compute aggregated quality metrics for a project (optionally per variant). */
export async function getMetrics(
  projectId: string,
  query: MetricsQuery,
): Promise<ProjectMetrics> {
  const variantId = query.variantId ?? null;

  const [totalEvents, enterCount, stepCount, completeCount, abandonCount, avgDurationMs, nodeDropoffs] =
    await Promise.all([
      repo.countTotalEvents(projectId, variantId),
      repo.countEvents(projectId, 'enter', variantId),
      repo.countEvents(projectId, 'step', variantId),
      repo.countEvents(projectId, 'complete', variantId),
      repo.countEvents(projectId, 'abandon', variantId),
      repo.getAvgCompleteDuration(projectId, variantId),
      repo.getNodeDropoffs(projectId, variantId),
    ]);

  const completionRate = enterCount > 0 ? completeCount / enterCount : 0;
  const abandonmentRate = enterCount > 0 ? abandonCount / enterCount : 0;

  return {
    projectId,
    variantId,
    totalEvents,
    enterCount,
    stepCount,
    completeCount,
    abandonCount,
    completionRate,
    abandonmentRate,
    avgDurationMs,
    nodeDropoffs: nodeDropoffs.map((n) => ({
      nodeId: n.nodeId,
      count: n.count,
      rate: enterCount > 0 ? n.count / enterCount : 0,
    })),
  };
}

// ── Variant Comparison ──

/** Compare all variants for a project (A/B test analysis). */
export async function compareVariants(
  projectId: string,
): Promise<VariantComparison> {
  const stats = await repo.getVariantStats(projectId);

  const variants = stats.map((s) => {
    const completionRate = s.enterCount > 0 ? s.completeCount / s.enterCount : 0;
    const abandonmentRate = s.enterCount > 0 ? s.abandonCount / s.enterCount : 0;
    return {
      variantId: s.variantId,
      variantKey: s.variantKey,
      label: s.label,
      isControl: s.isControl,
      enterCount: s.enterCount,
      completeCount: s.completeCount,
      completionRate,
      abandonmentRate,
      avgDurationMs: s.avgDurationMs,
    };
  });

  // Determine winner: the variant with the highest completionRate, requiring
  // at least 5 enters to be eligible (avoid noise from tiny samples).
  const eligible = variants.filter((v) => v.enterCount >= 5);
  let winner: string | null = null;
  if (eligible.length >= 2) {
    const sorted = [...eligible].sort((a, b) => b.completionRate - a.completionRate);
    // Only declare a winner if there's a clear lead (>5% absolute difference).
    if (sorted[0].completionRate - sorted[1].completionRate > 0.05) {
      winner = sorted[0].variantId;
    }
  }

  return { projectId, variants, winner };
}

// ── Variant Assignment ──

/**
 * Assign a variant to a user based on weighted distribution.
 *
 * Uses a deterministic hash of (projectId + userIdentifier) so the same user
 * always gets the same variant across requests. Returns null if no active
 * variants exist.
 */
export async function assignVariant(
  projectId: string,
  userIdentifier: string,
): Promise<AssignVariantResponse> {
  const activeVariants = await repo.listActiveVariants(projectId);

  // No variants → return null (the project itself is the default experience).
  if (activeVariants.length === 0) {
    return {
      projectId,
      userIdentifier,
      variantId: null,
      variantKey: null,
      variant: null,
    };
  }

  // Single variant → always assign it.
  if (activeVariants.length === 1) {
    const v = activeVariants[0];
    return {
      projectId,
      userIdentifier,
      variantId: v.id,
      variantKey: v.variantKey,
      variant: toVariantDetail(v),
    };
  }

  // Weighted distribution via deterministic hash.
  const totalWeight = activeVariants.reduce((sum, v) => sum + v.weight, 0);
  const hashValue = hashString(`${projectId}:${userIdentifier}`);
  const target = hashValue % totalWeight;

  let cumulative = 0;
  for (const v of activeVariants) {
    cumulative += v.weight;
    if (target < cumulative) {
      return {
        projectId,
        userIdentifier,
        variantId: v.id,
        variantKey: v.variantKey,
        variant: toVariantDetail(v),
      };
    }
  }

  // Fallback (should not reach here due to modulo).
  const v = activeVariants[activeVariants.length - 1];
  return {
    projectId,
    userIdentifier,
    variantId: v.id,
    variantKey: v.variantKey,
    variant: toVariantDetail(v),
  };
}

// ── Authoring Suggestions ──

/**
 * Generate actionable suggestions for the AI author based on historical data.
 *
 * Heuristics:
 * - enterCount < 30 → insufficient data
 * - completionRate < 50% → suggest reducing steps
 * - node dropoff rate > 30% → suggest simplifying that node
 * - avgDurationMs > 5min → suggest trimming content
 * - A/B winner exists → recommend adopting the winning variant
 */
export async function getSuggestions(projectId: string): Promise<{
  projectId: string;
  suggestions: Suggestion[];
}> {
  const suggestions: Suggestion[] = [];

  const metrics = await getMetrics(projectId, {});
  const comparison = await compareVariants(projectId);

  // 1. Insufficient data guard.
  if (metrics.enterCount < 30) {
    suggestions.push({
      type: 'insufficient-data',
      severity: 'info',
      message: `Only ${metrics.enterCount} enter events recorded. Need at least 30 for reliable analysis.`,
      nodeId: null,
      metric: 'enterCount',
      value: metrics.enterCount,
      recommendation: 'Collect more data before drawing conclusions.',
    });
    // Still return other suggestions but with a caveat.
  }

  // 2. Low completion rate.
  if (metrics.enterCount >= 30 && metrics.completionRate < 0.5) {
    suggestions.push({
      type: 'low-completion-rate',
      severity: metrics.completionRate < 0.3 ? 'critical' : 'warning',
      message: `Completion rate is ${(metrics.completionRate * 100).toFixed(1)}%, below the 50% target.`,
      nodeId: null,
      metric: 'completionRate',
      value: metrics.completionRate,
      recommendation:
        'Consider reducing the number of steps, simplifying complex choices, or adding skip options to improve completion.',
    });
  }

  // 3. High dropoff nodes.
  for (const dropoff of metrics.nodeDropoffs) {
    if (dropoff.rate > 0.3 && metrics.enterCount >= 30) {
      suggestions.push({
        type: 'high-dropoff-node',
        severity: dropoff.rate > 0.5 ? 'critical' : 'warning',
        message: `Node "${dropoff.nodeId}" has a ${(dropoff.rate * 100).toFixed(1)}% dropoff rate (${dropoff.count} abandonments).`,
        nodeId: dropoff.nodeId,
        metric: 'dropoffRate',
        value: dropoff.rate,
        recommendation:
          'This node may be too complex, too long, or confusing. Consider splitting it, simplifying the dialogue, or providing clearer choices.',
      });
    }
  }

  // 4. Long average duration.
  if (metrics.avgDurationMs !== null && metrics.avgDurationMs > 300_000) {
    suggestions.push({
      type: 'long-duration',
      severity: 'info',
      message: `Average completion time is ${(metrics.avgDurationMs / 60_000).toFixed(1)} minutes.`,
      nodeId: null,
      metric: 'avgDurationMs',
      value: metrics.avgDurationMs,
      recommendation:
        'Consider trimming content or splitting the scenario into shorter segments to reduce fatigue.',
    });
  }

  // 5. A/B winner recommendation.
  if (comparison.winner) {
    const winner = comparison.variants.find((v) => v.variantId === comparison.winner);
    const control = comparison.variants.find((v) => v.isControl);
    if (winner && control && winner.variantId !== control.variantId) {
      const lift = winner.completionRate - control.completionRate;
      suggestions.push({
        type: 'variant-outperforms',
        severity: 'info',
        message: `Variant "${winner.variantKey}" outperforms the control "${control.variantKey}" by ${(lift * 100).toFixed(1)} percentage points.`,
        nodeId: null,
        metric: 'completionRateDelta',
        value: lift,
        recommendation: `Consider adopting variant "${winner.variantKey}" as the new default or investigating what makes it more effective.`,
      });
    }
  }

  return { projectId, suggestions };
}
