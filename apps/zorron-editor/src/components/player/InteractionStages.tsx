/**
 * InteractionStages - rendering for the interactive node types:
 * minigame, rating, multi-select, media, text-input, and rank-order.
 *
 * Uses `.player-*` semantic classes (theme-aware) so the same component
 * re-skins automatically under modern / ancient / future themes.
 * MultiSelectStage uses a compact tag-chip grid instead of full-width
 * vertical buttons to handle many options gracefully.
 * RankOrderStage uses HTML5 drag-and-drop to reorder items by priority.
 */

import { memo, useState, useEffect, useRef } from 'react';
import { useT } from '@/i18n/useT';
import { usePlayerStore } from '@/stores/playerStore';
import { resolveMediaUrl } from '@/lib/media';
import type { GameState } from '@/engine/GameEngine';

// ── Shared layout wrapper ─────────────────────────────────────────────

/** Unified stage container — theme-aware bg, centered, scrollable. Supports optional background image. */
function StageShell({ children, bgUrl }: { children: React.ReactNode; bgUrl?: string | null }) {
  const resolvedBg = bgUrl ? resolveMediaUrl(bgUrl) : null;
  return (
    <div className="player-bg player-font player-text relative flex h-full w-full flex-col items-center justify-center overflow-y-auto p-4 sm:p-8 text-center">
      {resolvedBg && (
        <div className="pointer-events-none absolute inset-0 z-0">
          <img
            src={resolvedBg}
            alt=""
            className="h-full w-full object-cover opacity-25 filter blur-[1px]"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(2,6,23,0.6) 0%, rgba(2,6,23,0.85) 100%)',
            }}
          />
        </div>
      )}
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* my-auto centers content vertically; max-w-2xl keeps comfortable reading width on desktop */}
      <div className="relative z-10 my-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-3xl border border-slate-800/60 bg-slate-950/50 p-6 sm:p-10 shadow-2xl backdrop-blur-md">
        {children}
      </div>
    </div>
  );
}

/** Unified primary button — theme-aware accent. */
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
      className="group relative inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/50 bg-gradient-to-r from-cyan-600/30 via-cyan-500/20 to-teal-500/30 px-8 py-3 text-sm font-semibold text-cyan-100 shadow-lg shadow-cyan-500/10 backdrop-blur-sm transition-all duration-150 hover:scale-[1.02] hover:border-cyan-400 hover:bg-cyan-500/30 hover:text-white disabled:pointer-events-none disabled:opacity-40 disabled:hover:scale-100 active:scale-[0.98]"
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
    <StageShell bgUrl={state.stageBackgroundUrl}>
      <h2 className="text-xl font-bold sm:text-2xl">{t('player.minigame')}</h2>
      <iframe
        src={mg.gameUrl}
        className="player-card h-[55vh] w-full max-w-3xl"
        title="minigame"
      />
      <div className="flex items-center gap-4">
        <label className="player-text-muted text-sm">
          {t('player.score')}:
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="player-surface player-border player-text ml-2 w-24 rounded-md px-2 py-1"
            style={{ color: 'hsl(var(--p-text))' }}
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
    <StageShell bgUrl={state.stageBackgroundUrl}>
      {rt.prompt && (
        <h2 className="text-lg font-bold sm:text-xl">{rt.prompt}</h2>
      )}
      <div className="flex flex-col items-center gap-3">
        <span className="player-accent-text text-5xl font-bold">{value}</span>
        <input
          type="range"
          min={rt.min}
          max={rt.max}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-72"
          style={{ accentColor: 'hsl(var(--p-accent))' }}
        />
        <div className="player-text-muted flex w-72 justify-between text-xs">
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
  // In any-mode, default to "任意" selected.
  useEffect(() => {
    const min0 = ms?.minSelect ?? 0;
    const max0 = ms?.maxSelect ?? 0;
    const isAny = min0 === 0 && max0 === 0;
    setSelected(isAny ? new Set(['__any__']) : new Set());
  }, [ms]);

  if (!ms) return null;

  const min = ms.minSelect ?? 0;
  const max = ms.maxSelect ?? 0;
  // "any" mode: min=0 and max=0 means optional / no-preference node.
  const isAnyMode = min === 0 && max === 0;
  const ANY_ID = '__any__';

  // Build option list with optional "任意" pseudo-option for any-mode nodes.
  const allOptions = isAnyMode
    ? [{ id: ANY_ID, label: '任意' }, ...ms.options]
    : ms.options;

  const canSubmit = isAnyMode
    ? true
    : selected.size >= min && (max === 0 || selected.size <= max);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isAnyMode && id === ANY_ID) {
        // "任意" clears everything else and means "no preference".
        next.clear();
        next.add(ANY_ID);
        return next;
      }
      // Selecting a real option clears "任意".
      next.delete(ANY_ID);
      if (next.has(id)) {
        next.delete(id);
        // If nothing is selected, restore "任意" in any-mode.
        if (isAnyMode && next.size === 0) next.add(ANY_ID);
      } else if (max === 0 || next.size < max) {
        next.add(id);
      }
      return next;
    });
  };

  // Count label only shown when there is a real min/max constraint.
  const showCount = !isAnyMode && (min > 0 || max > 0);
  const countLabel = [
    min > 0 ? `${t('player.minSelect')}: ${min}` : '',
    max > 0 ? `${t('player.maxSelect')}: ${max}` : '',
    `${selected.size}`,
  ]
    .filter(Boolean)
    .join(' · ');

  // Adaptive grid columns based on option count.
  // Mirrors ChoiceLayer logic so multi-select nodes with many options
  // (e.g. 33 心法) fit on one screen using a 6-column dense grid.
  const optCount = allOptions.length;
  const gridCols =
    optCount <= 4 ? 'grid-cols-1' :
    optCount <= 8 ? 'grid-cols-2' :
    optCount <= 11 ? 'grid-cols-2 sm:grid-cols-3' :
    optCount <= 20 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' :
    'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6';
  const dense = optCount > 20;
  const compact = optCount > 8;

  // When "任意" is selected, submit empty array (no preference).
  const handleSubmit = () => {
    const result = selected.has(ANY_ID) ? [] : [...selected];
    submitMultiSelect(result);
  };

  return (
    <StageShell bgUrl={state.stageBackgroundUrl}>
      <h2 className="text-lg font-bold sm:text-xl">
        {ms.question ?? t('player.chooseOptions')}
      </h2>

      {showCount && (
        <p className="player-text-muted text-sm">{countLabel}</p>
      )}

      {/* Adaptive grid: column count scales with option count. */}
      <div
        className={`grid ${gridCols} ${
          dense ? 'gap-1.5 sm:gap-2' : 'gap-2 sm:gap-3'
        } max-h-[60vh] w-full max-w-4xl overflow-y-auto pr-1 sm:pr-2`}
      >
        {allOptions.map((opt) => {
          const checked = selected.has(opt.id);
          const iconUrl = opt.icon ? resolveMediaUrl(opt.icon) : null;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={`player-radius-sm relative flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-all duration-150 sm:text-sm ${
                compact && iconUrl ? 'flex-col gap-1 py-2.5' : ''
              } ${checked ? 'player-choice-active' : 'player-choice'}`}
            >
              {iconUrl && (
                <img
                  src={iconUrl}
                  alt=""
                  className={`flex-shrink-0 object-contain ${
                    compact ? 'h-9 w-9 sm:h-10 sm:w-10' : 'h-6 w-6'
                  }`}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span className="whitespace-normal break-words leading-tight">{opt.label}</span>
              {checked && (
                <span className="player-accent-text ml-1 text-sm">✓</span>
              )}
            </button>
          );
        })}
      </div>

      <PrimaryButton disabled={!canSubmit} onClick={handleSubmit}>
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
    <StageShell bgUrl={state.stageBackgroundUrl}>
      {md.mediaType === 'image' && url && (
        <img src={url} alt="" className="player-radius max-h-[65vh] max-w-full object-contain" />
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
          className="player-radius max-h-[65vh] max-w-full"
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

// ── Text Input ────────────────────────────────────────────────────────

interface TextInputStageProps {
  state: GameState;
}

function TextInputStageImpl({ state }: TextInputStageProps) {
  const { t } = useT();
  const submitTextInput = usePlayerStore((s) => s.submitTextInput);
  const submitTuilanId = usePlayerStore((s) => s.submitTuilanId);
  const isLookingUp = usePlayerStore((s) => s.isLookingUp);
  const lookupError = usePlayerStore((s) => s.lookupError);
  const submissionExists = usePlayerStore((s) => s.submissionExists);
  const isAppealing = usePlayerStore((s) => s.isAppealing);
  const appealError = usePlayerStore((s) => s.appealError);
  const appealSuccess = usePlayerStore((s) => s.appealSuccess);
  const confirmModify = usePlayerStore((s) => s.confirmModify);
  const dismissSubmissionExists = usePlayerStore((s) => s.dismissSubmissionExists);
  const submitAppeal = usePlayerStore((s) => s.submitAppeal);
  const skipTuilanLookup = usePlayerStore((s) => s.skipTuilanLookup);
  const ti = state.textInput;
  const [value, setValue] = useState('');
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reason, setReason] = useState('');

  if (!ti) return null;

  const isTuilanId = ti.variable === 'tuilan_id';
  const canSubmit = (!ti.required || value.trim().length > 0) && !isLookingUp;
  const maxLength = ti.maxLength && ti.maxLength > 0 ? ti.maxLength : undefined;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (isTuilanId) {
      void submitTuilanId(value);
    } else {
      submitTextInput(value);
    }
  };

  const handleAppealSubmit = () => {
    if (!selectedFile || isAppealing) return;
    void submitAppeal(selectedFile, reason.trim() || undefined);
  };

  const handleAppealCancel = () => {
    setShowAppealForm(false);
    setSelectedFile(null);
    setReason('');
    dismissSubmissionExists();
  };

  // ── Appeal success state ──
  if (appealSuccess && isTuilanId) {
    return (
      <StageShell bgUrl={state.stageBackgroundUrl}>
        <h2 className="text-lg font-bold sm:text-xl">申诉已提交</h2>
        <p className="player-text-muted text-sm">
          我们会尽快审核你的申诉，请耐心等待。
        </p>
        <PrimaryButton onClick={handleAppealCancel}>
          返回
        </PrimaryButton>
      </StageShell>
    );
  }

  // ── Appeal form state ──
  if (showAppealForm && isTuilanId) {
    return (
      <StageShell bgUrl={state.stageBackgroundUrl}>
        <h2 className="text-lg font-bold sm:text-xl">提交申诉</h2>
        <p className="player-text-muted text-xs">
          请上传截图证明该推栏号属于你，或说明数据有误的原因。
        </p>

        <div className="flex w-full max-w-md flex-col items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="player-text text-sm file:player-btn file:mr-3 file:rounded file:border-0 file:px-3 file:py-1.5 file:text-xs"
          />

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请说明申诉原因（选填）"
            rows={3}
            className="player-surface player-border player-text player-radius w-full px-4 py-2 text-sm outline-none focus:player-border-hover"
            style={{ color: 'hsl(var(--p-text))' }}
          />

          {appealError && (
            <p className="text-xs text-red-500">{appealError}</p>
          )}

          {isAppealing && (
            <p className="player-accent-text text-xs animate-pulse">
              正在提交申诉...
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <PrimaryButton
            disabled={!selectedFile || isAppealing}
            onClick={handleAppealSubmit}
          >
            {isAppealing ? '提交中...' : '提交申诉'}
          </PrimaryButton>
          <button
            type="button"
            onClick={handleAppealCancel}
            disabled={isAppealing}
            className="player-surface player-border player-text player-radius px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
          >
            取消
          </button>
        </div>
      </StageShell>
    );
  }

  // ── Submission exists state ──
  if (submissionExists && isTuilanId) {
    return (
      <StageShell bgUrl={state.stageBackgroundUrl}>
        <h2 className="text-lg font-bold sm:text-xl">该推栏号已有提交记录</h2>
        <p className="player-text-muted text-xs leading-relaxed">
          推栏号 {usePlayerStore.getState().pendingTuilanId} 已存在提交数据。
          <br />
          你可以选择修改信息重新测试，或提交申诉。
        </p>

        <div className="flex gap-3">
          <PrimaryButton onClick={() => void confirmModify()}>
            修改信息
          </PrimaryButton>
          <button
            type="button"
            onClick={() => setShowAppealForm(true)}
            className="player-surface player-border player-text player-radius px-6 py-2.5 text-sm font-medium transition-colors"
          >
            申诉
          </button>
        </div>
      </StageShell>
    );
  }

  // ── Default input state ──
  return (
    <StageShell bgUrl={state.stageBackgroundUrl}>
      {ti.question && (
        <h2 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
          {ti.question}
        </h2>
      )}

      <div className="flex w-full max-w-md flex-col items-center gap-3.5">
        <div className="relative w-full">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (lookupError) {
                usePlayerStore.setState({ lookupError: null });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) handleSubmit();
            }}
            placeholder={ti.placeholder ?? ''}
            maxLength={maxLength}
            disabled={isLookingUp}
            className="w-full rounded-2xl border border-slate-700/80 bg-slate-900/90 px-5 py-3.5 text-center text-lg font-medium text-slate-100 placeholder-slate-500 shadow-inner outline-none transition-all duration-200 focus:border-cyan-400 focus:bg-slate-900 focus:ring-4 focus:ring-cyan-500/20 disabled:opacity-50"
            autoFocus
          />
          {canSubmit && !isLookingUp && (
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-400">
              Enter ↵
            </span>
          )}
        </div>

        {ti.hint && !lookupError && (
          <p className="text-xs leading-relaxed text-slate-400">
            {ti.hint}
          </p>
        )}

        {isLookingUp && (
          <p className="inline-flex items-center gap-1.5 text-xs text-cyan-400 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
            正在查询推栏号信息...
          </p>
        )}

        {lookupError && isTuilanId && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs leading-relaxed text-rose-400">
              查询失败：{lookupError}
            </p>
            <button
              type="button"
              onClick={() => skipTuilanLookup(value)}
              className="text-xs text-slate-400 underline transition-colors hover:text-cyan-300"
            >
              查询服务不可用，手动填写信息 →
            </button>
          </div>
        )}
      </div>

      <PrimaryButton disabled={!canSubmit} onClick={handleSubmit}>
        {isLookingUp ? '查询中...' : lookupError && isTuilanId ? '重试' : t('player.submit')}
      </PrimaryButton>
    </StageShell>
  );
}

export const TextInputStage = memo(TextInputStageImpl);

// ── Rank-Order (drag-to-reorder) ──────────────────────────────────────

interface RankOrderStageProps {
  state: GameState;
}

function RankOrderStageImpl({ state }: RankOrderStageProps) {
  const { t } = useT();
  const submitRankOrder = usePlayerStore((s) => s.submitRankOrder);
  const ro = state.rankOrder;

  // Local ordered copy of item ids — starts from the node's declared order.
  const [ordered, setOrdered] = useState<string[]>([]);
  // Which item is currently being dragged (by index).
  const dragIndexRef = useRef<number | null>(null);
  // Which item is the drop target (by index) — for visual feedback.
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Reset ordering when the node changes.
  useEffect(() => {
    setOrdered(ro?.items.map((it) => it.id) ?? []);
    setOverIndex(null);
    dragIndexRef.current = null;
  }, [ro]);

  if (!ro) return null;

  const labelMap = new Map(ro.items.map((it) => [it.id, it.label]));
  const descMap = new Map(ro.items.map((it) => [it.id, it.description]));

  // ── Drag handlers (HTML5 DnD, works on desktop + mobile via pointer events fallback) ──
  const onDragStart = (index: number) => {
    dragIndexRef.current = index;
  };
  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setOverIndex(index);
  };
  const onDrop = (index: number) => {
    const from = dragIndexRef.current;
    if (from === null || from === index) {
      dragIndexRef.current = null;
      setOverIndex(null);
      return;
    }
    setOrdered((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndexRef.current = null;
    setOverIndex(null);
  };
  // ── Touch fallback (mobile): move item up/down via buttons ──
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= ordered.length) return;
    setOrdered((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <StageShell bgUrl={state.stageBackgroundUrl}>
      <h2 className="text-lg font-bold sm:text-xl">
        {ro.question ?? '请拖动排序'}
      </h2>
      {ro.hint && (
        <p className="player-text-muted text-sm">{ro.hint}</p>
      )}

      {/* Ordered list — draggable items */}
      <div className="flex w-full max-w-md flex-col gap-2">
        {ordered.map((id, index) => {
          const isOver = overIndex === index;
          return (
            <div
              key={id}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={() => onDrop(index)}
              onDragEnd={() => { dragIndexRef.current = null; setOverIndex(null); }}
              className={`player-radius-sm flex items-center gap-3 border p-3 transition-all duration-150 ${
                isOver ? 'player-choice-active' : 'player-card'
              } cursor-grab active:cursor-grabbing`}
              style={{ borderColor: isOver ? 'hsl(var(--p-accent))' : undefined }}
            >
              {/* Rank number */}
              <span
                className="player-accent-text flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ border: '1px solid hsl(var(--p-accent-border))' }}
              >
                {index + 1}
              </span>
              {/* Label + description */}
              <div className="flex-1 text-left">
                <div className="player-text text-sm font-medium">{labelMap.get(id) ?? id}</div>
                {descMap.get(id) && (
                  <div className="player-text-muted text-xs">{descMap.get(id)}</div>
                )}
              </div>
              {/* Drag handle hint + mobile move buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="player-text-muted hover:player-accent-text disabled:opacity-30 px-1 text-sm"
                  aria-label="上移"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === ordered.length - 1}
                  className="player-text-muted hover:player-accent-text disabled:opacity-30 px-1 text-sm"
                  aria-label="下移"
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <PrimaryButton onClick={() => submitRankOrder(ordered)}>
        {t('player.submit')}
      </PrimaryButton>
    </StageShell>
  );
}

export const RankOrderStage = memo(RankOrderStageImpl);

// ── Number-Picker (vertical wheel) ─────────────────────────────────────

interface NumberPickerStageProps {
  state: GameState;
}

/**
 * NumberPickerStage — vertical wheel-style number selector.
 *
 * 上下滚动选择数字（如入坑年份），支持：
 * - 鼠标滚轮 / 触控板滑动
 * - 上/下箭头按钮
 * - 键盘 ↑↓ 方向键
 *
 * 显示窗口可见 5 个值（中间高亮，上下各 2 个淡化），
 * 类似 iOS 原生日期选择器的视觉风格。
 */
function NumberPickerStageImpl({ state }: NumberPickerStageProps) {
  const { t } = useT();
  const submitNumberPicker = usePlayerStore((s) => s.submitNumberPicker);
  const np = state.numberPicker;

  const [value, setValue] = useState<number>(np?.defaultValue ?? 0);

  // 当节点切换时重置 value
  useEffect(() => {
    setValue(np?.defaultValue ?? 0);
  }, [np?.defaultValue, np?.variable]);

  if (!np) return null;

  const { min, max, step, unit } = np;
  // 计算所有可选项（受 min/max/step 限制）
  const allValues: number[] = [];
  for (let v = min; v <= max; v += step) {
    allValues.push(v);
  }
  // 若 max 不在 step 网格上，确保最后一个值是 max（如果接近）
  if (allValues[allValues.length - 1] !== max && max - allValues[allValues.length - 1] < step) {
    allValues[allValues.length - 1] = max;
  }

  const currentIndex = allValues.indexOf(value);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  // 显示窗口：当前 ± 2，共 5 个
  const windowSize = 2;
  const getWindow = () => {
    const start = Math.max(0, safeIndex - windowSize);
    const end = Math.min(allValues.length - 1, safeIndex + windowSize);
    const result: Array<{ value: number; offset: number }> = [];
    for (let i = start; i <= end; i++) {
      result.push({ value: allValues[i], offset: i - safeIndex });
    }
    return result;
  };

  const move = (dir: -1 | 1) => {
    const next = safeIndex + dir;
    if (next < 0 || next >= allValues.length) return;
    setValue(allValues[next]);
  };

  const onWheel = (e: React.WheelEvent) => {
    // 防止页面滚动，只让选择器响应
    e.preventDefault();
    if (Math.abs(e.deltaY) < 8) return;
    move(e.deltaY > 0 ? 1 : -1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submitNumberPicker(value);
    }
  };

  return (
    <StageShell bgUrl={state.stageBackgroundUrl}>
      {np.question && (
        <h2 className="text-lg font-bold sm:text-xl">{np.question}</h2>
      )}

      {/* 滚轮选择器 */}
      <div
        className="flex flex-col items-center"
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={`${value}${unit ?? ''}`}
      >
        {/* 上箭头 */}
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={safeIndex === 0}
          className="player-text-muted hover:player-accent-text disabled:opacity-20 mb-2 text-3xl transition-colors"
          aria-label="上一个"
        >
          ▲
        </button>

        {/* 窗口（5 个数字，中间高亮） */}
        <div
          className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-8 py-4"
          style={{
            minWidth: '180px',
            height: '180px',
            borderColor: 'hsl(var(--p-accent-border))',
            background: 'hsl(var(--p-surface))',
            overflow: 'hidden',
          }}
        >
          {getWindow().map((item) => {
            const distance = Math.abs(item.offset);
            const isActive = item.offset === 0;
            return (
              <div
                key={item.value}
                className="select-none transition-all"
                style={{
                  fontSize: isActive ? '32px' : distance === 1 ? '20px' : '16px',
                  fontWeight: isActive ? 900 : 400,
                  opacity: isActive ? 1 : distance === 1 ? 0.5 : 0.25,
                  color: isActive ? 'hsl(var(--p-accent))' : 'hsl(var(--p-text-muted))',
                  lineHeight: '1.2',
                }}
              >
                {item.value}{unit ?? ''}
              </div>
            );
          })}
        </div>

        {/* 下箭头 */}
        <button
          type="button"
          onClick={() => move(1)}
          disabled={safeIndex === allValues.length - 1}
          className="player-text-muted hover:player-accent-text disabled:opacity-20 mt-2 text-3xl transition-colors"
          aria-label="下一个"
        >
          ▼
        </button>
      </div>

      {np.hint && (
        <p className="player-text-muted text-xs">{np.hint}</p>
      )}

      <PrimaryButton onClick={() => submitNumberPicker(value)}>
        {t('player.submit')}
      </PrimaryButton>
    </StageShell>
  );
}

export const NumberPickerStage = memo(NumberPickerStageImpl);
