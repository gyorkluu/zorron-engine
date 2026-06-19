/**
 * useSlashTrigger - fires a callback when the user swipes in a target
 * direction. Direction mismatch or insufficient distance cancels the trigger.
 */

import { useCallback, useRef } from 'react';
import type { SlashDirection } from '@/types/flow';

/** Props for useSlashTrigger. */
export interface UseSlashTriggerOptions {
  /** Required swipe direction. */
  direction: SlashDirection;
  /** Minimum swipe distance in pixels. */
  threshold?: number;
  /** Called when a valid slash completes. */
  onTrigger: () => void;
}

/** Returns pointer event handlers to attach to the slash target. */
export function useSlashTrigger({
  direction,
  threshold = 50,
  onTrigger,
}: UseSlashTriggerOptions) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      let matched = false;
      if (direction === 'left' && dx <= -threshold && absX > absY) matched = true;
      if (direction === 'right' && dx >= threshold && absX > absY) matched = true;
      if (direction === 'up' && dy <= -threshold && absY > absX) matched = true;
      if (direction === 'down' && dy >= threshold && absY > absX) matched = true;

      if (matched) {
        onTrigger();
      }
    },
    [direction, threshold, onTrigger],
  );

  const onPointerCancel = useCallback(() => {
    startRef.current = null;
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel };
}
