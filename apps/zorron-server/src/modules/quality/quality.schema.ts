import { z } from 'zod';

/**
 * Quality & A/B testing schemas (SCALE-002).
 *
 * Provides:
 * - Event recording (enter/step/complete/abandon) for completion-rate analytics
 * - Scenario variant (A/B arm) management
 * - Per-project quality metrics aggregation
 * - Variant comparison for A/B test analysis
 * - Weighted variant assignment for traffic splitting
 * - AI authoring suggestions derived from historical data
 */

const UuidSchema = z.string().uuid();
const TimestampSchema = z.string().datetime();

/** Event types recorded by the player SDK. */
export const EventTypeSchema = z.enum(['enter', 'step', 'complete', 'abandon']);

// ── Event Recording ─────────────────────────────────────────

/** Body for POST /api/quality/events (called by the player SDK). */
export const RecordEventRequestSchema = z.object({
  projectId: UuidSchema,
  variantId: UuidSchema.optional(),
  userIdentifier: z.string().min(1).max(200),
  eventType: EventTypeSchema,
  nodeId: z.string().max(100).optional(),
  eventData: z.record(z.unknown()).optional(),
});

/** Response after recording an event. */
export const EventDetailSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  variantId: UuidSchema.nullable(),
  userIdentifier: z.string(),
  eventType: EventTypeSchema,
  nodeId: z.string().nullable(),
  eventData: z.record(z.unknown()),
  createdAt: TimestampSchema,
});

// ── Variant Management ───────────────────────────────────────

/** Body for POST /api/quality/projects/:id/variants. */
export const CreateVariantRequestSchema = z.object({
  variantKey: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Variant key must be alphanumeric with dashes/underscores'),
  label: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  weight: z.number().int().min(0).max(1000).default(1),
  isControl: z.boolean().default(false),
});

/** Body for PATCH /api/quality/variants/:id. */
export const UpdateVariantRequestSchema = z.object({
  label: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  weight: z.number().int().min(0).max(1000).optional(),
  isControl: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

/** Variant detail response. */
export const VariantDetailSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  variantKey: z.string(),
  label: z.string().nullable(),
  description: z.string().nullable(),
  weight: z.number().int(),
  isControl: z.boolean(),
  isActive: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const ListVariantsResponseSchema = z.object({
  data: z.array(VariantDetailSchema),
});

// ── Quality Metrics ──────────────────────────────────────────

/** Query params for GET /api/quality/projects/:id/metrics. */
export const MetricsQuerySchema = z.object({
  variantId: UuidSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

/** Per-node dropoff statistics. */
export const NodeDropoffSchema = z.object({
  nodeId: z.string(),
  count: z.number().int(),
  /** Dropoff rate at this node relative to total enters. */
  rate: z.number(),
});

/** Aggregated quality metrics for a project (optionally per variant). */
export const ProjectMetricsSchema = z.object({
  projectId: UuidSchema,
  variantId: UuidSchema.nullable(),
  totalEvents: z.number().int(),
  enterCount: z.number().int(),
  stepCount: z.number().int(),
  completeCount: z.number().int(),
  abandonCount: z.number().int(),
  /** completionRate = completeCount / enterCount (0 if no enters). */
  completionRate: z.number(),
  /** abandonmentRate = abandonCount / enterCount. */
  abandonmentRate: z.number(),
  /** Average completion duration in ms (from eventData.duration, null if N/A). */
  avgDurationMs: z.number().nullable(),
  nodeDropoffs: z.array(NodeDropoffSchema),
});

// ── Variant Comparison ───────────────────────────────────────

/** Stats for a single variant in a comparison. */
export const VariantStatsSchema = z.object({
  variantId: UuidSchema,
  variantKey: z.string(),
  label: z.string().nullable(),
  isControl: z.boolean(),
  enterCount: z.number().int(),
  completeCount: z.number().int(),
  completionRate: z.number(),
  abandonmentRate: z.number(),
  avgDurationMs: z.number().nullable(),
});

/** A/B comparison response. */
export const VariantComparisonSchema = z.object({
  projectId: UuidSchema,
  variants: z.array(VariantStatsSchema),
  /** The variantId with the highest completionRate (null if tied or insufficient data). */
  winner: UuidSchema.nullable(),
});

// ── Variant Assignment ───────────────────────────────────────

/** Body for POST /api/quality/projects/:id/assign (player-facing). */
export const AssignVariantRequestSchema = z.object({
  userIdentifier: z.string().min(1).max(200),
});

/** Response assigning a variant to a user. */
export const AssignVariantResponseSchema = z.object({
  projectId: UuidSchema,
  userIdentifier: z.string(),
  variantId: UuidSchema.nullable(),
  variantKey: z.string().nullable(),
  /** The full variant object if assigned (null if no active variants). */
  variant: VariantDetailSchema.nullable(),
});

// ── Authoring Suggestions ───────────────────────────────────

/** Severity of a suggestion. */
export const SuggestionSeveritySchema = z.enum(['info', 'warning', 'critical']);

/** Type of suggestion. */
export const SuggestionTypeSchema = z.enum([
  'high-dropoff-node',
  'low-completion-rate',
  'variant-outperforms',
  'long-duration',
  'insufficient-data',
]);

/** A single actionable suggestion for the AI author. */
export const SuggestionSchema = z.object({
  type: SuggestionTypeSchema,
  severity: SuggestionSeveritySchema,
  message: z.string(),
  /** Node id the suggestion relates to (null for project-level). */
  nodeId: z.string().nullable(),
  /** Metric value that triggered the suggestion. */
  metric: z.string(),
  value: z.number().nullable(),
  /** Concrete recommendation text. */
  recommendation: z.string(),
});

export const SuggestionsResponseSchema = z.object({
  projectId: UuidSchema,
  suggestions: z.array(SuggestionSchema),
});

// ── Type Exports ────────────────────────────────────────────

export type EventType = z.infer<typeof EventTypeSchema>;
export type RecordEventRequest = z.infer<typeof RecordEventRequestSchema>;
export type EventDetail = z.infer<typeof EventDetailSchema>;
export type CreateVariantRequest = z.infer<typeof CreateVariantRequestSchema>;
export type UpdateVariantRequest = z.infer<typeof UpdateVariantRequestSchema>;
export type VariantDetail = z.infer<typeof VariantDetailSchema>;
export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;
export type NodeDropoff = z.infer<typeof NodeDropoffSchema>;
export type ProjectMetrics = z.infer<typeof ProjectMetricsSchema>;
export type VariantStats = z.infer<typeof VariantStatsSchema>;
export type VariantComparison = z.infer<typeof VariantComparisonSchema>;
export type AssignVariantRequest = z.infer<typeof AssignVariantRequestSchema>;
export type AssignVariantResponse = z.infer<typeof AssignVariantResponseSchema>;
export type SuggestionSeverity = z.infer<typeof SuggestionSeveritySchema>;
export type SuggestionType = z.infer<typeof SuggestionTypeSchema>;
export type Suggestion = z.infer<typeof SuggestionSchema>;
export type SuggestionsResponse = z.infer<typeof SuggestionsResponseSchema>;
