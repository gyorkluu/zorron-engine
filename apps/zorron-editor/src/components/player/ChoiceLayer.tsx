/**
 * ChoiceLayer - renders scene choices with adaptive layout.
 *
 * Layout adapts to choice count:
 * - ≤4 choices: vertical column (full-width buttons)
 * - 5-8 choices: 2-column grid
 * - 9-11 choices: 3-column compact grid
 * - 12-20 choices: 4-column compact grid (e.g. 16 → 4×4)
 * - 21+ choices: 6-column dense grid (e.g. 33 → 6×6) so all items
 *   fit inside one screen without scrolling.
 *
 * Uses `.player-choice` semantic class so colors follow the active theme
 * (modern teal-dark or ancient gold-ink).
 */

import { memo, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useT } from '@/i18n/useT';
import { useHoldTrigger } from '@/hooks/useHoldTrigger';
import { useSlashTrigger } from '@/hooks/useSlashTrigger';
import { resolveMediaUrl } from '@/lib/media';
import type { PlayerChoice } from '@/engine/GameEngine';
import type { SlashDirection } from '@/types/flow';

/** Props for ChoiceLayer. */
export interface ChoiceLayerProps {
  choices: PlayerChoice[];
}

/** Determine the grid column count based on choice count.
 *  Uses responsive breakpoints so dense grids collapse on smaller viewports.
 *  - ≤4 choices: 1 column (full-width buttons, horizontal layout)
 *  - 5-8 choices: 2 columns
 *  - 9-11 choices: 3 columns (2 on small screens)
 *  - 12-20 choices: 4 columns (2 on small, 3 on medium)
 *  - 21+ choices: 6 columns on large screens (3 on small, 4 on medium)
 *    so a 33-item list (e.g. JX3 心法) fits in ~6 rows without scrolling.
 */
function getGridCols(count: number): string {
  if (count <= 4) return 'grid-cols-1';
  if (count <= 8) return 'grid-cols-2';
  if (count <= 11) return 'grid-cols-2 sm:grid-cols-3';
  if (count <= 20) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  return 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6';
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
        ${compact ? 'flex flex-col items-center justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm' : 'sm:px-6 sm:py-3.5 sm:text-base'}
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
      <span
        className={`relative z-10 w-full whitespace-normal break-words text-center ${
          compact && choice.icon
            ? 'flex flex-col items-center justify-center gap-1.5'
            : 'flex h-full items-center justify-center gap-2'
        }`}
      >
        {choice.icon ? (
          <img
            src={resolveMediaUrl(choice.icon)}
            alt=""
            className={`flex-shrink-0 object-contain ${
              compact ? 'h-10 w-10 sm:h-11 sm:w-11' : 'h-10 w-10'
            }`}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        <span className={compact && choice.icon ? 'w-full leading-tight' : 'flex-1'}>
          {choice.text}
        </span>
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
  // Dense layout (21+ choices) uses 6 columns + tighter gaps to fit
  // everything on one screen. Less dense (9-20) keeps comfortable spacing.
  const dense = count > 20;
  // When there are many choices, give the grid its own scroll area so the
  // stage title/dialogue stay visible and the page doesn't overflow.
  const scrollable = count > 12;

  return (
    <div
      className={`grid w-full ${cols} ${
        dense ? 'gap-1.5 sm:gap-2' : 'gap-3 sm:gap-4'
      } ${
        scrollable ? 'max-h-[60vh] overflow-y-auto pr-1 sm:pr-2' : ''
      }`}
    >
      {choices.map((choice) => (
        <ChoiceButton key={choice.id} choice={choice} compact={compact} />
      ))}
    </div>
  );
}

export const ChoiceLayer = memo(ChoiceLayerImpl);
