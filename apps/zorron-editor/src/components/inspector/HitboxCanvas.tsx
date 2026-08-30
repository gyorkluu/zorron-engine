/**
 * HitboxCanvas — draw click targets directly on the stage artwork.
 *
 * Hotspots used to be four bare numbers, which meant guessing coordinates and
 * reloading the preview to check them. Here the author drags a box on the
 * actual frame and sees the result immediately.
 *
 * Coordinates are percentages (0–100) of the frame so a hitbox survives any
 * viewport size.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Trash2, SquareDashed } from 'lucide-react';
import type { StageHitbox } from '@/types/flow';
import { cn } from '@/lib/utils';

export interface HitboxCanvasProps {
  /** Background artwork — an image URL, or a video's poster frame. */
  backgroundUrl?: string;
  hitboxes: StageHitbox[];
  /** Emitted whenever the set changes (added, moved, resized, removed). */
  onChange: (hitboxes: StageHitbox[]) => void;
  /** Node id assigned to newly drawn boxes. */
  defaultTargetNodeId?: string;
}

interface Draft {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragMode =
  | { kind: 'draw' }
  | { kind: 'move'; id: string; offsetX: number; offsetY: number }
  | { kind: 'resize'; id: string; handle: 'se' | 'ne' | 'sw' | 'nw' }
  | null;

const clamp01 = (v: number) => Math.max(0, Math.min(100, v));

/** Normalise a drag so negative extents become a proper origin + size. */
function normalise(draft: Draft): Draft {
  return {
    x: clamp01(Math.min(draft.x, draft.x + draft.w)),
    y: clamp01(Math.min(draft.y, draft.y + draft.h)),
    w: Math.min(Math.abs(draft.w), 100),
    h: Math.min(Math.abs(draft.h), 100),
  };
}

function HitboxCanvasImpl({
  backgroundUrl,
  hitboxes,
  onChange,
  defaultTargetNodeId = '',
}: HitboxCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragRef = useRef<DragMode>(null);
  const originRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  /** Convert a client point into percentage coordinates of the surface. */
  const toPercent = useCallback((clientX: number, clientY: number) => {
    const el = surfaceRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const startDraw = (e: React.PointerEvent) => {
    // Only left-drag on empty canvas starts a new box.
    if (e.button !== 0) return;
    const { x, y } = toPercent(e.clientX, e.clientY);
    originRef.current = { x, y };
    dragRef.current = { kind: 'draw' };
    setDraft({ x, y, w: 0, h: 0 });
    setSelectedId(null);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const mode = dragRef.current;
    if (!mode) return;
    const { x, y } = toPercent(e.clientX, e.clientY);

    if (mode.kind === 'draw') {
      const { x: ox, y: oy } = originRef.current;
      setDraft({ x: ox, y: oy, w: x - ox, h: y - oy });
      return;
    }

    if (mode.kind === 'move') {
      onChange(
        hitboxes.map((hb) =>
          hb.id === mode.id
            ? {
                ...hb,
                x: clamp01(x - mode.offsetX),
                y: clamp01(y - mode.offsetY),
              }
            : hb,
        ),
      );
      return;
    }

    // Resize from a corner: recompute size while keeping the opposite corner.
    const target = hitboxes.find((hb) => hb.id === mode.id);
    if (!target) return;
    const right = target.x + target.w;
    const bottom = target.y + target.h;
    const next =
      mode.handle === 'se'
        ? { x: target.x, y: target.y, w: x - target.x, h: y - target.y }
        : mode.handle === 'ne'
          ? { x: target.x, y, w: x - target.x, h: bottom - y }
          : mode.handle === 'sw'
            ? { x, y: target.y, w: right - x, h: y - target.y }
            : { x, y, w: right - x, h: bottom - y };
    onChange(hitboxes.map((hb) => (hb.id === mode.id ? { ...hb, ...normalise(next) } : hb)));
  };

  const onPointerUp = () => {
    const mode = dragRef.current;
    dragRef.current = null;

    if (mode?.kind === 'draw' && draft) {
      const box = normalise(draft);
      // Ignore accidental clicks that produced a sliver.
      if (box.w > 1 && box.h > 1) {
        const created: StageHitbox = {
          id: `hb-${Date.now().toString(36)}`,
          x: Number(box.x.toFixed(2)),
          y: Number(box.y.toFixed(2)),
          w: Number(box.w.toFixed(2)),
          h: Number(box.h.toFixed(2)),
          targetNodeId: defaultTargetNodeId,
        };
        onChange([...hitboxes, created]);
        setSelectedId(created.id);
      }
      setDraft(null);
    }
  };

  // Delete removes whatever is selected; Escape just deselects.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.isContentEditable)) return;
        e.preventDefault();
        onChange(hitboxes.filter((hb) => hb.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, hitboxes, onChange]);

  const beginBoxDrag = (
    e: React.PointerEvent,
    mode: Exclude<DragMode, { kind: 'draw' } | null>,
  ) => {
    e.stopPropagation();
    dragRef.current = mode;
    setSelectedId(mode.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const CORNERS: Array<'nw' | 'ne' | 'sw' | 'se'> = ['nw', 'ne', 'sw', 'se'];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 font-medium uppercase tracking-wider text-slate-500">
          <SquareDashed size={10} />
          画面热区
        </span>
        <span className="text-slate-600">
          在画面上拖拽绘制 · 选中后 Delete 删除
        </span>
      </div>

      <div
        ref={surfaceRef}
        onPointerDown={startDraw}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-testid="hitbox-surface"
        className="relative aspect-video w-full cursor-crosshair overflow-hidden rounded-lg border border-slate-700 bg-slate-950"
      >
        {backgroundUrl ? (
          <img
            src={backgroundUrl}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <p className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-600">
            设置素材 URL 后可在此取景
          </p>
        )}

        {hitboxes.map((hb) => {
          const selected = hb.id === selectedId;
          return (
            <div
              key={hb.id}
              onPointerDown={(e) => {
                const { x, y } = toPercent(e.clientX, e.clientY);
                beginBoxDrag(e, { kind: 'move', id: hb.id, offsetX: x - hb.x, offsetY: y - hb.y });
              }}
              className={cn(
                'absolute border-2 transition-colors',
                selected
                  ? 'border-cyan-300 bg-cyan-400/20'
                  : 'border-amber-400/70 bg-amber-400/10 hover:border-amber-300',
              )}
              style={{
                left: `${hb.x}%`,
                top: `${hb.y}%`,
                width: `${hb.w}%`,
                height: `${hb.h}%`,
              }}
              data-testid={`hitbox-${hb.id}`}
            >
              {selected
                ? CORNERS.map((corner) => (
                    <div
                      key={corner}
                      onPointerDown={(e) => beginBoxDrag(e, { kind: 'resize', id: hb.id, handle: corner })}
                      className={cn(
                        'absolute h-2.5 w-2.5 rounded-sm bg-cyan-200 ring-1 ring-cyan-500',
                        corner === 'nw' && '-left-1 -top-1 cursor-nwse-resize',
                        corner === 'ne' && '-right-1 -top-1 cursor-nesw-resize',
                        corner === 'sw' && '-bottom-1 -left-1 cursor-nesw-resize',
                        corner === 'se' && '-bottom-1 -right-1 cursor-nwse-resize',
                      )}
                    />
                  ))
                : null}
            </div>
          );
        })}

        {draft ? (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-cyan-300 bg-cyan-400/10"
            style={{
              left: `${clamp01(Math.min(draft.x, draft.x + draft.w))}%`,
              top: `${clamp01(Math.min(draft.y, draft.y + draft.h))}%`,
              width: `${Math.abs(draft.w)}%`,
              height: `${Math.abs(draft.h)}%`,
            }}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {hitboxes.length === 0 ? (
          <p className="text-[10px] text-slate-600">暂无热区</p>
        ) : (
          hitboxes.map((hb) => (
            <button
              key={hb.id}
              type="button"
              onClick={() => setSelectedId(hb.id)}
              className={cn(
                'flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors',
                hb.id === selectedId
                  ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                  : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:text-slate-200',
              )}
            >
              {hb.x.toFixed(0)},{hb.y.toFixed(0)} · {hb.w.toFixed(0)}×{hb.h.toFixed(0)}
              <Trash2
                size={9}
                className="hover:text-rose-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(hitboxes.filter((x) => x.id !== hb.id));
                  if (selectedId === hb.id) setSelectedId(null);
                }}
              />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export const HitboxCanvas = memo(HitboxCanvasImpl);
