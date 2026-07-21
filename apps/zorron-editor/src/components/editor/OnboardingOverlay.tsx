/**
 * OnboardingOverlay - first-time user onboarding tutorial.
 */

import { memo, useCallback, useState } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, X, Zap, Blocks, Settings, type LucideIcon } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { EmptyStateIllustration } from '@/components/brand/EmptyStateIllustration';
import type { TranslationKey } from '@/i18n/translations';

const ONBOARDING_KEY = 'zorron.onboarding.completed';
const TOTAL_STEPS = 3;

export interface OnboardingOverlayProps {
  onDismiss: () => void;
}

interface OnboardingStep {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  highlight: string;
  icon: LucideIcon;
}

const STEP_ICONS = [Blocks, Settings, Zap];

const STEPS: OnboardingStep[] = [
  {
    titleKey: 'onboarding.step1.title',
    bodyKey: 'onboarding.step1.body',
    highlight: 'left-0 top-12 bottom-0 w-64',
    icon: Blocks,
  },
  {
    titleKey: 'onboarding.step2.title',
    bodyKey: 'onboarding.step2.body',
    highlight: 'right-0 top-12 bottom-0 w-80',
    icon: Settings,
  },
  {
    titleKey: 'onboarding.step3.title',
    bodyKey: 'onboarding.step3.body',
    highlight: 'right-0 top-0 h-12 w-72',
    icon: Zap,
  },
];

function OnboardingOverlayImpl({ onDismiss }: OnboardingOverlayProps) {
  const { t } = useT();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const StepIcon = STEP_ICONS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) onDismiss();
    else setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [isLast, onDismiss]);

  const handlePrev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
      <div
        className={cn(
          'pointer-events-none absolute rounded-xl ring-2 ring-cyan-400/80 transition-all duration-500 ease-out',
          'shadow-[0_0_40px_rgba(34,211,238,0.2)]',
          current.highlight,
        )}
      >
        <div className="absolute inset-0 rounded-xl bg-cyan-400/5" />
        <div className="absolute inset-0 rounded-xl animate-pulse" style={{ boxShadow: '0 0 20px rgba(34,211,238,0.3) inset' }} />
      </div>

      <div className="absolute left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-4">
        <div className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl">
          {/* Decorative gradients */}
          <div className="pointer-events-none absolute -top-32 -right-32 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-2xl" />

          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-5 top-5 z-10 rounded-lg p-2 text-slate-500 transition-all hover:bg-slate-800/80 hover:text-slate-300"
          >
            <X size={18} />
          </button>

          <div className="relative">
            {/* Hero illustration on first step */}
            {step === 0 && (
              <div className="mb-6 -mt-2">
                <EmptyStateIllustration
                  illustration="welcome-hero"
                  alt="Welcome"
                  aspectRatio="video"
                  className="mx-auto w-full max-w-sm opacity-90"
                />
              </div>
            )}

            <div className="mb-5 flex items-center gap-3">
              <BrandLogo size={30} showText={false} />
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-200 via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                  {t('onboarding.welcome')}
                </h2>
                <p className="text-xs text-slate-500">{t('onboarding.step', { n: step + 1, total: TOTAL_STEPS })}</p>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/15 ring-1 ring-cyan-500/25 shadow-lg shadow-cyan-500/5">
                <StepIcon size={22} className="text-cyan-300" />
              </div>
              <h3 className="text-base font-bold text-slate-100">{t(current.titleKey)}</h3>
            </div>

            <p className="mb-6 text-sm leading-relaxed text-slate-400">{t(current.bodyKey)}</p>

            <div className="mb-6 flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all duration-500',
                    i < step ? 'bg-gradient-to-r from-cyan-400 to-indigo-400 opacity-60' :
                    i === step ? 'bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 shadow-sm shadow-cyan-500/30' :
                    'bg-slate-700/60',
                  )}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-300"
              >
                {t('onboarding.skip')}
              </button>

              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-700/60 active:scale-[0.97]"
                  >
                    <ChevronLeft size={12} />
                    {t('onboarding.prev')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-xs font-semibold transition-all active:scale-[0.97] shadow-lg',
                    isLast
                      ? 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 text-white shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:shadow-xl'
                      : 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 hover:border-cyan-400/50 shadow-cyan-500/10',
                  )}
                >
                  {isLast ? (
                    <>
                      <Sparkles size={12} />
                      {t('onboarding.done')}
                    </>
                  ) : (
                    <>
                      {t('onboarding.next')}
                      <ChevronRight size={12} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const OnboardingOverlay = memo(OnboardingOverlayImpl);

interface UseOnboardingResult {
  show: boolean;
  dismiss: () => void;
  reopen: () => void;
}

export function useOnboarding(): UseOnboardingResult {
  const [show, setShow] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ONBOARDING_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const dismiss = useCallback(() => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    setShow(false);
  }, []);

  const reopen = useCallback(() => {
    try { localStorage.removeItem(ONBOARDING_KEY); } catch {}
    setShow(true);
  }, []);

  return { show, dismiss, reopen };
}
