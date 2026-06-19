/**
 * Unit tests for the useSimulation hook.
 *
 * The Web Worker is mocked so we can test the hook's state transitions
 * synchronously without spinning up a real worker.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSimulation } from './useSimulation';
import type { SimulationReport } from '@/engine/simulator';
import type { FlowData } from '@/types/flow';

// Mock the worker constructor so useSimulation doesn't try to spawn a real worker.
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

let mockWorker: MockWorker;

// Mock the worker URL + constructor.
vi.mock('../workers/simulation.worker.ts', () => ({
  default: MockWorker,
}));

// Patch the global Worker constructor.
beforeEach(() => {
  mockWorker = new MockWorker();
  vi.stubGlobal('Worker', vi.fn(() => mockWorker));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const sampleFlow: FlowData = {
  nodes: [],
  edges: [],
  variables: {},
  settings: { vectorSpace: { enabled: false, dimensions: { x: 'x', y: 'y', z: 'z' } } },
  version: '1.0.0',
};

const sampleReport: SimulationReport = {
  totalRuns: 10,
  nodeHits: {},
  nodeHitRates: {},
  settlementHits: { s1: 10 },
  settlementResultHits: { Winner: 10 },
  finalVectors: [],
  meanVector: { x: 0, y: 0, z: 0 },
  stdDevVector: { x: 0, y: 0, z: 0 },
  deadEnds: 0,
  timedOuts: 0,
  runs: [],
};

describe('useSimulation', () => {
  it('starts in an idle state', () => {
    const { result } = renderHook(() => useSimulation());
    expect(result.current.running).toBe(false);
    expect(result.current.report).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets running=true when run() is called', async () => {
    const { result } = renderHook(() => useSimulation());
    act(() => {
      result.current.run(sampleFlow, { runs: 10, strategy: 'random' });
    });
    expect(result.current.running).toBe(true);
    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'run',
      flowData: sampleFlow,
      config: { runs: 10, strategy: 'random' },
    });
  });

  it('stores the report when the worker returns a result', async () => {
    const { result } = renderHook(() => useSimulation());
    let promise: Promise<unknown> | undefined;
    act(() => {
      promise = result.current.run(sampleFlow, { runs: 10, strategy: 'random' });
    });
    // Simulate the worker posting a result.
    act(() => {
      mockWorker.onmessage?.({
        data: { type: 'result', report: sampleReport },
      } as MessageEvent);
    });
    await waitFor(() => {
      expect(result.current.running).toBe(false);
    });
    expect(result.current.report).toEqual(sampleReport);
    expect(result.current.error).toBeNull();
    await expect(promise).resolves.toEqual(sampleReport);
  });

  it('stores the error when the worker returns an error', async () => {
    const { result } = renderHook(() => useSimulation());
    let promise: Promise<unknown> | undefined;
    act(() => {
      promise = result.current.run(sampleFlow, { runs: 10, strategy: 'random' });
      // 立即附加 catch 以避免未处理的 rejection
      promise?.catch(() => {});
    });
    act(() => {
      mockWorker.onmessage?.({
        data: { type: 'error', message: 'boom' },
      } as MessageEvent);
    });
    await waitFor(() => {
      expect(result.current.running).toBe(false);
    });
    expect(result.current.error).toBe('boom');
    expect(result.current.report).toBeNull();
    await expect(promise).rejects.toThrow('boom');
  });

  it('reset() clears the report and error', async () => {
    const { result } = renderHook(() => useSimulation());
    act(() => {
      result.current.run(sampleFlow, { runs: 10, strategy: 'random' });
    });
    act(() => {
      mockWorker.onmessage?.({
        data: { type: 'result', report: sampleReport },
      } as MessageEvent);
    });
    await waitFor(() => {
      expect(result.current.report).not.toBeNull();
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.report).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('invokes onComplete when a run succeeds', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useSimulation({ onComplete }));
    act(() => {
      result.current.run(sampleFlow, { runs: 10, strategy: 'random' });
    });
    act(() => {
      mockWorker.onmessage?.({
        data: { type: 'result', report: sampleReport },
      } as MessageEvent);
    });
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(sampleReport);
    });
  });

  it('invokes onError when a run fails', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useSimulation({ onError }));
    let promise: Promise<unknown> | undefined;
    act(() => {
      promise = result.current.run(sampleFlow, { runs: 10, strategy: 'random' });
      // 立即附加 catch 以避免未处理的 rejection
      promise?.catch(() => {});
    });
    act(() => {
      mockWorker.onmessage?.({
        data: { type: 'error', message: 'fail' },
      } as MessageEvent);
    });
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('fail');
    });
  });
});
