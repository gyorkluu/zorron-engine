/**
 * useSimulation - React hook that runs Monte Carlo simulations in a Web Worker.
 *
 * Manages the worker lifecycle, posts simulation requests and exposes the
 * resulting report (or error) plus a `running` flag. The worker is created
 * lazily on the first `run()` call and terminated on unmount.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SimulationConfig, SimulationReport } from '@/engine/simulator';
import type { FlowData } from '@/types/flow';
import type {
  SimulationRequestMessage,
  SimulationOutboundMessage,
} from '@/workers/simulation.worker';

/** Props for useSimulation. */
export interface UseSimulationOptions {
  /** Called when a simulation completes successfully. */
  onComplete?: (report: SimulationReport) => void;
  /** Called when a simulation fails. */
  onError?: (message: string) => void;
}

/** Hook state shape. */
export interface UseSimulationState {
  /** Whether a simulation is currently running. */
  running: boolean;
  /** The latest report (null if none yet). */
  report: SimulationReport | null;
  /** Error message from the last failed run (null if none). */
  error: string | null;
  /** Start a simulation. Returns a promise that resolves with the report. */
  run: (flowData: FlowData, config: SimulationConfig) => Promise<SimulationReport>;
  /** Clear the current report and error. */
  reset: () => void;
}

/**
 * Lazy-create the Web Worker. Uses Vite's `?worker` import syntax so the
 * worker is bundled as a separate chunk.
 */
function createSimulationWorker(): Worker {
  // Vite handles `new Worker(new URL(...), { type: 'module' })` at build time.
  return new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), {
    type: 'module',
  });
}

/**
 * Hook that exposes a `run` function to start a Monte Carlo simulation.
 */
export function useSimulation(options: UseSimulationOptions = {}): UseSimulationState {
  const { onComplete, onError } = options;
  const workerRef = useRef<Worker | null>(null);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<SimulationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest callbacks in refs so the worker listener doesn't need to
  // be re-registered on every render.
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  /** Resolve/reject pair for the in-flight run promise. */
  const pendingRef = useRef<{
    resolve: (report: SimulationReport) => void;
    reject: (err: Error) => void;
  } | null>(null);

  /** Ensure the worker exists and has a message listener. */
  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const worker = createSimulationWorker();
    worker.onmessage = (event: MessageEvent<SimulationOutboundMessage>) => {
      const msg = event.data;
      setRunning(false);
      if (msg.type === 'result') {
        setReport(msg.report);
        setError(null);
        onCompleteRef.current?.(msg.report);
        pendingRef.current?.resolve(msg.report);
      } else if (msg.type === 'error') {
        setError(msg.message);
        onErrorRef.current?.(msg.message);
        pendingRef.current?.reject(new Error(msg.message));
      }
      pendingRef.current = null;
    };
    worker.onerror = (event) => {
      setRunning(false);
      const message = event.message ?? 'Worker error';
      setError(message);
      onErrorRef.current?.(message);
      pendingRef.current?.reject(new Error(message));
      pendingRef.current = null;
    };
    workerRef.current = worker;
    return worker;
  }, []);

  /** Start a simulation. */
  const run = useCallback(
    (flowData: FlowData, config: SimulationConfig): Promise<SimulationReport> => {
      const worker = ensureWorker();
      return new Promise<SimulationReport>((resolve, reject) => {
        pendingRef.current = { resolve, reject };
        setRunning(true);
        setError(null);
        const message: SimulationRequestMessage = {
          type: 'run',
          flowData,
          config,
        };
        worker.postMessage(message);
      });
    },
    [ensureWorker],
  );

  /** Clear the current report and error. */
  const reset = useCallback(() => {
    setReport(null);
    setError(null);
  }, []);

  // Terminate the worker on unmount.
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return { running, report, error, run, reset };
}
