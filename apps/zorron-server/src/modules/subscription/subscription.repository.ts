/**
 * Subscription repository - data access for webhook subscriptions and deliveries.
 *
 * Provides CRUD for subscriptions, delivery log queries, and matching
 * subscriptions for event dispatch (SCALE-003).
 */

import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../../config/database';
import {
  webhookSubscriptions,
  webhookDeliveries,
  type WebhookSubscription,
  type NewWebhookSubscription,
  type NewWebhookDelivery,
  type WebhookDelivery,
} from '../../db/schema';

// ── Subscriptions ──

/** Insert a new webhook subscription. */
export async function createSubscription(
  data: NewWebhookSubscription,
): Promise<WebhookSubscription> {
  const [sub] = await db.insert(webhookSubscriptions).values(data).returning();
  return sub;
}

/** Find a subscription by id. */
export async function findSubscriptionById(
  id: string,
): Promise<WebhookSubscription | undefined> {
  const [sub] = await db
    .select()
    .from(webhookSubscriptions)
    .where(eq(webhookSubscriptions.id, id));
  return sub;
}

/** List subscriptions by owner. */
export async function listSubscriptionsByOwner(
  ownerId: string,
): Promise<WebhookSubscription[]> {
  return db
    .select()
    .from(webhookSubscriptions)
    .where(eq(webhookSubscriptions.ownerId, ownerId))
    .orderBy(desc(webhookSubscriptions.createdAt));
}

/** Update a subscription. */
export async function updateSubscription(
  id: string,
  data: Partial<Omit<NewWebhookSubscription, 'id' | 'ownerId' | 'secret'>>,
): Promise<WebhookSubscription | undefined> {
  const [sub] = await db
    .update(webhookSubscriptions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(webhookSubscriptions.id, id))
    .returning();
  return sub;
}

/** Delete a subscription. */
export async function deleteSubscription(id: string): Promise<void> {
  await db.delete(webhookSubscriptions).where(eq(webhookSubscriptions.id, id));
}

/**
 * Find active subscriptions matching an event.
 *
 * A subscription matches if:
 * - isActive = true
 * - eventTypes (JSON array) contains the eventType
 * - projectId is null OR equals the given projectId
 */
export async function findMatchingSubscriptions(
  eventType: string,
  projectId: string,
): Promise<WebhookSubscription[]> {
  // Filter: active + (projectId is null OR matches) + eventTypes contains eventType.
  const rows = await db
    .select()
    .from(webhookSubscriptions)
    .where(
      and(
        eq(webhookSubscriptions.isActive, true),
        sql`(${webhookSubscriptions.projectId} IS NULL OR ${webhookSubscriptions.projectId} = ${projectId})`,
        sql`(${webhookSubscriptions.eventTypes} ? ${eventType})`,
    ),
    );

  return rows;
}

// ── Deliveries ──

/** Insert a delivery log entry. */
export async function createDelivery(
  data: NewWebhookDelivery,
): Promise<WebhookDelivery> {
  const [delivery] = await db.insert(webhookDeliveries).values(data).returning();
  return delivery;
}

/** Update a delivery's status after an attempt. */
export async function updateDeliveryStatus(
  id: string,
  data: {
    status: string;
    attempts: number;
    responseStatus?: number | null;
    lastError?: string | null;
    deliveredAt?: Date | null;
    nextRetryAt?: Date | null;
  },
): Promise<WebhookDelivery | undefined> {
  const [delivery] = await db
    .update(webhookDeliveries)
    .set(data)
    .where(eq(webhookDeliveries.id, id))
    .returning();
  return delivery;
}

/** List deliveries for a subscription with pagination. */
export async function listDeliveries(opts: {
  subscriptionId: string;
  status?: string;
  page: number;
  pageSize: number;
}): Promise<{ data: WebhookDelivery[]; total: number }> {
  const conditions = [eq(webhookDeliveries.subscriptionId, opts.subscriptionId)];
  if (opts.status) {
    conditions.push(eq(webhookDeliveries.status, opts.status));
  }

  const where = and(...conditions);
  const offset = (opts.page - 1) * opts.pageSize;

  const data = await db
    .select()
    .from(webhookDeliveries)
    .where(where)
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(opts.pageSize)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(webhookDeliveries)
    .where(where);

  return { data, total: count };
}

/** Find deliveries pending retry (for a background worker). */
export async function findDeliveriesPendingRetry(
  before: Date,
  limit = 50,
): Promise<WebhookDelivery[]> {
  return db
    .select()
    .from(webhookDeliveries)
    .where(
      and(
        eq(webhookDeliveries.status, 'retry'),
        sql`${webhookDeliveries.nextRetryAt} IS NOT NULL`,
        sql`${webhookDeliveries.nextRetryAt} <= ${before}`,
    ),
    )
    .limit(limit);
}
