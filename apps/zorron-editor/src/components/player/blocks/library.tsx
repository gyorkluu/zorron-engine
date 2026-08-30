/**
 * Built-in visual blocks for the settlement page.
 *
 * Each block is self-contained and reads what it needs off the settlement
 * result, so authors can freely reorder or omit them.
 */

import { memo } from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import {
  registerVisualBlock,
  resolveAxes,
  rankAnchors,
  clamp,
  type VisualBlockProps,
} from './registry';

/** Result badge — the headline identity of the outcome. */
function BadgeBlockImpl({ result }: VisualBlockProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/10 to-transparent p-6 text-center">
      <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
        <Trophy size={11} />
        你的结果
      </span>
      <h2 className="text-2xl font-bold leading-tight text-slate-50 sm:text-3xl">
        {result.title}
      </h2>
      {result.description ? (
        <p className="max-w-md text-sm leading-relaxed text-slate-300">
          {result.description}
        </p>
      ) : null}
      {result.resultTexts?.layerA ? (
        <p className="max-w-md text-xs italic leading-relaxed text-cyan-200/80">
          {result.resultTexts.layerA}
        </p>
      ) : null}
    </div>
  );
}

/** Character / outcome sprite. */
function SpriteBlockImpl({ result, config }: VisualBlockProps) {
  const url =
    (config?.url as string | undefined) ??
    result.coverUrl ??
    result.anchor?.coverUrl;
  if (!url) return null;

  return (
    <div className="flex justify-center">
      <img
        src={url}
        alt={result.title}
        className="max-h-72 w-auto object-contain drop-shadow-2xl"
      />
    </div>
  );
}

/** Layered personality copy — the long-form interpretation. */
function LayeredTextsBlockImpl({ result }: VisualBlockProps) {
  const layerA = result.resultTexts?.layerA;
  const layerB = result.resultTexts?.layerB;
  if (!layerA && !layerB) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-700/40 bg-slate-900/50 p-5">
      {layerA ? (
        <p className="text-sm font-medium leading-relaxed text-slate-100">
          {layerA}
        </p>
      ) : null}
      {layerB ? (
        <p className="text-xs leading-relaxed text-slate-400">{layerB}</p>
      ) : null}
    </div>
  );
}

/** Radar chart over the project's vector axes. */
function RadarBlockImpl({ result, settings }: VisualBlockProps) {
  const axes = resolveAxes(settings, result);
  const vector = result.finalVector ?? {};
  if (axes.length < 3) return null;

  const size = 220;
  const center = size / 2;
  const radius = center - 34;
  const maxValue = Math.max(
    1,
    ...axes.map((a) => Math.abs(Number(vector[a.id] ?? 0))),
  );

  const pointAt = (index: number, ratio: number) => {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius * ratio,
      y: center + Math.sin(angle) * radius * ratio,
    };
  };

  const polygon = axes
    .map((axis, i) => {
      const ratio = clamp(Number(vector[axis.id] ?? 0) / maxValue, 0, 1);
      const p = pointAt(i, ratio);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  const gridRings = [0.25, 0.5, 0.75, 1];

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-700/40 bg-slate-900/50 p-5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        维度雷达
      </span>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="结果维度雷达图"
      >
        {gridRings.map((ring) => (
          <polygon
            key={ring}
            points={axes
              .map((_, i) => {
                const p = pointAt(i, ring);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              })
              .join(' ')}
            fill="none"
            stroke="rgba(148,163,184,0.18)"
            strokeWidth={1}
          />
        ))}
        {axes.map((axis, i) => {
          const p = pointAt(i, 1);
          const label = pointAt(i, 1.22);
          return (
            <g key={axis.id}>
              <line
                x1={center}
                y1={center}
                x2={p.x}
                y2={p.y}
                stroke="rgba(148,163,184,0.18)"
                strokeWidth={1}
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-400"
                style={{ fontSize: 10 }}
              >
                {axis.label}
              </text>
            </g>
          );
        })}
        <polygon
          points={polygon}
          fill="rgba(34,211,238,0.25)"
          stroke="#22d3ee"
          strokeWidth={2}
        />
      </svg>
    </div>
  );
}

/** Horizontal bars — one per vector axis, with signed values. */
function BarChartBlockImpl({ result, settings }: VisualBlockProps) {
  const axes = resolveAxes(settings, result);
  const vector = result.finalVector ?? {};
  if (axes.length === 0) return null;

  const maxValue = Math.max(
    1,
    ...axes.map((a) => Math.abs(Number(vector[a.id] ?? 0))),
  );

  return (
    <div className="space-y-2.5 rounded-2xl border border-slate-700/40 bg-slate-900/50 p-5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        维度得分
      </span>
      {axes.map((axis) => {
        const value = Number(vector[axis.id] ?? 0);
        const ratio = clamp(Math.abs(value) / maxValue, 0, 1);
        const positive = value >= 0;
        return (
          <div key={axis.id}>
            <div className="mb-1 flex items-baseline justify-between text-[11px]">
              <span className="text-slate-300">{axis.label}</span>
              <span className="font-mono text-slate-400">
                {value.toFixed(2)}
              </span>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="absolute inset-y-0 rounded-full"
                style={{
                  width: `${ratio * 100}%`,
                  left: positive ? '50%' : `${50 - ratio * 50}%`,
                  background: positive ? '#22d3ee' : '#f472b6',
                }}
              />
              <span className="absolute left-1/2 top-0 h-full w-px bg-slate-600" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Tag cloud built from a variable holding comma-separated labels. */
function TagsCloudBlockImpl({ result, config }: VisualBlockProps) {
  const source = (config?.variable as string | undefined) ?? 'tags';
  const raw = result.variables?.[source];
  const tags = String(raw ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (tags.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-5">
      <span className="mb-3 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        你的标签
      </span>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Numeric score badge for quiz-style scenarios. */
function ScoreBadgeBlockImpl({ result, config }: VisualBlockProps) {
  const variable = (config?.variable as string | undefined) ?? 'score';
  const max = Number(config?.max ?? 100);
  const raw = result.variables?.[variable];
  const score = Number(raw ?? 0);

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-6">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
        <Sparkles size={11} />
        得分
      </span>
      <span className="font-mono text-4xl font-bold text-amber-200">
        {score}
        <span className="text-lg text-amber-400/60">/{max}</span>
      </span>
    </div>
  );
}

/** Other endings / anchors the player did not reach. */
function OtherEndingsBlockImpl({ result, settings }: VisualBlockProps) {
  const others = rankAnchors(settings?.vectorSpace?.sects, result);
  if (others.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-5">
      <span className="mb-3 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        其他结局
      </span>
      <ul className="space-y-1.5">
        {others.map((anchor) => (
          <li
            key={anchor.id}
            className="flex items-center gap-2 text-xs text-slate-400"
          >
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-600" />
            <span className="truncate">{anchor.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const BadgeBlock = memo(BadgeBlockImpl);
export const SpriteBlock = memo(SpriteBlockImpl);
export const LayeredTextsBlock = memo(LayeredTextsBlockImpl);
export const RadarBlock = memo(RadarBlockImpl);
export const BarChartBlock = memo(BarChartBlockImpl);
export const TagsCloudBlock = memo(TagsCloudBlockImpl);
export const ScoreBadgeBlock = memo(ScoreBadgeBlockImpl);
export const OtherEndingsBlock = memo(OtherEndingsBlockImpl);

// ── Registration ─────────────────────────────────────────────
registerVisualBlock({
  type: 'badge',
  label: '结果徽章',
  description: '标题、简介与一句话判词',
  Component: BadgeBlock,
});

registerVisualBlock({
  type: 'sprite',
  label: '立绘',
  description: '结果立绘或封面图',
  defaultConfig: {},
  Component: SpriteBlock,
});

registerVisualBlock({
  type: 'layered-texts',
  label: '分层文案',
  description: '双层人格解读文案',
  Component: LayeredTextsBlock,
});

registerVisualBlock({
  type: 'radar',
  label: '雷达图',
  description: '多维向量雷达图（需启用向量空间）',
  Component: RadarBlock,
});

registerVisualBlock({
  type: 'bar-chart',
  label: '维度条形图',
  description: '每个维度的得分条',
  Component: BarChartBlock,
});

registerVisualBlock({
  type: 'tags-cloud',
  label: '标签云',
  description: '从变量读取的标签集合',
  defaultConfig: { variable: 'tags' },
  Component: TagsCloudBlock,
});

registerVisualBlock({
  type: 'score-badge',
  label: '分数徽章',
  description: '知识竞赛类场景的得分',
  defaultConfig: { variable: 'score', max: 100 },
  Component: ScoreBadgeBlock,
});

registerVisualBlock({
  type: 'other-endings',
  label: '其他结局',
  description: '未达成的结局列表',
  Component: OtherEndingsBlock,
});
