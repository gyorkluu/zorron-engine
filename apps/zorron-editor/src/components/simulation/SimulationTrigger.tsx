/**
 * SimulationTrigger - toolbar button that opens the simulation modal.
 *
 * A small floating button rendered in the editor canvas top-right. Manages
 * the open/close state of the SimulationPanel modal.
 */

import { memo, useCallback, useState } from 'react';
import { SimulationPanel } from './SimulationPanel';

function SimulationTriggerImpl() {
  const [open, setOpen] = useState(false);
  const handleClick = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg backdrop-blur-sm hover:bg-slate-800"
        data-testid="simulation-trigger"
        title="运行蒙特卡洛模拟"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 4 4 5-5" />
        </svg>
        模拟
      </button>
      <SimulationPanel open={open} onClose={handleClose} />
    </>
  );
}

export const SimulationTrigger = memo(SimulationTriggerImpl);
