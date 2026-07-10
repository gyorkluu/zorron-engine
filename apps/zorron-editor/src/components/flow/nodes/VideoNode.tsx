/**
 * Video node - fullscreen video playback.
 */

import { memo } from 'react';
import { useT } from '@/i18n/useT';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type { VideoNodeData } from '@/types/flow';

function VideoNodeImpl({ data, selected }: ZorronNodeProps) {
  const { t } = useT();
  const d = data as VideoNodeData;
  return (
    <NodeShell type="video" label={d.label ?? t('nodeFallback.video')} selected={selected}>
      <div className="space-y-1.5">
        {d.videoUrl ? (
          <p className="truncate rounded bg-rose-500/10 px-2 py-1 text-[10px] font-mono text-rose-200/90">{d.videoUrl}</p>
        ) : (
          <p className="italic text-[11px] text-slate-500">{t('nodeFallback.noVideo')}</p>
        )}
        <div className="flex gap-1.5">
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${d.autoPlay ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700/30 text-slate-500'}`}>
            {d.autoPlay ? t('nodeFallback.autoplay') : t('nodeFallback.noAutoplay')}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${d.skipAllowed ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700/30 text-slate-500'}`}>
            {d.skipAllowed ? t('nodeFallback.skippable') : t('nodeFallback.noSkip')}
          </span>
        </div>
      </div>
    </NodeShell>
  );
}

export const VideoNode = memo(VideoNodeImpl);
