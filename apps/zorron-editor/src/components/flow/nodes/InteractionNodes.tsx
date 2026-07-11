/**
 * Canvas node components for the four interactive node types:
 * minigame, rating, multi-select, and media.
 *
 * Each renders inside a NodeShell with a compact preview body.
 */

import { memo } from 'react';
import { useT } from '@/i18n/useT';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type {
  MinigameNodeData,
  RatingNodeData,
  MultiSelectNodeData,
  MediaNodeData,
} from '@/types/flow';

function MinigameNodeImpl({ data, selected }: ZorronNodeProps) {
  const { t } = useT();
  const d = data as MinigameNodeData;
  return (
    <NodeShell type="minigame" label={d.label} selected={selected}>
      <div className="space-y-1">
        {d.gameUrl ? (
          <p className="truncate rounded bg-slate-700/20 px-2 py-1 font-mono text-[10px] text-slate-400">{d.gameUrl}</p>
        ) : (
          <p className="italic text-[11px] text-slate-500">{t('nodeFallback.noUrl')}</p>
        )}
        {d.passingScore !== undefined && d.passingScore > 0 && (
          <p className="text-[10px] text-slate-500">≥ {d.passingScore}</p>
        )}
      </div>
    </NodeShell>
  );
}
export const MinigameNode = memo(MinigameNodeImpl);

function RatingNodeImpl({ data, selected }: ZorronNodeProps) {
  const d = data as RatingNodeData;
  return (
    <NodeShell type="rating" label={d.label} selected={selected}>
      <div className="space-y-1">
        <p className="text-[11px] text-slate-300">{d.prompt ?? '—'}</p>
        <p className="text-[10px] text-slate-500">{d.min} – {d.max}</p>
      </div>
    </NodeShell>
  );
}
export const RatingNode = memo(RatingNodeImpl);

function MultiSelectNodeImpl({ data, selected }: ZorronNodeProps) {
  const d = data as MultiSelectNodeData;
  const opts = d.options ?? [];
  return (
    <NodeShell type="multi-select" label={d.label} selected={selected}>
      <div className="space-y-0.5">
        {opts.length === 0 ? (
          <p className="italic text-[11px] text-slate-500">—</p>
        ) : (
          opts.slice(0, 3).map((o) => (
            <p key={o.id} className="truncate text-[11px] text-slate-300">• {o.label}</p>
          ))
        )}
        {opts.length > 3 && <p className="text-[10px] text-slate-500">+{opts.length - 3}</p>}
      </div>
    </NodeShell>
  );
}
export const MultiSelectNode = memo(MultiSelectNodeImpl);

function MediaNodeImpl({ data, selected }: ZorronNodeProps) {
  const { t } = useT();
  const d = data as MediaNodeData;
  return (
    <NodeShell type="media" label={d.label} selected={selected}>
      <div className="space-y-1">
        <p className="text-[11px] text-slate-400">{t(`field.${d.mediaType}`)}</p>
        {d.url ? (
          <p className="truncate rounded bg-slate-700/20 px-2 py-1 font-mono text-[10px] text-slate-400">{d.url}</p>
        ) : (
          <p className="italic text-[11px] text-slate-500">{t('nodeFallback.noUrl')}</p>
        )}
      </div>
    </NodeShell>
  );
}
export const MediaNode = memo(MediaNodeImpl);
