/**
 * Subscription service - webhook subscription management and event dispatch.
 *
 * Manages webhook subscriptions (CRUD), delivers events via HTTP POST with
 * HMAC-SHA256 signing, and records delivery logs for observability and retry
 * (SCALE-003).
 */

import { createHmac, randomBytes } from 'node:crypto';
import { AppError } from '../../shared/errors';
import * as repo from './subscription.repository';
import type {
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionDetail,
  SubscriptionListItem,
  ListDeliveriesQuery,
  DeliveryDetail,
  TestEventResponse,
  WebhookPayload,
} from './subscription.schema';

// ── Types ──

interface AuthUser {
  id: string;
  email: string;
  tenantId?: string | null;
}

/** Input for dispatching an event to matching subscriptions. */
export interface DispatchEventInput {
  eventType: string;
  projectId: string;
  sessionId: string | null;
  payload: WebhookPayload;
}

// ── Constants ──

const MAX_DELIVERY_ATTEMPTS = 5;
const DELIVERY_TIMEOUT_MS = 10_000;

/** Exponential backoff schedule (ms): 30s, 2m, 10m, 30m, 2h. */
const RETRY_BACKOFF_MS = [30_000, 120_000, 600_000, 1_800_000, 7_200_000];

// ── Helpers ──

function generateSecret(): string {
  return randomBytes(32).toString('hex');
}

function toSubscriptionDetail(row: Awaited<ReturnType<typeof repo.findSubscriptionById>>): SubscriptionDetail {
  if (!row) throw new Error('Subscription row is null');
  return {
    id: row.id,
    callbackUrl: row.callbackUrl,
    eventTypes: (row.eventTypes as string[]) ?? [],
    projectId: row.projectId,
    isActive: row.isActive,
    secret: row.secret,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toListItem(row: Awaited<ReturnType<typeof repo.findSubscriptionById>>): SubscriptionListItem {
  if (!row) throw new Error('Subscription row is null');
  return {
    id: row.id,
    callbackUrl: row.callbackUrl,
    eventTypes: (row.eventTypes as string[]) ?? [],
    projectId: row.projectId,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDeliveryDetail(row: Awaited<ReturnType<typeof repo.createDelivery>>): DeliveryDetail {
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    sessionId: row.sessionId,
    eventType: row.eventType,
    status: row.status,
    attempts: row.attempts,
    responseStatus: row.responseStatus,
    lastError: row.lastError,
    deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
    nextRetryAt: row.nextRetryAt ? row.nextRetryAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Computes the HMAC-SHA256 signature for a webhook payload.
 *
 * @param payload - The raw JSON string sent to the subscriber
 * @param secret - The subscription's signing secret
 * @returns The signature in `sha256=<hex>` format
 */
function computeSignature(payload: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

// ── Subscription CRUD ──

/** Create a new webhook subscription. */
export async function createSubscription(
  user: AuthUser,
  req: CreateSubscriptionRequest,
): Promise<SubscriptionDetail> {
  const secret = generateSecret();
  const sub = await repo.createSubscription({
    ownerId: user.id,
    callbackUrl: req.callbackUrl,
    secret,
    eventTypes: req.eventTypes,
    projectId: req.projectId ?? null,
    isActive: true,
    tenantId: user.tenantId ?? null,
  });
  return toSubscriptionDetail(sub);
}

/** List the caller's subscriptions (without secrets). */
export async function listSubscriptions(
  user: AuthUser,
): Promise<{ data: SubscriptionListItem[] }> {
  const subs = await repo.listSubscriptionsByOwner(user.id);
  return { data: subs.map(toListItem) };
}

/** Update a subscription. */
export async function updateSubscription(
  user: AuthUser,
  subscriptionId: string,
  req: UpdateSubscriptionRequest,
): Promise<SubscriptionListItem> {
  const existing = await repo.findSubscriptionById(subscriptionId);
  if (!existing) {
    throw new AppError('SUB_001', 'Subscription not found', 404);
  }
  if (existing.ownerId !== user.id) {
    throw new AppError('AUTH_003', 'Not authorized to modify this subscription', 403);
  }

  const updated = await repo.updateSubscription(subscriptionId, {
    callbackUrl: req.callbackUrl,
    eventTypes: req.eventTypes,
    isActive: req.isActive,
  });

  if (!updated) {
    throw new AppError('SUB_001', 'Subscription not found after update', 404);
  }
  return toListItem(updated);
}

/** Delete a subscription. */
export async function deleteSubscription(
  user: AuthUser,
  subscriptionId: string,
): Promise<void> {
  const existing = await repo.findSubscriptionById(subscriptionId);
  if (!existing) {
    throw new AppError('SUB_001', 'Subscription not found', 404);
  }
  if (existing.ownerId !== user.id) {
    throw new AppError('AUTH_003', 'Not authorized to delete this subscription', 403);
  }
  await repo.deleteSubscription(subscriptionId);
}

// ── Delivery Logs ──

/** List delivery logs for a subscription. */
export async function listDeliveries(
  user: AuthUser,
  subscriptionId: string,
  query: ListDeliveriesQuery,
): Promise<{ data: DeliveryDetail[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
  // Verify ownership before exposing delivery logs.
  const sub = await repo.findSubscriptionById(subscriptionId);
  if (!sub) {
    throw new AppError('SUB_001', 'Subscription not found', 404);
  }
  if (sub.ownerId !== user.id) {
    throw new AppError('AUTH_003', 'Not authorized to view these deliveries', 403);
  }

  const { data, total } = await repo.listDeliveries({
    subscriptionId,
    status: query.status,
    page: query.page,
    pageSize: query.pageSize,
  });

  const totalPages = Math.ceil(total / query.pageSize);
  return {
    data: data.map(toDeliveryDetail),
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages },
  };
}

// ── Event Dispatch ──

/**
 * Send a single webhook delivery via HTTP POST.
 *
 * Signs the payload with HMAC-SHA256 and records the result. On failure, the
 * delivery is marked for retry with exponential backoff.
 */
async function sendDelivery(
  deliveryId: string,
  callbackUrl: string,
  secret: string,
  payload: WebhookPayload,
  currentAttempts: number,
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = computeSignature(body, secret);

  try {
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zorron-Signature': signature,
        'X-Zorron-Event': payload.eventType,
      },
      body,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });

    if (response.status >= 200 && response.status < 300) {
      // Success.
      await repo.updateDeliveryStatus(deliveryId, {
        status: 'success',
        attempts: currentAttempts + 1,
        responseStatus: response.status,
        lastError: null,
        deliveredAt: new Date(),
        nextRetryAt: null,
      });
    } else {
      // Non-2xx response: schedule retry or mark failed.
      await handleDeliveryFailure(
        deliveryId,
        currentAttempts,
        `HTTP ${response.status}`,
        response.status,
      );
    }
  } catch (err) {
    // Network error or timeout.
    const message = err instanceof Error ? err.message : 'Unknown error';
    await handleDeliveryFailure(deliveryId, currentAttempts, message, null);
  }
}

/** Mark a delivery as failed or schedule a retry with backoff. */
async function handleDeliveryFailure(
  deliveryId: string,
  currentAttempts: number,
  errorMessage: string,
  responseStatus: number | null,
): Promise<void> {
  const nextAttempts = currentAttempts + 1;
  if (nextAttempts >= MAX_DELIVERY_ATTEMPTS) {
    // Exhausted retries → mark as permanently failed.
    await repo.updateDeliveryStatus(deliveryId, {
      status: 'failed',
      attempts: nextAttempts,
      responseStatus,
      lastError: errorMessage,
      nextRetryAt: null,
    });
  } else {
    // Schedule retry with exponential backoff.
    const backoffIndex = Math.min(nextAttempts - 1, RETRY_BACKOFF_MS.length - 1);
    const nextRetryAt = new Date(Date.now() + RETRY_BACKOFF_MS[backoffIndex]);
    await repo.updateDeliveryStatus(deliveryId, {
      status: 'retry',
      attempts: nextAttempts,
      responseStatus,
      lastError: errorMessage,
      nextRetryAt,
    });
  }
}

/**
 * Dispatch an event to all matching subscriptions.
 *
 * This is called after a session is saved. It finds all active subscriptions
 * matching the event type and project, creates a delivery record for each, and
 * sends the webhook. Failures are logged for retry.
 */
export async function dispatchEvent(input: DispatchEventInput): Promise<void> {
  const matchingSubs = await repo.findMatchingSubscriptions(
    input.eventType,
    input.projectId,
  );

  if (matchingSubs.length === 0) {
    return;
  }

  // Create a delivery record for each matching subscription, then send.
  await Promise.allSettled(
    matchingSubs.map(async (sub) => {
      const delivery = await repo.createDelivery({
        subscriptionId: sub.id,
        sessionId: input.sessionId,
        eventType: input.eventType,
        payload: input.payload,
        status: 'pending',
        attempts: 0,
      });

      await sendDelivery(
        delivery.id,
        sub.callbackUrl,
        sub.secret,
        input.payload,
        delivery.attempts,
      );
    }),
  );
}

// ── Test Event ──

/**
 * Send a test event to verify the webhook endpoint is reachable.
 *
 * Does not create a delivery record; returns the result directly.
 */
export async function sendTestEvent(
  user: AuthUser,
  subscriptionId: string,
): Promise<TestEventResponse> {
  const sub = await repo.findSubscriptionById(subscriptionId);
  if (!sub) {
    throw new AppError('SUB_001', 'Subscription not found', 404);
  }
  if (sub.ownerId !== user.id) {
    throw new AppError('AUTH_003', 'Not authorized to test this subscription', 403);
  }

  const payload: WebhookPayload = {
    eventType: 'test.event',
    sessionId: null,
    projectId: sub.projectId ?? '00000000-0000-0000-0000-000000000000',
    userIdentifier: 'test-user',
    settlementResult: { test: true },
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);
  const signature = computeSignature(body, sub.secret);

  try {
    const response = await fetch(sub.callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zorron-Signature': signature,
        'X-Zorron-Event': 'test.event',
      },
      body,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });

    return {
      delivered: response.status >= 200 && response.status < 300,
      responseStatus: response.status,
      error: response.status >= 300 ? `HTTP ${response.status}` : null,
    };
  } catch (err) {
    return {
      delivered: false,
      responseStatus: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
