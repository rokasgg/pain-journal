import type { Locale } from '@/store/useLocaleStore';

// The app language for a phone's preferred languages (first match wins,
// highest preference first): Lithuanian → lt, anything else → en.
export function pickLocale(languageCodes: (string | null | undefined)[]): Locale {
  const first = languageCodes.find((code): code is string => !!code);
  return first?.toLowerCase().startsWith('lt') ? 'lt' : 'en';
}

// The phone's language, read once. Synchronous (the locale store needs it
// when it's created) and guarded: builds without the expo-localization native
// module, and tests, just fall back to English.
export function deviceLocale(): Locale {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLocales } = require('expo-localization') as typeof import('expo-localization');
    return pickLocale(getLocales().map((l) => l.languageCode));
  } catch {
    return 'en';
  }
}
