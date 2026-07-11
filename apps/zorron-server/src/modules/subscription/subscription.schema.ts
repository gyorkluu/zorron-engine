import { z } from 'zod';

/**
 * Webhook subscription schemas (SCALE-003).
 *
 * External systems register webhook endpoints to receive events when players
 * complete tests. Events are delivered via HTTP POST with HMAC-SHA256 signing.
 */

const UuidSchema = z.string().uuid();
const TimestampSchema = z.string().datetime();

/** Supported event types for webhook subscriptions. */
export const EventTypeSchema = z.enum([
  'session.completed',
  'session.abandoned',
]);

/** Body for POST /api/subscriptions. */
export const CreateSubscriptionRequestSchema = z.object({
  callbackUrl: z.string().url(),
  /** Event types to subscribe to. Defaults to ['session.completed']. */
  eventTypes: z.array(EventTypeSchema).min(1).default(['session.completed']),
  /** Scope to a specific project (null = all accessible projects). */
  projectId: UuidSchema.optional(),
});

/** Body for PATCH /api/subscriptions/:id. */
export const UpdateSubscriptionRequestSchema = z.object({
  callbackUrl: z.string().url().optional(),
  eventTypes: z.array(EventTypeSchema).min(1).optional(),
  isActive: z.boolean().optional(),
});

/** Subscription detail response (exposes the secret only on creation). */
export const SubscriptionDetailSchema = z.object({
  id: UuidSchema,
  callbackUrl: z.string(),
  eventTypes: z.array(z.string()),
  projectId: UuidSchema.nullable(),
  isActive: z.boolean(),
  /** The signing secret is returned so the subscriber can verify payloads. */
  secret: z.string(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

/** Subscription list response (omits the secret for security). */
export const SubscriptionListItemSchema = z.object({
  id: UuidSchema,
  callbackUrl: z.string(),
  eventTypes: z.array(z.string()),
  projectId: UuidSchema.nullable(),
  isActive: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const ListSubscriptionsResponseSchema = z.object({
  data: z.array(SubscriptionListItemSchema),
});

/** Query params for listing deliveries. */
export const ListDeliveriesQuerySchema = z.object({
  status: z.enum(['pending', 'success', 'failed', 'retry']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** Delivery log detail. */
export const DeliveryDetailSchema = z.object({
  id: UuidSchema,
  subscriptionId: UuidSchema,
  sessionId: UuidSchema.nullable(),
  eventType: z.string(),
  status: z.string(),
  attempts: z.number().int(),
  responseStatus: z.number().int().nullable(),
  lastError: z.string().nullable(),
  deliveredAt: TimestampSchema.nullable(),
  nextRetryAt: TimestampSchema.nullable(),
  createdAt: TimestampSchema,
});

export const ListDeliveriesResponseSchema = z.object({
  data: z.array(DeliveryDetailSchema),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

/** Response after a test event ping. */
export const TestEventResponseSchema = z.object({
  delivered: z.boolean(),
  responseStatus: z.number().int().nullable(),
  error: z.string().nullable(),
});

// ── Internal: webhook payload shape ──

/** The payload POSTed to subscriber callback URLs. */
export const WebhookPayloadSchema = z.object({
  eventType: z.string(),
  sessionId: UuidSchema.nullable(),
  projectId: UuidSchema,
  userIdentifier: z.string(),
  settlementResult: z.record(z.unknown()).nullable(),
  timestamp: TimestampSchema,
});

// ── Type Exports ────────────────────────────────────────────

export type WebhookEventType = z.infer<typeof EventTypeSchema>;
export type CreateSubscriptionRequest = z.infer<typeof CreateSubscriptionRequestSchema>;
export type UpdateSubscriptionRequest = z.infer<typeof UpdateSubscriptionRequestSchema>;
export type SubscriptionDetail = z.infer<typeof SubscriptionDetailSchema>;
export type SubscriptionListItem = z.infer<typeof SubscriptionListItemSchema>;
export type ListDeliveriesQuery = z.infer<typeof ListDeliveriesQuerySchema>;
export type DeliveryDetail = z.infer<typeof DeliveryDetailSchema>;
export type TestEventResponse = z.infer<typeof TestEventResponseSchema>;
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
