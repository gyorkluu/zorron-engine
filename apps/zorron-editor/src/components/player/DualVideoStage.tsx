import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { StageCarrier, StageHitbox, StageInteraction, StageFX } from '@/types/flow';
import { Timer, AlertTriangle } from 'lucide-react';

export interface DualVideoStageProps {
  carrier?: StageCarrier;
  interaction?: StageInteraction;
  fx?: StageFX;
  preloadNextUrls?: string[];
  onVideoEnd?: () => void;
  onHitboxClick?: (hitbox: StageHitbox) => void;
  onQteTimeout?: () => void;
  stageData?: Partial<StageNodeData>;
}

export function DualVideoStage({
  carrier,
  interaction,
  fx,
  preloadNextUrls = [],
  onVideoEnd,
  onHitboxClick,
  onQteTimeout,
  stageData,
}: DualVideoStageProps) {
  const effectiveCarrier = carrier || stageData?.carrier || { type: 'none' };
  const effectiveInteraction = interaction || stageData?.interaction;
  const effectiveFx = fx || stageData?.fx;

  // Pool A and Pool B video refs
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);

  // Which pool is currently visible and active ('A' | 'B')
  const [activePool, setActivePool] = useState<'A' | 'B'>('A');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [qteLeft, setQteLeft] = useState<number | null>(effectiveInteraction?.qteTimeoutSec ?? null);
  const [isShaking, setIsShaking] = useState(false);

  const isVideo = effectiveCarrier.type === 'video';
  const startSec = effectiveCarrier.type === 'video' ? (effectiveCarrier.timeRange?.[0] ?? 0) : 0;
  const endSec = effectiveCarrier.type === 'video' ? (effectiveCarrier.timeRange?.[1] ?? 0) : 0;

  // Active and Standby element pointers
  const activeVideo = activePool === 'A' ? videoARef.current : videoBRef.current;
  const standbyVideo = activePool === 'A' ? videoBRef.current : videoARef.current;

  // ── 1. Video Playback & Seamless Switch ───────────────────────
  useEffect(() => {
    if (!isVideo || !effectiveCarrier.url) return;

    const currentVid = activePool === 'A' ? videoARef.current : videoBRef.current;
    const nextPool = activePool === 'A' ? 'B' : 'A';
    const nextVid = activePool === 'A' ? videoBRef.current : videoARef.current;

    if (!currentVid || !nextVid) return;

    // Check URL deduplication: if same video URL already loaded, just seek!
    if (currentVid.src === effectiveCarrier.url || currentVid.currentSrc === effectiveCarrier.url) {
      currentVid.currentTime = startSec;
      currentVid.playbackRate = effectiveCarrier.playbackRate ?? 1.0;
      currentVid.loop = effectiveCarrier.loop ?? false;
      void currentVid.play().catch(() => {});
      return;
    }

    // Ping-pong switch to standby video element
    nextVid.src = effectiveCarrier.url;
    nextVid.currentTime = startSec;
    nextVid.playbackRate = effectiveCarrier.playbackRate ?? 1.0;
    nextVid.loop = effectiveCarrier.loop ?? false;

    const onCanPlay = () => {
      void nextVid.play().then(() => {
        // Instant hard-cut toggle: flip active pool to new element
        setActivePool(nextPool);
        if (currentVid) {
          currentVid.pause();
        }
      }).catch(() => {});
    };

    nextVid.addEventListener('canplay', onCanPlay, { once: true });
    nextVid.load();

    return () => {
      nextVid.removeEventListener('canplay', onCanPlay);
    };
  }, [effectiveCarrier.url, effectiveCarrier.type, startSec, effectiveCarrier.playbackRate, effectiveCarrier.loop]);

  // ── 2. TimeUpdate & Slice Loop/End Handling ───────────────────
  const handleTimeUpdate = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const vid = e.currentTarget;
      const t = vid.currentTime;
      setCurrentTime(t);

      // Camera Shake trigger timestamp
      if (effectiveFx?.cameraShake && effectiveFx.cameraShake.triggerAtSec > 0) {
        if (Math.abs(t - effectiveFx.cameraShake.triggerAtSec) < 0.2 && !isShaking) {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), effectiveFx.cameraShake.durationMs || 500);
        }
      }

      // Check time window boundary
      if (endSec > 0 && t >= endSec) {
        if (effectiveCarrier.type === 'video' && effectiveCarrier.loop) {
          vid.currentTime = startSec;
        } else {
          vid.pause();
          onVideoEnd?.();
        }
      }
    },
    [endSec, startSec, effectiveCarrier, effectiveFx, isShaking, onVideoEnd],
  );

  // ── 3. Standby Single-Branch Preheating ────────────────────────
  useEffect(() => {
    // If user is on Data Saver, skip background preheating
    if (typeof navigator !== 'undefined' && (navigator as any).connection?.saveData) {
      return;
    }

    const nextUrl = preloadNextUrls[0];
    if (!nextUrl || !standbyVideo || standbyVideo.src === nextUrl) return;

    // Preheat first candidate branch in standby element
    standbyVideo.preload = 'auto';
    standbyVideo.src = nextUrl;
  }, [preloadNextUrls, standbyVideo]);

  // ── 4. QTE Countdown Timer ────────────────────────────────────
  useEffect(() => {
    if (!effectiveInteraction?.qteTimeoutSec || effectiveInteraction.qteTimeoutSec <= 0) {
      setQteLeft(null);
      return;
    }

    setQteLeft(effectiveInteraction.qteTimeoutSec);
    const interval = setInterval(() => {
      setQteLeft((prev) => {
        if (prev === null || prev <= 0.1) {
          clearInterval(interval);
          onQteTimeout?.();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [effectiveInteraction?.qteTimeoutSec, onQteTimeout]);

  // ── 5. CSS Filter Class Mapper ────────────────────────────────
  const filterClass = (() => {
    switch (effectiveFx?.filter) {
      case 'glitch':
        return 'contrast-125 saturate-150 hue-rotate-15 animate-pulse';
      case 'heartbeat':
        return 'contrast-150 brightness-90 saturate-200';
      case 'bloom':
        return 'brightness-110 contrast-95 saturate-125';
      case 'vignette':
        return 'brightness-90 contrast-110';
      case 'black-white':
        return 'grayscale contrast-125 sepia-25';
      default:
        return '';
    }
  })();

  const shakeStyle: React.CSSProperties = isShaking
    ? {
        animation: `shake ${effectiveFx?.cameraShake?.durationMs ?? 500}ms cubic-bezier(.36,.07,.19,.97) both`,
        transform: `translate3d(0, 0, 0)`,
      }
    : {};

  // Active Hitboxes filtered by current playback timestamp
  const visibleHitboxes = (effectiveInteraction?.hitboxes || []).filter((hb) => {
    if (!hb.timeWindow) return true;
    return currentTime >= hb.timeWindow[0] && currentTime <= hb.timeWindow[1];
  });

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-black select-none ${filterClass}`}
      style={shakeStyle}
    >
      {/* ── Dual Video Ping-Pong Elements ─────────────────────── */}
      {isVideo && (
        <>
          <video
            ref={videoARef}
            playsInline
            muted={false}
            onTimeUpdate={activePool === 'A' ? handleTimeUpdate : undefined}
            onEnded={activePool === 'A' ? onVideoEnd : undefined}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${
              activePool === 'A' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          />
          <video
            ref={videoBRef}
            playsInline
            muted={false}
            onTimeUpdate={activePool === 'B' ? handleTimeUpdate : undefined}
            onEnded={activePool === 'B' ? onVideoEnd : undefined}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${
              activePool === 'B' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          />
        </>
      )}

      {/* ── Static Image Carrier ──────────────────────────────── */}
      {effectiveCarrier.type === 'image' && (
        <img
          src={effectiveCarrier.url}
          alt="Stage background"
          className="absolute inset-0 h-full w-full object-cover z-10 pointer-events-none"
        />
      )}

      {/* ── H5 Embed Sandbox Carrier ──────────────────────────── */}
      {effectiveCarrier.type === 'html-embed' && (
        <iframe
          src={effectiveCarrier.url}
          title="Interactive Mini-Game"
          sandbox="allow-scripts allow-same-origin allow-popups"
          className="absolute inset-0 h-full w-full border-0 z-10"
        />
      )}

      {/* ── QTE Countdown Progress Bar ────────────────────────── */}
      {qteLeft !== null && effectiveInteraction?.qteTimeoutSec && (
        <div className="absolute top-4 left-6 right-6 z-40 flex flex-col items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-rose-400 drop-shadow">
            <Timer size={14} className="animate-spin" />
            <span>QTE 倒计时: {qteLeft.toFixed(1)}s</span>
          </div>
          <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-slate-900/80 p-0.5 border border-rose-500/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-100"
              style={{
                width: `${Math.max(0, Math.min(100, (qteLeft / effectiveInteraction.qteTimeoutSec) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* ── Interactive Hotspots (Hitboxes) ───────────────────── */}
      {visibleHitboxes.map((hb) => {
        const x = hb.rect ? hb.rect[0] : (hb.x ?? 0);
        const y = hb.rect ? hb.rect[1] : (hb.y ?? 0);
        const w = hb.rect ? hb.rect[2] : (hb.width ?? 20);
        const h = hb.rect ? hb.rect[3] : (hb.height ?? 20);
        return (
          <button
            key={hb.id}
            type="button"
            data-testid={`hitbox-${hb.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onHitboxClick?.(hb);
            }}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${w}%`,
              height: `${h}%`,
            }}
            className="absolute z-30 cursor-pointer rounded-xl border-2 border-dashed border-cyan-400 bg-cyan-500/20 backdrop-blur-[2px] hover:border-cyan-300 hover:bg-cyan-500/40 transition-all active:scale-95 group flex flex-col items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)] animate-pulse"
          >
            <div className="opacity-90 group-hover:opacity-100 transition-opacity bg-black/80 px-2.5 py-1 rounded-md text-[11px] font-bold text-cyan-300 shadow-md border border-cyan-500/30 flex items-center gap-1">
              <span>✦</span>
              <span>{hb.label || hb.id}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
