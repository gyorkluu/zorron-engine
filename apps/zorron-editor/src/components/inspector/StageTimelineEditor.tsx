/**
 * StageTimelineEditor — scrub and trim a video carrier visually.
 *
 * The Stage form previously exposed the slice as two number inputs, which made
 * it impossible to place a beat without guessing. This renders the media
 * duration as a track with two draggable handles, plus optional markers for
 * dialogue, choice windows and QTE ranges.
 */

import { memo, useCallback, useRef, useState } from 'react';
import { Scissors } from 'lucide-react';

export interface TimelineMarker {
  /** Position along the track, in seconds. */
  atSec: number;
  label: string;
  /** Visual accent. */
  tone?: 'dialogue' | 'choice' | 'qte';
}

export interface StageTimelineEditorProps {
  /** Total media duration in seconds. Undefined when ffprobe data is missing. */
  durationSec?: number;
  /** Current slice; defaults to the full duration. */
  timeRange?: { startSec: number; endSec: number };
  /** Emitted while a handle is dragged. */
  onChange: (range: { startSec: number; endSec: number }) => void;
  /** Moments worth annotating on the track. */
  markers?: TimelineMarker[];
  /** Fallback duration used when `durationSec` is unknown. */
  fallbackDurationSec?: number;
}

const TONE_STYLES: Record<NonNullable<TimelineMarker['tone']>, string> = {
  dialogue: 'bg-cyan-400',
  choice: 'bg-amber-400',
  qte: 'bg-rose-400',
};

/** Format seconds as m:ss.d for compact readouts. */
function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return m > 0 ? `${m}:${s.toFixed(1).padStart(4, '0')}` : `${s.toFixed(1)}s`;
}

function StageTimelineEditorImpl({
  durationSec,
  timeRange,
  onChange,
  markers = [],
  fallbackDurationSec = 60,
}: StageTimelineEditorProps) {
  const total = durationSec && durationSec > 0 ? durationSec : fallbackDurationSec;
  const start = Math.max(0, Math.min(timeRange?.startSec ?? 0, total));
  const end = Math.max(start, Math.min(timeRange?.endSec ?? total, total));

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const pct = (sec: number) => (total > 0 ? (sec / total) * 100 : 0);

  /** Convert a pointer position into seconds along the track. */
  const secFromEvent = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return Math.max(0, Math.min(1, ratio)) * total;
    },
    [total],
  );

  const handlePointerDown = (which: 'start' | 'end') => (e: React.PointerEvent) => {
    e.stopPropagation();
    setDragging(which);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const at = secFromEvent(e.clientX);
    if (dragging === 'start') {
      onChange({ startSec: Math.min(at, end), endSec: end });
    } else {
      onChange({ startSec: start, endSec: Math.max(at, start) });
    }
  };

  const handlePointerUp = () => setDragging(null);

  // Clicking the track itself moves the nearer handle, which is faster than
  // grabbing it precisely on a small screen.
  const handleTrackClick = (e: React.PointerEvent) => {
    if (dragging) return;
    const at = secFromEvent(e.clientX);
    if (Math.abs(at - start) <= Math.abs(at - end)) {
      onChange({ startSec: Math.min(at, end), endSec: end });
    } else {
      onChange({ startSec: start, endSec: Math.max(at, start) });
    }
  };

  return (
    <div className="space-y-1.5" data-testid="stage-timeline">
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1 font-medium uppercase tracking-wider">
          <Scissors size={10} />
          时间轴
        </span>
        <span className="font-mono">
          {formatSec(start)} → {formatSec(end)}
          <span className="ml-1 text-slate-600">/ {formatSec(total)}</span>
        </span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={handleTrackClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative h-9 cursor-pointer select-none rounded-md bg-slate-800/70"
        data-testid="timeline-track"
      >
        {/* Dimmed regions outside the slice */}
        <div
          className="absolute inset-y-0 left-0 bg-slate-950/60"
          style={{ width: `${pct(start)}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-slate-950/60"
          style={{ width: `${100 - pct(end)}%` }}
        />

        {/* Active slice */}
        <div
          className="absolute inset-y-0 bg-gradient-to-r from-cyan-500/30 to-cyan-400/20"
          style={{ left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%` }}
          data-testid="timeline-slice"
        />

        {/* Markers */}
        {markers.map((marker, i) => (
          <div
            key={`${marker.label}-${i}`}
            title={`${marker.label} @ ${formatSec(marker.atSec)}`}
            className={`absolute top-0 h-2 w-0.5 rounded-full ${
              TONE_STYLES[marker.tone ?? 'dialogue']
            }`}
            style={{ left: `${pct(marker.atSec)}%` }}
          />
        ))}

        {/* Handles */}
        {(['start', 'end'] as const).map((which) => (
          <div
            key={which}
            role="slider"
            aria-label={which === 'start' ? '切片起点' : '切片终点'}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={which === 'start' ? start : end}
            tabIndex={0}
            onPointerDown={handlePointerDown(which)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            data-testid={`timeline-handle-${which}`}
            className="absolute top-0 h-full w-2 -translate-x-1/2 cursor-ew-resize rounded-full bg-cyan-300 shadow-lg ring-1 ring-cyan-100/40"
            style={{ left: `${pct(which === 'start' ? start : end)}%` }}
          />
        ))}
      </div>

      {!durationSec ? (
        <p className="text-[10px] leading-relaxed text-slate-600">
          未检测到媒体时长（上传后由 ffprobe 自动写入），当前按 {fallbackDurationSec}s 估算。
        </p>
      ) : null}
    </div>
  );
}

export const StageTimelineEditor = memo(StageTimelineEditorImpl);
