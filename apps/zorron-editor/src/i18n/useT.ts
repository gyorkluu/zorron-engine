/**
 * Translation hook — returns a `t()` function bound to the current locale.
 *
 * @example
 * const { t } = useT();
 * return <h1>{t('palette.title')}</h1>;
 * // Chinese (default): "节点面板"
 * // English: "NODE PALETTE"
 *
 * // With interpolation:
 * t('choices.title', { n: 3 });  // "选项（3）" / "CHOICES (3)"
 */

import { useLocaleStore } from './localeStore';
import { translations, interpolate, type TranslationKey } from './translations';

export function useT() {
  const locale = useLocaleStore((s) => s.locale);

  function t(key: TranslationKey, params?: Record<string, string | number>): string {
    const entry = translations[key];
    if (!entry) return key;
    return interpolate(entry[locale], params);
  }

  return { t, locale };
}

/**
 * Non-hook version for use outside React components
 * (e.g., in type defaults, utility functions).
 */
export function tt(key: TranslationKey, params?: Record<string, string | number>): string {
  const locale = useLocaleStore.getState().locale;
  const entry = translations[key];
  if (!entry) return key;
  return interpolate(entry[locale], params);
}
