/**
 * Web Worker that runs Monte Carlo simulations off the main thread.
 *
 * Receives a simulation request (flow data + config) and posts back the
 * aggregated report. Uses Vite's worker import syntax so the worker is
 * bundled automatically.
 *
 * @see https://vite.dev/guide/features.html#web-workers
 */

import { runMonteCarlo, type SimulationConfig, type SimulationReport } from '@/engine/simulator';
import type { FlowData } from '@/types/flow';

/** Request message shape. */
export interface SimulationRequestMessage {
  type: 'run';
  flowData: FlowData;
  config: SimulationConfig;
}

/** Response message shape. */
export interface SimulationResponseMessage {
  type: 'result';
  report: SimulationReport;
}

/** Response error message shape. */
export interface SimulationErrorMessage {
  type: 'error';
  message: string;
}

/** Union of all outbound message types. */
export type SimulationOutboundMessage =
  | SimulationResponseMessage
  | SimulationErrorMessage;

/** Handler invoked when a message is received. */
self.onmessage = (event: MessageEvent<SimulationRequestMessage>) => {
  const { data } = event;
  if (!data || data.type !== 'run') return;
  try {
    const report = runMonteCarlo(data.flowData, data.config);
    const response: SimulationOutboundMessage = { type: 'result', report };
    (self as unknown as Worker).postMessage(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Simulation failed';
    const errorResponse: SimulationOutboundMessage = { type: 'error', message };
    (self as unknown as Worker).postMessage(errorResponse);
  }
};

export {};
