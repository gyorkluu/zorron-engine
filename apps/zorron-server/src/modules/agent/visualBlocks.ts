/**
 * Visual Block Composition System (ECO-002).
 *
 * Defines a registry of composable visual blocks that make up the settlement
 * page. Each block has a type, a human-readable label, a description, and a
 * Zod schema describing its props. The Agent can pick blocks and supply props
 * via `ScenarioIntent.settlement.visualBlocks`.
 *
 * Backward compatibility: a plain string id (e.g. "badge") resolves to the
 * block's default props. A `{ type, props }` object supplies explicit props.
 */

import { z } from 'zod';

// ── Block prop schemas ─────────────────────────────────────

/** Badge block: title + optional icon and accent color. */
export const BadgePropsSchema = z.object({
  title: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

/** Sprite block: character / illustration image. */
export const SpritePropsSchema = z.object({
  imageUrl: z.string(),
  altText: z.string().optional(),
  caption: z.string().optional(),
});

/** Layered-texts block: ordered list of styled copy layers. */
export const LayeredTextsPropsSchema = z.object({
  layers: z
    .array(
      z.object({
        text: z.string(),
        style: z.enum(['title', 'subtitle', 'body', 'caption']).default('body'),
      }),
    )
    .min(1),
});

/** Radar block: multi-axis radar chart of the player vector. */
export const RadarPropsSchema = z.object({
  axes: z.array(z.string()).optional(),
  maxValue: z.number().positive().default(1),
  showPlayerVector: z.boolean().default(true),
});

/** Bar-chart block: discrete bar chart for scores or counts. */
export const BarChartPropsSchema = z.object({
  bars: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        color: z.string().optional(),
      }),
    )
    .default([]),
  maxValue: z.number().positive().optional(),
});

/** Tags-cloud block: weighted tag cloud for survey profiles. */
export const TagsCloudPropsSchema = z.object({
  tags: z
    .array(
      z.object({
        label: z.string(),
        weight: z.number().min(0).max(1).default(0.5),
      }),
    )
    .default([]),
});

/** Game-profile-summary block: key/value fields consumed by matching systems. */
export const GameProfileSummaryPropsSchema = z.object({
  fields: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        value: z.union([z.string(), z.number(), z.boolean()]),
      }),
    )
    .default([]),
  /** External hook used by matching adapters (e.g. "dazi-adapter"). */
  adapterId: z.string().optional(),
});

/** Ending-card block: terminal ending for story-adventure scenarios. */
export const EndingCardPropsSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

/** Score-badge block: single score display for quizzes. */
export const ScoreBadgePropsSchema = z.object({
  score: z.number().optional(),
  maxScore: z.number().positive().optional(),
  label: z.string().optional(),
});

/** Text-only block: plain copy fallback. */
export const TextOnlyPropsSchema = z.object({
  text: z.string(),
});

// ── Block config schema (type + props) ─────────────────────

/**
 * A visual block can be declared as:
 *  - a plain string id ("badge") → resolved with default props, OR
 *  - a `{ type, props }` object → resolved with explicit props.
 */
export const VisualBlockConfigSchema = z.object({
  type: z.string(),
  props: z.record(z.unknown()).optional(),
});

// ── Registry ──────────────────────────────────────────────

export interface VisualBlockInfo {
  type: string;
  label: string;
  description: string;
  /** Default props applied when the block is declared as a plain string id. */
  defaultProps: Record<string, unknown>;
  /** Zod schema describing the block's props (for documentation + validation). */
  propsSchema: z.ZodTypeAny;
  /** Whether this block reads from the player's settlement vector. */
  usesVector: boolean;
}

export const VISUAL_BLOCKS: VisualBlockInfo[] = [
  {
    type: 'badge',
    label: '徽章',
    description: 'A title badge with optional icon and accent color.',
    defaultProps: { title: '完成' },
    propsSchema: BadgePropsSchema,
    usesVector: false,
  },
  {
    type: 'sprite',
    label: '立绘',
    description: 'A character or illustration image.',
    defaultProps: { imageUrl: '' },
    propsSchema: SpritePropsSchema,
    usesVector: false,
  },
  {
    type: 'layered-texts',
    label: '分层文案',
    description: 'Ordered copy layers with style hints (title/subtitle/body/caption).',
    defaultProps: { layers: [{ text: '', style: 'body' }] },
    propsSchema: LayeredTextsPropsSchema,
    usesVector: false,
  },
  {
    type: 'radar',
    label: '雷达图',
    description: 'Multi-axis radar chart visualizing the player vector.',
    defaultProps: { maxValue: 1, showPlayerVector: true },
    propsSchema: RadarPropsSchema,
    usesVector: true,
  },
  {
    type: 'bar-chart',
    label: '柱状图',
    description: 'Discrete bar chart for scores or fragment counts.',
    defaultProps: { bars: [] },
    propsSchema: BarChartPropsSchema,
    usesVector: false,
  },
  {
    type: 'tags-cloud',
    label: '标签云',
    description: 'Weighted tag cloud for survey-style profiles.',
    defaultProps: { tags: [] },
    propsSchema: TagsCloudPropsSchema,
    usesVector: false,
  },
  {
    type: 'game-profile-summary',
    label: '游戏资料摘要',
    description: 'Key/value fields consumed by external matching systems.',
    defaultProps: { fields: [] },
    propsSchema: GameProfileSummaryPropsSchema,
    usesVector: false,
  },
  {
    type: 'ending-card',
    label: '结局卡',
    description: 'Terminal ending card for story-adventure scenarios.',
    defaultProps: { title: '结局' },
    propsSchema: EndingCardPropsSchema,
    usesVector: false,
  },
  {
    type: 'score-badge',
    label: '分数徽章',
    description: 'Single score display for quizzes.',
    defaultProps: { label: '得分' },
    propsSchema: ScoreBadgePropsSchema,
    usesVector: false,
  },
  {
    type: 'text-only',
    label: '纯文本',
    description: 'Plain text fallback block.',
    defaultProps: { text: '' },
    propsSchema: TextOnlyPropsSchema,
    usesVector: false,
  },
  {
    type: 'title',
    label: '标题',
    description: 'A standalone title element. Resolves to a badge with no icon.',
    defaultProps: { title: '' },
    propsSchema: BadgePropsSchema,
    usesVector: false,
  },
];

const BLOCK_BY_TYPE = new Map(VISUAL_BLOCKS.map((b) => [b.type, b]));

/** Find a block definition by its type id. */
export function findVisualBlock(type: string): VisualBlockInfo | undefined {
  return BLOCK_BY_TYPE.get(type);
}

/** Default visual block ids, used when ScenarioIntent omits visualBlocks. */
export const DEFAULT_VISUAL_BLOCKS = ['badge', 'title', 'layered-texts'];

// ── Resolution ─────────────────────────────────────────────

export interface ResolvedVisualBlock {
  type: string;
  props: Record<string, unknown>;
}

/** Resolve the block ids / configs from a ScenarioIntent into concrete blocks. */
export function resolveVisualBlocks(
  raw: unknown,
): ResolvedVisualBlock[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_VISUAL_BLOCKS.map((type) => ({
      type,
      props: { ...findVisualBlock(type)?.defaultProps },
    }));
  }

  return raw.map((entry) => {
    // Plain string id.
    if (typeof entry === 'string') {
      const info = findVisualBlock(entry);
      return {
        type: entry,
        props: info ? { ...info.defaultProps } : {},
      };
    }
    // Typed object { type, props }.
    if (entry && typeof entry === 'object' && 'type' in entry) {
      const obj = entry as { type: string; props?: Record<string, unknown> };
      const info = findVisualBlock(obj.type);
      const base = info ? { ...info.defaultProps } : {};
      return {
        type: obj.type,
        props: { ...base, ...(obj.props ?? {}) },
      };
    }
    // Unknown shape: skip with a text-only fallback.
    return { type: 'text-only', props: { text: '' } };
  });
}

/** JSON-serializable view of the registry, served by GET /api/agent/visual-blocks. */
export function listVisualBlocks() {
  return VISUAL_BLOCKS.map((b) => ({
    type: b.type,
    label: b.label,
    description: b.description,
    usesVector: b.usesVector,
    defaultProps: b.defaultProps,
  }));
}
