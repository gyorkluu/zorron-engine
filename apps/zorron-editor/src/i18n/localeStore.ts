/**
 * Locale state store (Zustand).
 *
 * Persists the user's language choice to localStorage.
 * Chinese ('zh') is the default locale.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from './translations';

const STORAGE_KEY = 'zorron-locale';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggle: () => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: 'zh',
      setLocale: (locale) => set({ locale }),
      toggle: () => set({ locale: get().locale === 'zh' ? 'en' : 'zh' }),
    }),
    { name: STORAGE_KEY },
  ),
);
