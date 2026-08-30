/**
 * PlayerControlBar — the GalGame playback toolbar.
 *
 * Owns the Auto and Skip schedulers: Auto waits out each frame using voice
 * duration when available, Skip fast-forwards and self-disengages the moment it
 * meets unread dialogue. It also records read state and exposes step-back.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  Undo2,
  BookOpen,
  Save,
  Download,
  Settings2,
  FastForward,
  PlayCircle,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { useGalgameStore } from '@/stores/galgameStore';
import {
  autoAdvance,
  computeAutoDelayMs,
  skipStep,
} from '@/engine/galgame';
import { useT } from '@/i18n/useT';
import { cn } from '@/lib/utils';

/** Interval between skip steps while fast-forwarding. */
const SKIP_TICK_MS = 90;

export interface PlayerControlBarProps {
  /** Open the dialogue history drawer. */
  onOpenBacklog: () => void;
  /** Open the save dialog. */
  onOpenSave: () => void;
  /** Open the load dialog. */
  onOpenLoad: () => void;
}

export function PlayerControlBar({
  onOpenBacklog,
  onOpenSave,
  onOpenLoad,
}: PlayerControlBarProps) {
  const engine = usePlayerStore((s) => s.engine);
  const { t } = useT();
  const state = usePlayerStore((s) => s.state);

  const settings = useGalgameStore((s) => s.settings);
  const autoMode = useGalgameStore((s) => s.autoMode);
  const skipMode = useGalgameStore((s) => s.skipMode);
  const setAuto = useGalgameStore((s) => s.setAuto);
  const setSkip = useGalgameStore((s) => s.setSkip);
  const toggleAuto = useGalgameStore((s) => s.toggleAuto);
  const setSettingsOpen = useGalgameStore((s) => s.setSettingsOpen);
  const markRead = useGalgameStore((s) => s.markRead);
  const isRead = useGalgameStore((s) => s.isRead);
  const resetModes = useGalgameStore((s) => s.resetModes);

  /** Bumped whenever the engine advances, so `canGoBack()` is re-evaluated. */
  const frameKey = state?.currentNodeId ?? '';
  const canGoBack = useRef(false);
  canGoBack.current = engine?.canGoBack() ?? false;

  // Leave Auto/Skip when the player exits or the component unmounts.
  useEffect(() => () => resetModes(), [resetModes]);

  // Record read state so Skip knows what it may fast-forward through.
  useEffect(() => {
    if (state?.currentNodeId) markRead(state.currentNodeId);
  }, [state?.currentNodeId, markRead]);

  // Auto: wait out the current frame, then advance. Each advance changes
  // `state`, which reschedules this effect for the next frame.
  useEffect(() => {
    if (!autoMode || !engine || !state || state.isFinished) return;

    const dialogue = state.stage?.interaction?.dialogue;
    const delay = computeAutoDelayMs(dialogue, settings);

    const timer = window.setTimeout(() => {
      const moved = autoAdvance(engine, state, settings);
      // Input nodes and choices can't be answered for the player.
      if (!moved) setAuto(false);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [autoMode, engine, state, settings, setAuto]);

  // Skip: fast-forward until unread dialogue or an unskippable node.
  useEffect(() => {
    if (!skipMode || !engine || !state || state.isFinished) return;

    const timer = window.setTimeout(() => {
      const result = skipStep(engine, state, settings, isRead);
      if (result !== 'advanced') setSkip(false);
    }, SKIP_TICK_MS);

    return () => window.clearTimeout(timer);
  }, [skipMode, engine, state, settings, isRead, setSkip]);

  const handleBack = useCallback(() => {
    // Disengage Auto/Skip so the player stays where they stepped back to.
    resetModes();
    engine?.goBack();
  }, [engine, resetModes]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 sm:p-4">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-slate-700/50 bg-slate-950/85 p-1.5 shadow-2xl backdrop-blur-md">
        <ControlButton
          label={t('control.back')}
          title={t('control.back.tip')}
          onClick={handleBack}
          disabled={!canGoBack.current}
        >
          <Undo2 size={14} />
        </ControlButton>

        <ControlButton
          label={t('control.auto')}
          title={t('control.auto.tip')}
          active={autoMode}
          onClick={toggleAuto}
        >
          <PlayCircle size={14} />
        </ControlButton>

        <ControlButton
          label={t('control.skip')}
          title={t('control.skip.tip')}
          active={skipMode}
          onPressStart={() => setSkip(true)}
          onPressEnd={() => setSkip(false)}
          hideLabel
        >
          <FastForward size={14} />
        </ControlButton>

        <Divider />

        <ControlButton label={t('control.backlog')} title={t('control.backlog.tip')} onClick={onOpenBacklog}>
          <BookOpen size={14} />
        </ControlButton>
        <ControlButton label={t('control.save')} title={t('control.save.tip')} onClick={onOpenSave}>
          <Save size={14} />
        </ControlButton>
        <ControlButton label={t('control.load')} title={t('control.load.tip')} onClick={onOpenLoad}>
          <Download size={14} />
        </ControlButton>

        <Divider />

        <ControlButton
          label={t('control.settings')}
          title={t('settings.title')}
          hideLabel
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 size={14} />
        </ControlButton>
      </div>
      {/* Referenced so the toolbar re-renders as frames advance. */}
      <span className="hidden">{frameKey}</span>
    </div>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-slate-700/60" />;
}

/** A single toolbar button, optionally driven by press-and-hold. */
function ControlButton({
  label,
  title,
  active = false,
  disabled = false,
  hideLabel = false,
  onClick,
  onPressStart,
  onPressEnd,
  children,
}: {
  label: string;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  onClick?: () => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
  children: React.ReactNode;
}) {
  const handleDown = () => {
    if (disabled) return;
    onPressStart?.();
    if (!onPressStart) onClick?.();
  };

  const handleUp = () => {
    if (disabled) return;
    onPressEnd?.();
  };

  return (
    <button
      type="button"
      title={title ?? label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerLeave={handleUp}
      onPointerCancel={handleUp}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-all',
        disabled
          ? 'cursor-not-allowed text-slate-600'
          : active
            ? 'bg-cyan-500/25 text-cyan-200 ring-1 ring-cyan-400/50'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white',
      )}
    >
      {children}
      {hideLabel ? null : <span>{label}</span>}
    </button>
  );
}
