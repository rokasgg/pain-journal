import { useLocaleStore, type Locale } from '@/store/useLocaleStore';

import { en } from './translations/en';
import { lt } from './translations/lt';

type Dict = typeof en;

function resolve(dict: Dict, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), dict);
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  let result = str;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{{${key}}}`, String(value));
  }
  return result;
}

export function translate(locale: Locale, path: string, vars?: Record<string, string | number>): string {
  const dict = locale === 'lt' ? lt : en;
  const value = resolve(dict, path);
  const str = typeof value === 'string' ? value : path;
  return interpolate(str, vars);
}

/**
 * Non-reactive translation lookup for use outside component render (Zustand
 * store actions, plain utils) where hooks aren't available. Reads the
 * current locale directly from the store rather than subscribing to it.
 */
export function t(path: string, vars?: Record<string, string | number>): string {
  return translate(useLocaleStore.getState().locale, path, vars);
}

export function useTranslation() {
  const locale = useLocaleStore((state) => state.locale);

  const translateFn = (path: string, vars?: Record<string, string | number>): string =>
    translate(locale, path, vars);

  return { t: translateFn, locale };
}
