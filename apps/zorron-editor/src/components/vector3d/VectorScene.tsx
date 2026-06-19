/**
 * VectorScene - canvas-based 3D rendering of the personality vector space.
 *
 * Renders axes (X/Y/Z), sect anchor points and the user's current vector
 * position using a lightweight isometric-style projection on a 2D canvas.
 * The camera can be rotated by dragging horizontally, and zoomed with the
 * wheel. This avoids pulling in a heavy WebGL stack while still giving a
 * readable 3D visualization.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { PersonalityVector, SectAnchor } from '@/types/flow';
import {
  renderVectorSpace,
  DEFAULT_CAMERA,
  type Camera,
} from './projection';

/** Props for the VectorScene. */
export interface VectorSceneProps {
  /** Axis labels (dimension names). */
  axisLabels: { x: string; y: string; z: string };
  /** Sect anchors to render. */
  sects: SectAnchor[];
  /** The user's current vector position. */
  userVector: PersonalityVector;
  /** Optional highlighted sect id (e.g. the matched settlement sect). */
  highlightedSectId?: string | null;
  /** Pixel width of the canvas. Defaults to 100%. */
  width?: number;
  /** Pixel height of the canvas. Defaults to 320. */
  height?: number;
}

/** Default canvas height when none is provided. */
const DEFAULT_HEIGHT = 320;

function VectorSceneImpl({
  axisLabels,
  sects,
  userVector,
  highlightedSectId = null,
  width,
  height = DEFAULT_HEIGHT,
}: VectorSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<Camera>({ ...DEFAULT_CAMERA });
  const dragRef = useRef<{ startX: number; startY: number; startYaw: number; startPitch: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: width ?? 0, h: height });

  // Track container size for responsive rendering.
  useEffect(() => {
    if (width) {
      setSize({ w: width, h: height });
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setSize({ w: Math.max(200, rect.width), h: height });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [width, height]);

  /** Render the scene whenever inputs or size change. */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = size.w;
    const h = size.h;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    renderVectorSpace({
      ctx,
      width: w,
      height: h,
      camera: cameraRef.current,
      axisLabels,
      sects,
      userVector,
      highlightedSectId,
    });
  }, [size, axisLabels, sects, userVector, highlightedSectId]);

  useEffect(() => {
    draw();
  }, [draw]);

  /** Mouse drag to rotate the camera. */
  const onMouseDown = useCallback((event: React.MouseEvent) => {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startYaw: cameraRef.current.yaw,
      startPitch: cameraRef.current.pitch,
    };
  }, []);

  const onMouseMove = useCallback((event: React.MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    cameraRef.current = {
      ...cameraRef.current,
      yaw: drag.startYaw + dx * 0.01,
      pitch: Math.max(0.2, Math.min(Math.PI / 2 - 0.05, drag.startPitch - dy * 0.01)),
    };
    draw();
  }, [draw]);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  /** Wheel to zoom. */
  const onWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 0.9;
    const next = Math.max(0.3, Math.min(3, cameraRef.current.zoom * factor));
    cameraRef.current = { ...cameraRef.current, zoom: next };
    draw();
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: `${size.h}px` }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        className="cursor-grab rounded-lg border border-slate-800 active:cursor-grabbing"
        data-testid="vector-scene-canvas"
      />
      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-slate-950/70 px-2 py-1 text-[10px] text-slate-400 backdrop-blur-sm">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}

export const VectorScene = memo(VectorSceneImpl);
