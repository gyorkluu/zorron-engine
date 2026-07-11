/**
 * ChoiceLayer - renders scene choices with adaptive layout.
 *
 * Layout adapts to choice count:
 * - ≤4 choices: vertical column (full-width buttons)
 * - 5-8 choices: 2-column grid
 * - 9+ choices: 3-column compact grid
 *
 * Uses `.player-choice` semantic class so colors follow the active theme
 * (modern teal-dark or ancient gold-ink).
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

/** Determine the grid column count based on choice count. */
function getGridCols(count: number): string {
  if (count <= 4) return 'grid-cols-1';
  if (count <= 8) return 'grid-cols-2';
  return 'grid-cols-3';
}

/** A single choice button with its interaction type. */
function ChoiceButton({
  choice,
  compact,
}: {
  choice: PlayerChoice;
  compact: boolean;
}) {
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
      className={`
        player-choice group relative w-full overflow-visible px-4 py-3
        text-center font-medium
        ${compact ? 'py-2 text-xs' : 'sm:px-6 sm:py-3.5 sm:text-base'}
      `}
    >
      {/* Hold progress bar */}
      {interaction === 'hold' && holdProgress > 0 && (
        <span
          className="absolute inset-y-0 left-0 rounded-l-sm"
          style={{
            width: `${holdProgress * 100}%`,
            backgroundColor: 'hsl(var(--p-accent) / 0.25)',
          }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2 whitespace-normal break-words text-center">
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
  const count = choices.length;
  const cols = getGridCols(count);
  const compact = count > 8;

  return (
    <div className={`grid w-full gap-2.5 ${cols} sm:gap-3`}>
      {choices.map((choice) => (
        <ChoiceButton key={choice.id} choice={choice} compact={compact} />
      ))}
    </div>
  );
}

export const ChoiceLayer = memo(ChoiceLayerImpl);
