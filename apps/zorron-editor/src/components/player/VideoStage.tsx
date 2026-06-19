/**
 * VideoStage - fullscreen video playback with optional skip.
 */

import { memo, useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import type { GameState } from '@/engine/GameEngine';

/** Props for VideoStage. */
export interface VideoStageProps {
  state: GameState;
}

function VideoStageImpl({ state }: VideoStageProps) {
  const video = state.video;
  const skipVideo = usePlayerStore((s) => s.skipVideo);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && video?.autoPlay) {
      void ref.current.play().catch(() => {
        // Autoplay may be blocked; user can press play.
      });
    }
  }, [video?.autoPlay]);

  if (!video) return null;

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black">
      <video
        ref={ref}
        src={video.url}
        controls={!video.autoPlay}
        autoPlay={video.autoPlay}
        className="h-full w-full object-contain"
        onEnded={skipVideo}
      />
      {video.skipAllowed && (
        <button
          type="button"
          onClick={skipVideo}
          className="absolute right-4 top-4 rounded-full border border-slate-600 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 backdrop-blur-sm hover:bg-slate-800"
        >
          跳过
        </button>
      )}
    </div>
  );
}

export const VideoStage = memo(VideoStageImpl);
