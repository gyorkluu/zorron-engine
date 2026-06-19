/**
 * useHoldTrigger - fires a callback after the user holds an element for a
 * given duration. Releases before the duration cancel the trigger.
 */

import { useCallback, useRef } from 'react';

/** Props for useHoldTrigger. */
export interface UseHoldTriggerOptions {
  /** Hold duration in milliseconds. */
  duration: number;
  /** Called when the hold completes. */
  onTrigger: () => void;
  /** Called on progress updates (0..1) for visual feedback. */
  onProgress?: (progress: number) => void;
}

/** Returns pointer event handlers to attach to the hold target. */
export function useHoldTrigger({
  duration,
  onTrigger,
  onProgress,
}: UseHoldTriggerOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    onProgress?.(0);
  }, [onProgress]);

  const tick = useCallback(() => {
    if (!startTimeRef.current) return;
    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min(1, elapsed / duration);
    onProgress?.(progress);
    if (progress < 1) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [duration, onProgress]);

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    onProgress?.(0);
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = setTimeout(() => {
      onTrigger();
      onProgress?.(1);
      timerRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }, duration);
  }, [duration, onTrigger, onProgress, tick]);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      start();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    cancel: clear,
  };
}
