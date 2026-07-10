import { Elysia } from 'elysia';
import * as controller from './quality.controller';
import { authPlugin } from '../../middleware/auth';
import {
  RecordEventRequestSchema,
  EventDetailSchema,
  MetricsQuerySchema,
  ProjectMetricsSchema,
  CreateVariantRequestSchema,
  VariantDetailSchema,
  ListVariantsResponseSchema,
  UpdateVariantRequestSchema,
  VariantComparisonSchema,
  AssignVariantRequestSchema,
  AssignVariantResponseSchema,
  SuggestionsResponseSchema,
} from './quality.schema';

/**
 * [Elysia]: quality & A/B testing routes (SCALE-002).
 *
 * Public endpoints (event recording, variant assignment) are declared before
 * the auth plugin. Analytics and management endpoints require authentication.
 */
export const qualityRoute = new Elysia({ prefix: '/api/quality' })
  // ── Public endpoints (player SDK) ──
  .post(
    '/events',
    ({ body, set }) => {
      set.status = 201;
      return controller.recordEvent(body);
    },
    {
      body: RecordEventRequestSchema,
      response: EventDetailSchema,
    },
  )
  .post(
    '/projects/:id/assign',
    ({ params, body }) => controller.assignVariant(params.id, body),
    {
      body: AssignVariantRequestSchema,
      response: AssignVariantResponseSchema,
    },
  )
  // ── Authenticated endpoints (creators) ──
  .use(authPlugin)
  .get(
    '/projects/:id/metrics',
    ({ params, query }) => controller.getMetrics(params.id, query),
    {
      query: MetricsQuerySchema,
      response: ProjectMetricsSchema,
    },
  )
  .get(
    '/projects/:id/variants',
    ({ params }) => controller.listVariants(params.id),
    {
      response: ListVariantsResponseSchema,
    },
  )
  .post(
    '/projects/:id/variants',
    ({ params, body, user }) =>
      controller.createVariant({ user: user! }, params.id, body),
    {
      body: CreateVariantRequestSchema,
      response: VariantDetailSchema,
    },
  )
  .patch(
    '/variants/:id',
    ({ params, body, user }) =>
      controller.updateVariant({ user: user! }, params.id, body),
    {
      body: UpdateVariantRequestSchema,
      response: VariantDetailSchema,
    },
  )
  .get(
    '/projects/:id/variants/compare',
    ({ params }) => controller.compareVariants(params.id),
    {
      response: VariantComparisonSchema,
    },
  )
  .get(
    '/projects/:id/suggestions',
    ({ params }) => controller.getSuggestions(params.id),
    {
      response: SuggestionsResponseSchema,
    },
  );
