/**
 * InteractionStages - rendering for the four interactive node types:
 * minigame, rating, multi-select, and media.
 *
 * Unified dark theme: bg-slate-950, teal accent, consistent typography and
 * spacing across all stages. MultiSelectStage uses a compact tag-chip grid
 * instead of full-width vertical buttons to handle many options gracefully.
 */

import { memo, useState, useEffect } from 'react';
import { useT } from '@/i18n/useT';
import { usePlayerStore } from '@/stores/playerStore';
import { resolveMediaUrl } from '@/lib/media';
import type { GameState } from '@/engine/GameEngine';

// ── Shared layout wrapper ─────────────────────────────────────────────

/** Unified stage container: dark bg, centered, scrollable, teal accent. */
function StageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 overflow-y-auto bg-slate-950 p-6 text-center sm:p-8">
      {children}
    </div>
  );
}

/** Unified primary button: teal accent. */
function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-teal-500/40 bg-teal-500/15 px-6 py-2.5 text-sm font-medium text-teal-200 transition-colors hover:border-teal-400/60 hover:bg-teal-500/25 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/50 disabled:text-slate-500"
    >
      {children}
    </button>
  );
}

// ── Minigame ──────────────────────────────────────────────────────────

interface MinigameStageProps {
  state: GameState;
}

function MinigameStageImpl({ state }: MinigameStageProps) {
  const { t } = useT();
  const submitMinigame = usePlayerStore((s) => s.submitMinigame);
  const mg = state.minigame;
  const [score, setScore] = useState(0);

  if (!mg) return null;

  return (
    <StageShell>
      <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">{t('player.minigame')}</h2>
      <iframe
        src={mg.gameUrl}
        className="h-[55vh] w-full max-w-3xl rounded-lg border border-slate-700/60"
        title="minigame"
      />
      <div className="flex items-center gap-4">
        <label className="text-sm text-slate-400">
          {t('player.score')}:
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="ml-2 w-24 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
          />
        </label>
        <PrimaryButton onClick={() => submitMinigame(score)}>
          {t('player.submit')}
        </PrimaryButton>
      </div>
    </StageShell>
  );
}

export const MinigameStage = memo(MinigameStageImpl);

// ── Rating ────────────────────────────────────────────────────────────

interface RatingStageProps {
  state: GameState;
}

function RatingStageImpl({ state }: RatingStageProps) {
  const { t } = useT();
  const submitRating = usePlayerStore((s) => s.submitRating);
  const rt = state.rating;
  const [value, setValue] = useState(rt?.min ?? 0);

  useEffect(() => {
    if (rt) setValue(rt.min);
  }, [rt]);

  if (!rt) return null;
  const step = rt.step ?? 1;
  const minLabel = rt.minLabel ?? String(rt.min);
  const maxLabel = rt.maxLabel ?? String(rt.max);

  return (
    <StageShell>
      {rt.prompt && (
        <h2 className="text-lg font-bold text-slate-100 sm:text-xl">{rt.prompt}</h2>
      )}
      <div className="flex flex-col items-center gap-3">
        <span className="text-5xl font-bold text-teal-300">{value}</span>
        <input
          type="range"
          min={rt.min}
          max={rt.max}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-72 accent-teal-400"
        />
        <div className="flex w-72 justify-between text-xs text-slate-500">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>
      <PrimaryButton onClick={() => submitRating(value)}>
        {t('player.submit')}
      </PrimaryButton>
    </StageShell>
  );
}

export const RatingStage = memo(RatingStageImpl);

// ── Multi-Select ─────────────────────────────────────────────────────

interface MultiSelectStageProps {
  state: GameState;
}

function MultiSelectStageImpl({ state }: MultiSelectStageProps) {
  const { t } = useT();
  const submitMultiSelect = usePlayerStore((s) => s.submitMultiSelect);
  const ms = state.multiSelect;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset selection when the node changes.
  useEffect(() => {
    setSelected(new Set());
  }, [ms]);

  if (!ms) return null;

  const min = ms.minSelect ?? 0;
  const max = ms.maxSelect ?? 0;
  const canSubmit = selected.size >= min && (max === 0 || selected.size <= max);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (max === 0 || next.size < max) {
        next.add(id);
      }
      return next;
    });
  };

  const countLabel = [
    min > 0 ? `${t('player.minSelect')}: ${min}` : '',
    max > 0 ? `${t('player.maxSelect')}: ${max}` : '',
    `${t('player.score')}: ${selected.size}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <StageShell>
      {/* Question prompt from node data, fallback to generic title */}
      <h2 className="text-lg font-bold text-slate-100 sm:text-xl">
        {ms.question ?? t('player.chooseOptions')}
      </h2>

      {/* Selection count / min-max indicator */}
      <p className="text-sm text-slate-400">{countLabel}</p>

      {/* Tag-chip grid: auto-wraps, compact, scrollable when many */}
      <div className="flex max-h-[50vh] w-full max-w-2xl flex-wrap justify-center gap-2 overflow-y-auto">
        {ms.options.map((opt) => {
          const checked = selected.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={`
                rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150
                ${
                  checked
                    ? 'border-teal-400/60 bg-teal-500/20 text-teal-100'
                    : 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-teal-500/40 hover:bg-teal-500/5 hover:text-teal-200'
                }
              `}
            >
              {opt.label}
              {checked && <span className="ml-1.5 text-teal-300">✓</span>}
            </button>
          );
        })}
      </div>

      <PrimaryButton disabled={!canSubmit} onClick={() => submitMultiSelect([...selected])}>
        {t('player.submit')}
      </PrimaryButton>
    </StageShell>
  );
}

export const MultiSelectStage = memo(MultiSelectStageImpl);

// ── Media ─────────────────────────────────────────────────────────────

interface MediaStageProps {
  state: GameState;
}

function MediaStageImpl({ state }: MediaStageProps) {
  const { t } = useT();
  const advanceFromMedia = usePlayerStore((s) => s.advanceFromMedia);
  const md = state.media;

  if (!md) return null;
  const url = resolveMediaUrl(md.url);

  return (
    <StageShell>
      {md.mediaType === 'image' && url && (
        <img src={url} alt="" className="max-h-[65vh] max-w-full rounded-lg object-contain" />
      )}
      {md.mediaType === 'audio' && url && (
        <audio
          src={url}
          controls
          autoPlay={md.autoAdvance}
          onEnded={() => md.autoAdvance && advanceFromMedia()}
        />
      )}
      {md.mediaType === 'video' && url && (
        <video
          src={url}
          controls
          autoPlay={md.autoAdvance}
          onEnded={() => md.autoAdvance && advanceFromMedia()}
          className="max-h-[65vh] max-w-full rounded-lg"
        />
      )}
      {!md.autoAdvance && (
        <PrimaryButton onClick={() => advanceFromMedia()}>
          {t('player.continue')}
        </PrimaryButton>
      )}
    </StageShell>
  );
}

export const MediaStage = memo(MediaStageImpl);
