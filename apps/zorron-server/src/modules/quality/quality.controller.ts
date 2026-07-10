/**
 * Quality controller - thin orchestration layer between routes and service.
 */

import * as service from './quality.service';
import type {
  RecordEventRequest,
  EventDetail,
  CreateVariantRequest,
  UpdateVariantRequest,
  VariantDetail,
  MetricsQuery,
  ProjectMetrics,
  VariantComparison,
  AssignVariantRequest,
  AssignVariantResponse,
} from './quality.schema';

/** Context shape injected by auth middleware. */
export interface QualityContext {
  user: { id: string; email: string; tenantId?: string | null };
}

/** POST /api/quality/events */
export async function recordEvent(body: RecordEventRequest): Promise<EventDetail> {
  return service.recordEvent(body);
}

/** GET /api/quality/projects/:id/metrics */
export async function getMetrics(
  projectId: string,
  query: MetricsQuery,
): Promise<ProjectMetrics> {
  return service.getMetrics(projectId, query);
}

/** POST /api/quality/projects/:id/variants */
export async function createVariant(
  ctx: QualityContext,
  projectId: string,
  body: CreateVariantRequest,
): Promise<VariantDetail> {
  return service.createVariant(ctx.user, projectId, body);
}

/** GET /api/quality/projects/:id/variants */
export async function listVariants(projectId: string) {
  return service.listVariants(projectId);
}

/** PATCH /api/quality/variants/:id */
export async function updateVariant(
  ctx: QualityContext,
  variantId: string,
  body: UpdateVariantRequest,
): Promise<VariantDetail> {
  return service.updateVariant(ctx.user, variantId, body);
}

/** GET /api/quality/projects/:id/variants/compare */
export async function compareVariants(projectId: string): Promise<VariantComparison> {
  return service.compareVariants(projectId);
}

/** POST /api/quality/projects/:id/assign */
export async function assignVariant(
  projectId: string,
  body: AssignVariantRequest,
): Promise<AssignVariantResponse> {
  return service.assignVariant(projectId, body.userIdentifier);
}

/** GET /api/quality/projects/:id/suggestions */
export async function getSuggestions(projectId: string) {
  return service.getSuggestions(projectId);
}
