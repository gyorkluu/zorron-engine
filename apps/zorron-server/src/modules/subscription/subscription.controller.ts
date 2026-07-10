/**
 * Subscription controller - thin orchestration layer between routes and service.
 */

import * as service from './subscription.service';
import type {
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionDetail,
  SubscriptionListItem,
  ListDeliveriesQuery,
  DeliveryDetail,
  TestEventResponse,
} from './subscription.schema';

/** Context shape injected by auth middleware. */
export interface SubscriptionContext {
  user: { id: string; email: string; tenantId?: string | null };
}

/** POST /api/subscriptions */
export async function createSubscription(
  ctx: SubscriptionContext,
  body: CreateSubscriptionRequest,
): Promise<SubscriptionDetail> {
  return service.createSubscription(ctx.user, body);
}

/** GET /api/subscriptions */
export async function listSubscriptions(
  ctx: SubscriptionContext,
) {
  return service.listSubscriptions(ctx.user);
}

/** PATCH /api/subscriptions/:id */
export async function updateSubscription(
  ctx: SubscriptionContext,
  id: string,
  body: UpdateSubscriptionRequest,
): Promise<SubscriptionListItem> {
  return service.updateSubscription(ctx.user, id, body);
}

/** DELETE /api/subscriptions/:id */
export async function deleteSubscription(
  ctx: SubscriptionContext,
  id: string,
): Promise<{ deleted: boolean }> {
  await service.deleteSubscription(ctx.user, id);
  return { deleted: true };
}

/** GET /api/subscriptions/:id/deliveries */
export async function listDeliveries(
  ctx: SubscriptionContext,
  id: string,
  query: ListDeliveriesQuery,
) {
  return service.listDeliveries(ctx.user, id, query);
}

/** POST /api/subscriptions/:id/test */
export async function sendTestEvent(
  ctx: SubscriptionContext,
  id: string,
): Promise<TestEventResponse> {
  return service.sendTestEvent(ctx.user, id);
}
