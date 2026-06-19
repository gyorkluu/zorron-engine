/**
 * Video node - fullscreen video playback.
 */

import { memo } from 'react';
import { NodeShell, type ZorronNodeProps } from './NodeShell';
import type { VideoNodeData } from '@/types/flow';

function VideoNodeImpl({ data, selected }: ZorronNodeProps) {
  const d = data as VideoNodeData;
  return (
    <NodeShell type="video" label={d.label ?? 'Video'} selected={selected} icon="▶">
      <div className="space-y-1">
        {d.videoUrl ? (
          <p className="truncate text-rose-200/90">{d.videoUrl}</p>
        ) : (
          <p className="italic text-slate-500">No video URL</p>
        )}
        <div className="flex gap-2 text-[10px] text-slate-400">
          <span>{d.autoPlay ? 'autoplay' : 'no-autoplay'}</span>
          <span>{d.skipAllowed ? 'skippable' : 'no-skip'}</span>
        </div>
      </div>
    </NodeShell>
  );
}

export const VideoNode = memo(VideoNodeImpl);
