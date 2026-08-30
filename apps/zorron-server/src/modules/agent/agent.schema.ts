import { z } from 'zod';
import { VectorSchema, ResultAnchorSchema } from '../project/flow-data.schema';

// ── Scenario Types ──────────────────────────────────────────

export const ScenarioTypeSchema = z.enum([
  'personality-test',
  'game-social-card',
  'quiz',
  'survey',
  'story-adventure',
  'custom',
]);

// ── Scenario Step DSL ────────────────────────────────────────

/**
 * A declarative interaction step. The FlowBuilder translates steps into
 * engine nodes (scene/setter/logic/calculator/video) and wires edges.
 *
 * Steps are sequential by default (step N → step N+1). Branching is expressed
 * via `choices[].nextStep` or `nextStepTrue`/`nextStepFalse` on logic steps.
 */
export const ScenarioStepSchema = z.object({
  /** Stable identifier used for branching references. */
  id: z.string(),
  kind: z.enum(['scene', 'video', 'setter', 'logic', 'calculator', 'minigame', 'rating', 'multi-select', 'media']),

  // ── scene fields ──
  dialogue: z.string().optional(),
  speaker: z.string().optional(),
  backgroundUrl: z.string().optional(),
  characterUrl: z.string().optional(),
  choices: z
    .array(
      z.object({
        text: z.string(),
        interaction: z.enum(['tap', 'hold', 'slash']).default('tap'),
        holdDuration: z.number().optional(),
        slashDirection: z.enum(['left', 'right', 'up', 'down']).optional(),
        vector: VectorSchema.optional(),
        dropFragmentId: z.string().optional(),
        /** Target step id for branching. Omit = next sequential step. */
        nextStep: z.string().optional(),
      }),
    )
    .optional(),

  // ── video fields ──
  videoUrl: z.string().optional(),
  skipAllowed: z.boolean().optional(),

  // ── setter fields ──
  assignments: z
    .array(
      z.object({
        variable: z.string(),
        value: z.union([z.string(), z.number(), z.boolean()]),
        operator: z.enum(['set', 'add', 'sub']).default('set'),
      }),
    )
    .optional(),

  // ── logic fields ──
  checkType: z.enum(['variable', 'count', 'has-specific']).optional(),
  varName: z.string().optional(),
  operator: z.enum(['>=', '<=', '==', '>', '<']).optional(),
  value: z.number().optional(),
  countThreshold: z.number().optional(),
  targetFragmentId: z.string().optional(),
  /** Next step when the condition is true. Omit = next sequential step. */
  nextStepTrue: z.string().optional(),
  /** Next step when the condition is false. Omit = next sequential step. */
  nextStepFalse: z.string().optional(),

  // ── calculator fields ──
  targetVariable: z.string().optional(),

  // ── minigame fields (ECO-003) ──
  gameUrl: z.string().optional(),
  gameType: z.string().optional(),
  scoreVariable: z.string().optional(),
  duration: z.number().positive().optional(),

  // ── rating fields (ECO-003) ──
  question: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
  /** Variable to store rating/multi-select result. */
  variable: z.string().optional(),

  // ── multi-select fields (ECO-003) ──
  options: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
      }),
    )
    .optional(),
  minSelected: z.number().int().min(0).optional(),
  maxSelected: z.number().int().min(1).optional(),
  tagMode: z.boolean().optional(),

  // ── media fields (ECO-003) ──
  mediaType: z.enum(['image', 'audio']).optional(),
  url: z.string().optional(),
  altText: z.string().optional(),
  caption: z.string().optional(),
  autoPlay: z.boolean().optional(),
  loop: z.boolean().optional(),

  /** Default next step (for non-branching kinds). Omit = next sequential step. */
  nextStep: z.string().optional(),
});

// ── Settlement Config ───────────────────────────────────────

export const ScenarioSettlementSchema = z.object({
  /**
   * Settlement strategy id. When omitted, the FlowBuilder resolves a sensible
   * default based on the scenario type (see scenarioTypes.ts), so non-vector
   * scenarios no longer get a vector strategy by accident.
   */
  strategy: z.string().optional(),
  strategyConfig: z.record(z.string(), z.unknown()).optional(),
  resultMapping: z
    .array(
      z.object({
        resultId: z.string(),
        title: z.string(),
        description: z.string().optional(),
        coverUrl: z.string().optional(),
      }),
    )
    .optional(),
  /**
   * Visual blocks composing the settlement page (ECO-002).
   *
   * Each entry can be:
   *  - a plain string id ("badge") → resolved with default props, OR
   *  - a `{ type, props }` object → resolved with explicit props.
   */
  visualBlocks: z
    .array(
      z.union([
        z.string(),
        z.object({
          type: z.string(),
          props: z.record(z.string(), z.unknown()).optional(),
        }),
      ]),
    )
    .default(['badge', 'title', 'layered-texts']),
});

// ── ScenarioIntent (top-level DSL) ───────────────────────────

export const ScenarioIntentSchema = z.object({
  id: z.string().optional(),
  type: ScenarioTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  /** Axis definitions: axisId → human-readable label. */
  dimensions: z.record(z.string(), z.string()).optional(),
  /** Result anchors (for vector-type scenarios). */
  anchors: z.array(ResultAnchorSchema).optional(),
  /** Declarative interaction steps. */
  steps: z.array(ScenarioStepSchema).min(1),
  /** Settlement configuration. */
  settlement: ScenarioSettlementSchema,
  /** Output / persistence configuration. */
  output: z
    .object({
      persistResult: z.boolean().default(true),
      callbackUrl: z.string().url().optional(),
    })
    .optional(),
});

// ── API Request / Response Schemas ─────────────────────────

/** Shared simulation config schema used by CompileRequest and IterateRequest. */
export const SimulationConfigSchema = z.object({
  runs: z.number().int().min(10).max(5000).default(200),
  seed: z.string().optional(),
  maxStepsPerRun: z.number().int().min(10).max(1000).default(200),
});

export const CompileRequestSchema = z
  .object({
    /** ScenarioIntent to compile. Optional if presetId is provided. */
    intent: ScenarioIntentSchema.optional(),
    /** Preset id to use as a base template. Optional if intent is provided. */
    presetId: z.string().optional(),
    /** Partial overrides applied on top of the preset intent (shallow merge). */
    overrides: z.record(z.string(), z.unknown()).optional(),
    /** If provided, iterate on an existing project's flow data. */
    projectId: z.string().uuid().optional(),
    /** Override simulation config for validation. */
    simulation: SimulationConfigSchema.optional(),
  })
  .refine((data) => data.intent || data.presetId, {
    message: 'Either intent or presetId must be provided',
  });

export const ValidationIssueSchema = z.object({
  severity: z.enum(['error', 'warning', 'info']),
  code: z.string(),
  message: z.string(),
  nodeId: z.string().optional(),
  stepId: z.string().optional(),
});

export const CompileResponseSchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['success', 'issues']),
  flowData: z.record(z.unknown()),
  issues: z.array(ValidationIssueSchema),
  simulation: z
    .object({
      totalRuns: z.number(),
      deadEnds: z.number(),
      timedOuts: z.number(),
      nodeCoverage: z.number(),
      settlementDistribution: z.record(z.string(), z.number()),
    })
    .optional(),
});

export const IterateRequestSchema = z.object({
  projectId: z.string().uuid(),
  intent: ScenarioIntentSchema,
  /** Issues from the previous compile to address. */
  issues: z.array(ValidationIssueSchema).optional(),
  simulation: SimulationConfigSchema.optional(),
});

export const PublishRequestSchema = z.object({
  projectId: z.string().uuid(),
});

export const PublishResponseSchema = z.object({
  projectId: z.string().uuid(),
  playUrl: z.string(),
  isPublished: z.boolean(),
});

export const SaveSessionRequestSchema = z.object({
  projectId: z.string().uuid(),
  userIdentifier: z.string().min(1).max(200),
  /** Optional — scenarios without settlement don't have a result. */
  settlementResult: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const SessionDetailSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userIdentifier: z.string(),
  /** Nullable — scenarios without settlement don't have a result. */
  settlementResult: z.record(z.unknown()).nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});

export const ListSessionsQuerySchema = z.object({
  userIdentifier: z.string().optional(),
  projectId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const ListSessionsResponseSchema = z.object({
  data: z.array(SessionDetailSchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// ── Benchmark (SCALE-004) ───────────────────────────────────

export const BenchmarkRequestSchema = z.object({
  /** Pre-built FlowData to benchmark. */
  flowData: z.record(z.unknown()),
  /** Simulation config to use for the benchmark. */
  simulation: SimulationConfigSchema.optional(),
});

export const BenchmarkResponseSchema = z.object({
  runs: z.number(),
  coldMs: z.number(),
  cachedMs: z.number(),
  speedup: z.number(),
  perRunMs: z.number(),
  opsPerSecond: z.number(),
  cacheStats: z.object({
    size: z.number(),
    maxEntries: z.number(),
    hits: z.number(),
    misses: z.number(),
    hitRate: z.number(),
  }),
});

// ── Type Exports ────────────────────────────────────────────

export type ScenarioIntent = z.infer<typeof ScenarioIntentSchema>;
export type ScenarioStep = z.infer<typeof ScenarioStepSchema>;
export type SimulationConfig = z.infer<typeof SimulationConfigSchema>;
export type ScenarioSettlement = z.infer<typeof ScenarioSettlementSchema>;
export type CompileRequest = z.infer<typeof CompileRequestSchema>;
export type CompileResponse = z.infer<typeof CompileResponseSchema>;
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
export type IterateRequest = z.infer<typeof IterateRequestSchema>;
export type PublishResponse = z.infer<typeof PublishResponseSchema>;
export type SaveSessionRequest = z.infer<typeof SaveSessionRequestSchema>;
export type SessionDetail = z.infer<typeof SessionDetailSchema>;
export type ListSessionsQuery = z.infer<typeof ListSessionsQuerySchema>;
export type ListSessionsResponse = z.infer<typeof ListSessionsResponseSchema>;
export type BenchmarkRequest = z.infer<typeof BenchmarkRequestSchema>;
export type BenchmarkResponse = z.infer<typeof BenchmarkResponseSchema>;
