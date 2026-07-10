import { Elysia } from 'elysia';
import { z } from 'zod';
import * as controller from './marketplace.controller';
import { authPlugin } from '../../middleware/auth';
import {
  ListMarketplaceQuerySchema,
  ListMarketplaceResponseSchema,
  ForkRequestSchema,
  ForkResponseSchema,
  ListForksResponseSchema,
} from './marketplace.schema';

/** Pagination query for the forks listing. */
const ForksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * [Elysia]: marketplace routes (ECO-004).
 *
 * Browsing the marketplace (GET /projects) is public.
 * Forking a scenario requires authentication.
 */
export const marketplaceRoute = new Elysia({ prefix: '/api/marketplace' })
  // ── Public: browse published scenarios ──
  .get(
    '/projects',
    ({ query }) => controller.listMarketplace(query),
    {
      query: ListMarketplaceQuerySchema,
      response: ListMarketplaceResponseSchema,
    },
  )
  // ── Authenticated: fork a scenario ──
  .use(authPlugin)
  .post(
    '/projects/:id/fork',
    ({ params, body, user }) =>
      controller.forkScenario({ user: user! }, params.id, body),
    {
      body: ForkRequestSchema,
      response: ForkResponseSchema,
    },
  )
  .get(
    '/projects/:id/forks',
    ({ params, query }) =>
      controller.listForks(params.id, query.page, query.pageSize),
    {
      query: ForksQuerySchema,
      response: ListForksResponseSchema,
    },
  );
