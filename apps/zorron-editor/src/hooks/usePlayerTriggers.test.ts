/**
 * Unit tests for useHoldTrigger and useSlashTrigger.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHoldTrigger } from './useHoldTrigger';
import { useSlashTrigger } from './useSlashTrigger';

describe('useHoldTrigger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires onTrigger after the duration elapses', () => {
    const onTrigger = vi.fn();
    const { result } = renderHook(() =>
      useHoldTrigger({ duration: 1000, onTrigger }),
    );

    act(() => {
      result.current.onPointerDown({ preventDefault: () => {} } as React.PointerEvent);
    });

    expect(onTrigger).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('cancels when the pointer is released early', () => {
    const onTrigger = vi.fn();
    const { result } = renderHook(() =>
      useHoldTrigger({ duration: 1000, onTrigger }),
    );

    act(() => {
      result.current.onPointerDown({ preventDefault: () => {} } as React.PointerEvent);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      result.current.onPointerUp();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onTrigger).not.toHaveBeenCalled();
  });
});

describe('useSlashTrigger', () => {
  it('fires onTrigger when swiping in the target direction', () => {
    const onTrigger = vi.fn();
    const { result } = renderHook(() =>
      useSlashTrigger({ direction: 'right', threshold: 50, onTrigger }),
    );

    act(() => {
      result.current.onPointerDown({ clientX: 0, clientY: 0 } as React.PointerEvent);
    });
    act(() => {
      result.current.onPointerUp({ clientX: 100, clientY: 0 } as React.PointerEvent);
    });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('does not fire when swiping in the wrong direction', () => {
    const onTrigger = vi.fn();
    const { result } = renderHook(() =>
      useSlashTrigger({ direction: 'right', threshold: 50, onTrigger }),
    );

    act(() => {
      result.current.onPointerDown({ clientX: 0, clientY: 0 } as React.PointerEvent);
    });
    act(() => {
      result.current.onPointerUp({ clientX: -100, clientY: 0 } as React.PointerEvent);
    });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('does not fire when the swipe distance is below threshold', () => {
    const onTrigger = vi.fn();
    const { result } = renderHook(() =>
      useSlashTrigger({ direction: 'right', threshold: 50, onTrigger }),
    );

    act(() => {
      result.current.onPointerDown({ clientX: 0, clientY: 0 } as React.PointerEvent);
    });
    act(() => {
      result.current.onPointerUp({ clientX: 30, clientY: 0 } as React.PointerEvent);
    });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('supports vertical directions', () => {
    const onTrigger = vi.fn();
    const { result } = renderHook(() =>
      useSlashTrigger({ direction: 'up', threshold: 50, onTrigger }),
    );

    act(() => {
      result.current.onPointerDown({ clientX: 0, clientY: 100 } as React.PointerEvent);
    });
    act(() => {
      result.current.onPointerUp({ clientX: 0, clientY: 0 } as React.PointerEvent);
    });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });
});
