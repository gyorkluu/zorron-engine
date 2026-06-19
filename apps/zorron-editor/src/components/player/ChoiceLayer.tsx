/**
 * ChoiceLayer - renders the scene choices with tap/hold/slash interactions.
 */

import { memo, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useHoldTrigger } from '@/hooks/useHoldTrigger';
import { useSlashTrigger } from '@/hooks/useSlashTrigger';
import type { PlayerChoice } from '@/engine/GameEngine';
import type { SlashDirection } from '@/types/flow';

/** Props for ChoiceLayer. */
export interface ChoiceLayerProps {
  choices: PlayerChoice[];
}

/** A single choice button with its interaction type. */
function ChoiceButton({ choice }: { choice: PlayerChoice }) {
  const selectChoice = usePlayerStore((s) => s.selectChoice);
  const [holdProgress, setHoldProgress] = useState(0);

  const hold = useHoldTrigger({
    duration: choice.holdDuration ?? 1500,
    onTrigger: () => selectChoice(choice.id),
    onProgress: setHoldProgress,
  });

  const slash = useSlashTrigger({
    direction: (choice.slashDirection ?? 'right') as SlashDirection,
    onTrigger: () => selectChoice(choice.id),
  });

  const interaction = choice.interaction;

  const handlers =
    interaction === 'hold'
      ? hold
      : interaction === 'slash'
        ? slash
        : { onClick: () => selectChoice(choice.id) };

  return (
    <button
      type="button"
      {...handlers}
      className="group relative w-full overflow-hidden rounded-xl border border-violet-400/30 bg-slate-900/60 px-4 py-3 text-left text-sm text-slate-100 backdrop-blur-sm transition-all hover:border-violet-400/60 hover:bg-slate-800/70"
    >
      {/* Hold progress bar */}
      {interaction === 'hold' && holdProgress > 0 && (
        <span
          className="absolute inset-y-0 left-0 bg-violet-500/30"
          style={{ width: `${holdProgress * 100}%` }}
        />
      )}
      <span className="relative flex items-center justify-between gap-2">
        <span className="flex-1">{choice.text}</span>
        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-violet-200">
          {interaction}
          {interaction === 'slash' ? ` ${choice.slashDirection ?? ''}` : ''}
          {interaction === 'hold' ? ` ${Math.round((choice.holdDuration ?? 1500) / 1000)}s` : ''}
        </span>
      </span>
    </button>
  );
}

function ChoiceLayerImpl({ choices }: ChoiceLayerProps) {
  return (
    <div className="flex flex-col gap-2">
      {choices.map((choice) => (
        <ChoiceButton key={choice.id} choice={choice} />
      ))}
    </div>
  );
}

export const ChoiceLayer = memo(ChoiceLayerImpl);
