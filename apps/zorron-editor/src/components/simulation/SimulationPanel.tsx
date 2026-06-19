/**
 * SimulationPanel - configuration UI and results modal for Monte Carlo simulation.
 *
 * Renders a button in the toolbar area that opens a modal with:
 * - Run count input.
 * - Seed input (optional).
 * - Strategy selector (random / weighted).
 * - A "Run" button that triggers the simulation via the useSimulation hook.
 * - The SimulationReport view once results are available.
 */

import { memo, useCallback, useState } from 'react';
import { useSimulation } from '@/hooks/useSimulation';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore, buildFlowData } from '@/stores/projectStore';
import {
  DEFAULT_SIMULATION_CONFIG,
  type SimulationConfig,
} from '@/engine/simulator';
import { SimulationReportView } from './SimulationReport';

/** Props for the SimulationPanel. */
export interface SimulationPanelProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Called when the user closes the modal. */
  onClose: () => void;
}

function SimulationPanelImpl({ open, onClose }: SimulationPanelProps) {
  const [runs, setRuns] = useState(DEFAULT_SIMULATION_CONFIG.runs);
  const [seed, setSeed] = useState('');
  const [strategy, setStrategy] = useState<SimulationConfig['strategy']>('random');

  const { running, report, error, run, reset } = useSimulation();

  /** Build the current FlowData from the editor + project stores. */
  const buildCurrentFlow = useCallback(() => {
    const editor = useEditorStore.getState();
    const project = useProjectStore.getState();
    return buildFlowData(
      {
        variables: project.variables,
        settings: project.settings,
        version: project.version,
      },
      editor.nodes,
      editor.edges,
    );
  }, []);

  /** Handle the "Run" button click. */
  const handleRun = useCallback(async () => {
    const flowData = buildCurrentFlow();
    const config: SimulationConfig = {
      runs: Math.max(1, Math.min(100_000, runs)),
      seed: seed.trim() || undefined,
      strategy,
    };
    try {
      await run(flowData, config);
    } catch {
      // Error is surfaced via the hook's `error` state.
    }
  }, [buildCurrentFlow, run, runs, seed, strategy]);

  /** Close the modal and reset the report. */
  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
      onClick={handleClose}
      data-testid="simulation-modal"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Monte Carlo Simulation
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {report ? (
            <SimulationReportView report={report} onClose={handleClose} />
          ) : (
            <div className="space-y-4 p-4" data-testid="simulation-config">
              <p className="text-xs text-slate-400">
                Run random traversals of the current flow graph to discover dead
                ends, unreachable nodes and settlement distribution imbalances.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Runs
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={runs}
                    onChange={(e) => setRuns(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-cyan-500/60"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Seed (optional)
                  </span>
                  <input
                    type="text"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="random"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-cyan-500/60"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Strategy
                </span>
                <select
                  value={strategy}
                  onChange={(e) =>
                    setStrategy(e.target.value as SimulationConfig['strategy'])
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-cyan-500/60"
                >
                  <option value="random">Random (uniform)</option>
                  <option value="weighted">Weighted (by choice order)</option>
                </select>
              </label>

              {error && (
                <div className="rounded-lg border border-rose-700/50 bg-rose-900/30 p-2 text-xs text-rose-200">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleRun}
                disabled={running}
                className="w-full rounded-lg border border-cyan-600/50 bg-cyan-600/20 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="simulation-run-button"
              >
                {running ? 'Running...' : 'Run Simulation'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const SimulationPanel = memo(SimulationPanelImpl);
