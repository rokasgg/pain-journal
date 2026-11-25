import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deviceLocale } from '@/lib/i18n/deviceLocale';

export type Locale = 'en' | 'lt';

interface LocaleState {
  locale: Locale;
  // true once the user picked a language (login switch or Settings). Until
  // then the app follows the phone's language.
  chosen: boolean;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: deviceLocale(),
      chosen: false,
      setLocale: (locale) => set({ locale, chosen: true }),
    }),
    {
      name: 'locale-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // v0 stored only `locale`, defaulting to 'en'. A stored 'lt' must have
      // been picked; a stored 'en' may just be the old default.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<LocaleState>;
        if (version === 0) return { locale: state.locale ?? 'en', chosen: state.locale === 'lt' } as LocaleState;
        return state as LocaleState;
      },
      // Nothing chosen yet: follow the phone (also if it changed since).
      onRehydrateStorage: () => (state) => {
        if (state && !state.chosen) {
          const locale = deviceLocale();
          if (state.locale !== locale) useLocaleStore.setState({ locale });
        }
      },
    },
  ),
);
