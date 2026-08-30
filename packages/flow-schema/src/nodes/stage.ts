/**
 * Stage Node Schema (StageNodeDataSchema).
 *
 * 4-Layer Orthogonal Composite Node Model for Modern Interactive Video & GalGames:
 *  1. Carrier: Video / Image (Live2D) / HTML-Embed (Minigame)
 *  2. Interaction: Dialogue / Choices / Hitboxes / QTE
 *  3. FX: BGM / Ambient / Shaders / Camera Shake
 *  4. Flow: Preload Tree / Guards / Variable Mutations
 */

import { z } from 'zod';
import { VectorSchema } from '../types.js';

// ── 1. 舞台载体层 (Carrier) ──────────────────────────────────────
export const StageCarrierSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('video'),
    url: z.string(),
    loop: z.boolean().default(false),
    timeRange: z.tuple([z.number().min(0), z.number().min(0)]).optional(), // [startSec, endSec]
    playbackRate: z.number().default(1.0),
  }),
  z.object({
    type: z.literal('image'),
    url: z.string(),
    live2dConfigUrl: z.string().optional(),
  }),
  z.object({
    type: z.literal('html-embed'),
    url: z.string(),
    sandbox: z.array(z.string()).default(['allow-scripts', 'allow-same-origin']),
  }),
]);
export type StageCarrier = z.infer<typeof StageCarrierSchema>;

// ── 2. 交互与UI层 (Interaction Layer) ────────────────────────────
export const StageChoiceSchema = z.object({
  id: z.string(),
  text: z.string(),
  targetNodeId: z.string(),
  guard: z.string().optional(), // Jexl conditional expression
  dropFragmentId: z.string().optional(),
  vector: VectorSchema.optional(),
  icon: z.string().optional(),
});
export type StageChoice = z.infer<typeof StageChoiceSchema>;

export const StageHitboxSchema = z.object({
  id: z.string(),
  rect: z.tuple([z.number(), z.number(), z.number(), z.number()]), // [x%, y%, w%, h%] (0~100)
  timeWindow: z.tuple([z.number(), z.number()]).optional(),       // Active second window
  action: z.enum(['jump', 'collect', 'trigger-fx']).default('jump'),
  targetNodeId: z.string().optional(),
});
export type StageHitbox = z.infer<typeof StageHitboxSchema>;

export const StageDialogueSchema = z.object({
  speaker: z.string().optional(),
  /** Reference into FlowData.characters. Wins over free-text `speaker`. */
  characterId: z.string().optional(),
  /** Expression variant id from the referenced character. */
  expression: z.string().optional(),
  text: z.string(),
  voiceUrl: z.string().optional(),
  voiceDurationSec: z.number().optional(), // Ingested via ffprobe
  typewriterSpeedMs: z.number().default(30),
});
export type StageDialogue = z.infer<typeof StageDialogueSchema>;

export const StageInteractionSchema = z.object({
  dialogue: StageDialogueSchema.optional(),
  choices: z.array(StageChoiceSchema).default([]),
  hitboxes: z.array(StageHitboxSchema).default([]),
  qteTimeoutSec: z.number().optional(),
  defaultTimeoutTargetNodeId: z.string().optional(),
});
export type StageInteraction = z.infer<typeof StageInteractionSchema>;

// ── 3. 视听与视效层 (FX Layer) ──────────────────────────────────
export const StageFXSchema = z.object({
  bgm: z.object({
    url: z.string(),
    fadeInMs: z.number().default(1000),
    volume: z.number().min(0).max(1).default(1.0),
  }).optional(),
  ambient: z.object({
    url: z.string(),
    volume: z.number().min(0).max(1).default(0.6),
  }).optional(),
  filter: z.enum(['none', 'glitch', 'heartbeat', 'bloom', 'vignette', 'black-white']).default('none'),
  cameraShake: z.object({
    intensity: z.number().min(1).max(10).default(3),
    triggerAtSec: z.number().min(0).default(0),
    durationMs: z.number().default(500),
  }).optional(),
});
export type StageFX = z.infer<typeof StageFXSchema>;

// ── 4. 状态与流转优化 (Flow Layer) ──────────────────────────────
export const StageFlowSchema = z.object({
  preloadNext: z.array(z.string()).default([]),
  guards: z.record(z.string(), z.string()).optional(),
  mutations: z.array(z.object({
    variable: z.string(),
    operator: z.enum(['set', 'add', 'sub']),
    value: z.union([z.string(), z.number(), z.boolean()]),
  })).default([]),
});
export type StageFlow = z.infer<typeof StageFlowSchema>;

// ── Stage Node Data Schema with Cross-field Refinements ───────────
export const StageNodeDataSchema = z.object({
  label: z.string().optional(),
  backgroundUrl: z.string().optional(),
  carrier: StageCarrierSchema,
  interaction: StageInteractionSchema.default({}),
  fx: StageFXSchema.default({}),
  flow: StageFlowSchema.default({}),
}).passthrough().superRefine((data, ctx) => {
  // Check 1: Video timeRange validity
  if (data.carrier.type === 'video' && data.carrier.timeRange) {
    const [start, end] = data.carrier.timeRange;
    if (start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `timeRange start (${start}) must be strictly less than end (${end})`,
        path: ['carrier', 'timeRange'],
      });
    }
    // Check 2: Hitbox timeWindow within timeRange
    for (let i = 0; i < (data.interaction.hitboxes?.length ?? 0); i++) {
      const hb = data.interaction.hitboxes![i];
      if (hb.timeWindow) {
        const [hStart, hEnd] = hb.timeWindow;
        if (hStart < start || hEnd > end) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Hitbox [${hb.id}] timeWindow [${hStart}, ${hEnd}] must fall within carrier timeRange [${start}, ${end}]`,
            path: ['interaction', 'hitboxes', i, 'timeWindow'],
          });
        }
      }
    }
  }

  // Check 3: QTE timeout must have target
  if (data.interaction.qteTimeoutSec && data.interaction.qteTimeoutSec > 0 && !data.interaction.defaultTimeoutTargetNodeId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'When qteTimeoutSec is configured, defaultTimeoutTargetNodeId must be provided',
      path: ['interaction', 'defaultTimeoutTargetNodeId'],
    });
  }
});

export type StageNodeData = z.infer<typeof StageNodeDataSchema>;
