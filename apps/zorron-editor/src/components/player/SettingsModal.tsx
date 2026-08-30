/**
 * SettingsModal — GalGame configuration dialog.
 *
 * Exposes text speed, per-track volumes and the Auto/Skip behaviours. Values
 * persist through `galgameStore` so preferences survive reloads and carry
 * across projects.
 */

import { memo } from 'react';
import { X, RotateCcw, Settings2 } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { useGalgameStore } from '@/stores/galgameStore';
import { cn } from '@/lib/utils';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Slider row bound to a single numeric setting. */
function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-200">{label}</span>
        <span className="font-mono text-[11px] text-cyan-300">
          {value}
          {suffix ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-400"
      />
    </label>
  );
}

/** Switch row bound to a single boolean setting. */
function SettingToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2.5 text-left transition-colors hover:border-slate-600 hover:bg-slate-900/80"
    >
      <span className="min-w-0">
        <span className="block text-xs font-medium text-slate-200">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">
            {hint}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'relative h-5 w-9 flex-shrink-0 rounded-full transition-colors',
          checked ? 'bg-cyan-500' : 'bg-slate-600',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}

function SettingsModalImpl({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useT();
  const settings = useGalgameStore((s) => s.settings);
  const updateSettings = useGalgameStore((s) => s.updateSettings);
  const resetSettings = useGalgameStore((s) => s.resetSettings);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">{t('settings.title')}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t('settings.section.text')}
            </h4>
            <SettingSlider
              label={t('settings.textSpeed')}
              value={settings.textSpeedMs}
              min={0}
              max={120}
              step={5}
              suffix=" ms/字"
              onChange={(v) => updateSettings({ textSpeedMs: v })}
            />
            <SettingSlider
              label={t('settings.autoDelay')}
              value={settings.autoDelayMs}
              min={0}
              max={4000}
              step={100}
              suffix=" ms"
              onChange={(v) => updateSettings({ autoDelayMs: v })}
            />
          </section>

          <section className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t('settings.section.volume')}
            </h4>
            <SettingSlider
              label={t('settings.volume.bgm')}
              value={Math.round(settings.bgmVolume * 100)}
              min={0}
              max={100}
              step={5}
              suffix="%"
              onChange={(v) => updateSettings({ bgmVolume: v / 100 })}
            />
            <SettingSlider
              label={t('settings.volume.voice')}
              value={Math.round(settings.voiceVolume * 100)}
              min={0}
              max={100}
              step={5}
              suffix="%"
              onChange={(v) => updateSettings({ voiceVolume: v / 100 })}
            />
            <SettingSlider
              label={t('settings.volume.sfx')}
              value={Math.round(settings.sfxVolume * 100)}
              min={0}
              max={100}
              step={5}
              suffix="%"
              onChange={(v) => updateSettings({ sfxVolume: v / 100 })}
            />
            <SettingSlider
              label={t('settings.volume.ambient')}
              value={Math.round(settings.ambientVolume * 100)}
              min={0}
              max={100}
              step={5}
              suffix="%"
              onChange={(v) => updateSettings({ ambientVolume: v / 100 })}
            />
          </section>

          <section className="space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t('settings.section.behaviour')}
            </h4>
            <SettingToggle
              label={t('settings.skipRead')}
              hint={t('settings.skipRead.hint')}
              checked={settings.skipRead}
              onChange={(v) => updateSettings({ skipRead: v })}
            />
            <SettingToggle
              label={t('settings.autoStopOnChoice')}
              hint={t('settings.autoStopOnChoice.hint')}
              checked={settings.autoStopOnChoice}
              onChange={(v) => updateSettings({ autoStopOnChoice: v })}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3">
          <button
            type="button"
            onClick={resetSettings}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <RotateCcw size={12} />
            {t('settings.reset')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-cyan-500/20 px-4 py-1.5 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/30"
          >
            {t('settings.done')}
          </button>
        </div>
      </div>
    </div>
  );
}

export const SettingsModal = memo(SettingsModalImpl);
