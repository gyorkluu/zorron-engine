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
    <NodeShell type="video" label={d.label ?? t('nodeFallback.video')} selected={selected} icon="▶">
      <div className="space-y-1">
        {d.videoUrl ? (
          <p className="truncate text-rose-200/90">{d.videoUrl}</p>
        ) : (
          <p className="italic text-slate-500">{t('nodeFallback.noVideo')}</p>
        )}
        <div className="flex gap-2 text-[10px] text-slate-400">
          <span>{d.autoPlay ? t('nodeFallback.autoplay') : t('nodeFallback.noAutoplay')}</span>
          <span>{d.skipAllowed ? t('nodeFallback.skippable') : t('nodeFallback.noSkip')}</span>
        </div>
      </div>
    </NodeShell>
  );
}

export const VideoNode = memo(VideoNodeImpl);
