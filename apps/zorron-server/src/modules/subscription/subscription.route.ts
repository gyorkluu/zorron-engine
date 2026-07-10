import { Elysia } from 'elysia';
import * as controller from './subscription.controller';
import { authPlugin } from '../../middleware/auth';
import {
  CreateSubscriptionRequestSchema,
  SubscriptionDetailSchema,
  ListSubscriptionsResponseSchema,
  UpdateSubscriptionRequestSchema,
  SubscriptionListItemSchema,
  ListDeliveriesQuerySchema,
  ListDeliveriesResponseSchema,
  TestEventResponseSchema,
} from './subscription.schema';

/**
 * [Elysia]: webhook subscription routes (SCALE-003).
 *
 * All endpoints require authentication. Subscriptions are owned by the user
 * who creates them; delivery logs are visible only to the owner.
 */
export const subscriptionRoute = new Elysia({ prefix: '/api/subscriptions' })
  .use(authPlugin)
  .get(
    '/',
    ({ user }) => controller.listSubscriptions({ user: user! }),
    {
      response: ListSubscriptionsResponseSchema,
    },
  )
  .post(
    '/',
    ({ body, user, set }) => {
      set.status = 201;
      return controller.createSubscription({ user: user! }, body);
    },
    {
      body: CreateSubscriptionRequestSchema,
      response: SubscriptionDetailSchema,
    },
  )
  .patch(
    '/:id',
    ({ params, body, user }) =>
      controller.updateSubscription({ user: user! }, params.id, body),
    {
      body: UpdateSubscriptionRequestSchema,
      response: SubscriptionListItemSchema,
    },
  )
  .delete(
    '/:id',
    ({ params, user }) =>
      controller.deleteSubscription({ user: user! }, params.id),
  )
  .get(
    '/:id/deliveries',
    ({ params, query, user }) =>
      controller.listDeliveries({ user: user! }, params.id, query),
    {
      query: ListDeliveriesQuerySchema,
      response: ListDeliveriesResponseSchema,
    },
  )
  .post(
    '/:id/test',
    ({ params, user }) =>
      controller.sendTestEvent({ user: user! }, params.id),
    {
      response: TestEventResponseSchema,
    },
  );
