/**
 * Marketplace controller (ECO-004) - thin orchestration layer.
 */

import * as service from './marketplace.service';
import type {
  ListMarketplaceQuery,
  ForkRequest,
} from './marketplace.schema';

/** Context shape injected by auth middleware. */
export interface MarketplaceContext {
  user: { id: string; email: string };
}

/** GET /api/marketplace/projects */
export async function listMarketplace(query: ListMarketplaceQuery) {
  return service.listMarketplace(query);
}

/** POST /api/marketplace/projects/:id/fork */
export async function forkScenario(
  ctx: MarketplaceContext,
  sourceId: string,
  body: ForkRequest,
) {
  return service.forkScenario(ctx.user, sourceId, body);
}

/** GET /api/marketplace/projects/:id/forks */
export async function listForks(
  sourceId: string,
  page: number,
  pageSize: number,
) {
  return service.listForks(sourceId, page, pageSize);
}
