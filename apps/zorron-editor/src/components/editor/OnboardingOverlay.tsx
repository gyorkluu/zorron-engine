/**
 * OnboardingOverlay - first-time user onboarding tutorial.
 *
 * A 3-step guided tour that highlights the editor's core areas:
 * node palette (left), inspector (right), and toolbar preview (top).
 * Completion is persisted to localStorage so it only shows once.
 */

import { memo, useCallback, useState } from 'react';
import { useT } from '@/i18n/useT';
import { cn } from '@/lib/utils';
import type { TranslationKey } from '@/i18n/translations';

/** localStorage key tracking onboarding completion. */
const ONBOARDING_KEY = 'zorron.onboarding.completed';

/** Total number of onboarding steps. */
const TOTAL_STEPS = 3;

/** Props for OnboardingOverlay. */
export interface OnboardingOverlayProps {
  /** Called when the user dismisses the onboarding (skip or done). */
  onDismiss: () => void;
}

/** Step definition. */
interface OnboardingStep {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  /** Tailwind classes for the highlight box position/size. */
  highlight: string;
}

/** Highlight positions match the editor layout (toolbar h-12, AssetPanel w-64, InspectorPanel w-80). */
const STEPS: OnboardingStep[] = [
  {
    titleKey: 'onboarding.step1.title',
    bodyKey: 'onboarding.step1.body',
    highlight: 'left-0 top-12 bottom-0 w-64',
  },
  {
    titleKey: 'onboarding.step2.title',
    bodyKey: 'onboarding.step2.body',
    highlight: 'right-0 top-12 bottom-0 w-80',
  },
  {
    titleKey: 'onboarding.step3.title',
    bodyKey: 'onboarding.step3.body',
    highlight: 'right-0 top-0 h-12 w-72',
  },
];

function OnboardingOverlayImpl({ onDismiss }: OnboardingOverlayProps) {
  const { t } = useT();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      onDismiss();
    } else {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  }, [isLast, onDismiss]);

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/60">
      {/* Highlight box for the current step's target area. */}
      <div
        className={cn(
          'pointer-events-none absolute rounded-lg ring-2 ring-cyan-400 transition-all duration-300',
          current.highlight,
        )}
      />

      {/* Center card. */}
      <div className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h2 className="mb-1 text-lg font-bold text-slate-100">{t('onboarding.welcome')}</h2>
        <h3 className="mb-2 text-base font-semibold text-cyan-300">{t(current.titleKey)}</h3>
        <p className="mb-6 text-sm leading-relaxed text-slate-300">{t(current.bodyKey)}</p>

        {/* Footer: step indicator + buttons. */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            {t('onboarding.skip')}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {t('onboarding.step', { n: step + 1, total: TOTAL_STEPS })}
            </span>
            {step > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                {t('onboarding.prev')}
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="rounded-md border border-cyan-600/50 bg-cyan-600/20 px-4 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-600/30"
            >
              {isLast ? t('onboarding.done') : t('onboarding.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const OnboardingOverlay = memo(OnboardingOverlayImpl);

/** Return value of useOnboarding. */
interface UseOnboardingResult {
  /** Whether the onboarding should be shown. */
  show: boolean;
  /** Mark onboarding as completed and hide it. */
  dismiss: () => void;
  /** Clear the completion flag and show onboarding again. */
  reopen: () => void;
}

/**
 * Hook controlling onboarding visibility via localStorage.
 *
 * @returns Visibility state and control functions.
 */
export function useOnboarding(): UseOnboardingResult {
  const [show, setShow] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ONBOARDING_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch {
      // Ignore storage errors (e.g. private mode).
    }
    setShow(false);
  }, []);

  const reopen = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_KEY);
    } catch {
      // Ignore storage errors.
    }
    setShow(true);
  }, []);

  return { show, dismiss, reopen };
}
