/**
 * ChoiceLayer - renders the scene choices with tap/hold/slash interactions.
 *
 * Styled with ancient-Chinese translucent gradients and mobile adaptation.
 */

import { memo, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useT } from '@/i18n/useT';
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
  const { t } = useT();
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
      className="choice-btn group relative w-full overflow-visible rounded-sm border border-transparent px-6 py-3 text-center text-sm font-normal tracking-[2px] text-[#f5f0e6] transition-all duration-300 sm:px-10 sm:py-3.5 sm:text-base sm:tracking-[3px] md:min-w-[300px] md:px-[60px] md:py-4"
    >
      {/* Ancient gradient background */}
      <span className="choice-btn-bg absolute inset-0 rounded-sm" />
      {/* Hold progress bar */}
      {interaction === 'hold' && holdProgress > 0 && (
        <span
          className="absolute inset-y-0 left-0 bg-[rgba(212,175,55,0.25)]"
          style={{ width: `${holdProgress * 100}%` }}
        />
      )}
      {/* Decorative lines */}
      <span className="choice-decorator-left absolute left-3 top-1/2 hidden h-px w-5 -translate-y-1/2 bg-gradient-to-r from-transparent to-[rgba(212,175,55,0.6)] transition-all group-hover:w-8 sm:block" />
      <span className="choice-decorator-right absolute right-3 top-1/2 hidden h-px w-5 -translate-y-1/2 bg-gradient-to-l from-transparent to-[rgba(212,175,55,0.6)] transition-all group-hover:w-8 sm:block" />
      <span className="relative z-10 flex items-center justify-center gap-2 whitespace-normal break-words text-center sm:whitespace-nowrap">
        <span className="flex-1">{choice.text}</span>
      </span>
      <span className="sr-only">
        {interaction === 'hold'
          ? t('interaction.hold')
          : interaction === 'slash'
            ? t('interaction.slash')
            : t('interaction.tap')}
      </span>
    </button>
  );
}

function ChoiceLayerImpl({ choices }: ChoiceLayerProps) {
  return (
    <div className="flex w-full flex-col items-center gap-3 sm:gap-4">
      {choices.map((choice) => (
        <ChoiceButton key={choice.id} choice={choice} />
      ))}
    </div>
  );
}

export const ChoiceLayer = memo(ChoiceLayerImpl);
