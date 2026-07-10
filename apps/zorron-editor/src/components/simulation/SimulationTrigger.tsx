/**
 * SimulationTrigger - toolbar button that opens the simulation modal.
 *
 * A small floating button rendered in the editor canvas top-right. Manages
 * the open/close state of the SimulationPanel modal.
 */

import { memo, useCallback, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { SimulationPanel } from './SimulationPanel';
import { useT } from '@/i18n/useT';

function SimulationTriggerImpl() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const handleClick = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="group flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 text-xs font-medium text-violet-200 shadow-lg shadow-violet-500/10 backdrop-blur-md transition-all duration-150 hover:border-violet-400/50 hover:bg-violet-500/25 hover:text-violet-100 active:scale-[0.97]"
        data-testid="simulation-trigger"
        title={t('sim.trigger.tip')}
      >
        <BarChart3 size={14} className="transition-transform group-hover:scale-110" />
        <span>{t('sim.trigger')}</span>
      </button>
      <SimulationPanel open={open} onClose={handleClose} />
    </>
  );
}

export const SimulationTrigger = memo(SimulationTriggerImpl);
