/**
 * InteractionStages - rendering for the four interactive node types:
 * minigame, rating, multi-select, and media.
 *
 * Each stage reads its slice from `GameState` and delegates mutations to the
 * player store. Stages are intentionally minimal — they exist so the player
 * never hits a blank screen when the flow reaches one of these nodes.
 */

import { memo, useState, useEffect } from 'react';
import { useT } from '@/i18n/useT';
import { usePlayerStore } from '@/stores/playerStore';
import { resolveMediaUrl } from '@/lib/media';
import type { GameState } from '@/engine/GameEngine';

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
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-slate-950 p-8 text-center">
      <h2 className="text-2xl font-bold text-slate-100">{t('player.minigame')}</h2>
      <iframe
        src={mg.gameUrl}
        className="h-[60vh] w-full max-w-3xl rounded-lg border border-slate-700"
        title="minigame"
      />
      <div className="flex items-center gap-4">
        <label className="text-sm text-slate-400">
          {t('player.score')}:
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="ml-2 w-24 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
          />
        </label>
        <button
          type="button"
          onClick={() => submitMinigame(score)}
          className="rounded-full bg-emerald-500/20 px-6 py-3 text-sm font-medium text-emerald-200 hover:bg-emerald-500/30"
        >
          {t('player.submit')}
        </button>
      </div>
    </div>
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

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-slate-950 p-8 text-center">
      {rt.prompt && <h2 className="text-2xl font-bold text-slate-100">{rt.prompt}</h2>}
      <div className="flex flex-col items-center gap-3">
        <span className="text-5xl font-bold text-cyan-300">{value}</span>
        <input
          type="range"
          min={rt.min}
          max={rt.max}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-72 accent-cyan-400"
        />
        <div className="flex w-72 justify-between text-xs text-slate-500">
          <span>{rt.min}</span>
          <span>{rt.max}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => submitRating(value)}
        className="rounded-full bg-cyan-500/20 px-6 py-3 text-sm font-medium text-cyan-200 hover:bg-cyan-500/30"
      >
        {t('player.submit')}
      </button>
    </div>
  );
}

export const RatingStage = memo(RatingStageImpl);

// ── Multi-Select ──────────────────────────────────────────────────────

interface MultiSelectStageProps {
  state: GameState;
}

function MultiSelectStageImpl({ state }: MultiSelectStageProps) {
  const { t } = useT();
  const submitMultiSelect = usePlayerStore((s) => s.submitMultiSelect);
  const ms = state.multiSelect;
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-slate-950 p-8 text-center">
      <h2 className="text-2xl font-bold text-slate-100">{t('player.chooseOptions')}</h2>
      {(min > 0 || max > 0) && (
        <p className="text-sm text-slate-500">
          {min > 0 && `${t('player.minSelect')}: ${min} `}
          {max > 0 && `${t('player.maxSelect')}: ${max}`}
        </p>
      )}
      <div className="flex w-full max-w-md flex-col gap-2">
        {ms.options.map((opt) => {
          const checked = selected.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                checked
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-slate-700 bg-slate-900 hover:border-slate-500'
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${
                  checked ? 'border-violet-400 bg-violet-500' : 'border-slate-600'
                }`}
              >
                {checked && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-200">{opt.label}</span>
                {opt.description && (
                  <span className="mt-1 block text-xs text-slate-500">{opt.description}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => submitMultiSelect([...selected])}
        className="rounded-full bg-violet-500/20 px-6 py-3 text-sm font-medium text-violet-200 hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('player.submit')}
      </button>
    </div>
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
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-slate-950 p-8 text-center">
      {md.mediaType === 'image' && url && (
        <img src={url} alt="" className="max-h-[70vh] max-w-full rounded-lg object-contain" />
      )}
      {md.mediaType === 'audio' && url && (
        <audio src={url} controls autoPlay={md.autoAdvance} onEnded={() => md.autoAdvance && advanceFromMedia()} />
      )}
      {md.mediaType === 'video' && url && (
        <video
          src={url}
          controls
          autoPlay={md.autoAdvance}
          onEnded={() => md.autoAdvance && advanceFromMedia()}
          className="max-h-[70vh] max-w-full rounded-lg"
        />
      )}
      {!md.autoAdvance && (
        <button
          type="button"
          onClick={() => advanceFromMedia()}
          className="rounded-full bg-slate-700/40 px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
        >
          {t('player.continue')}
        </button>
      )}
    </div>
  );
}

export const MediaStage = memo(MediaStageImpl);
