import { differenceInCalendarDays, differenceInMinutes, format, parseISO } from 'date-fns';
import { enUS, lt } from 'date-fns/locale';

import { useLocaleStore } from '@/store/useLocaleStore';

// checkin_date / injury_started_on are plain `date` columns — always derive
// them from local wall-clock time, never `toISOString()` (UTC), which can
// roll over to the wrong day near midnight in most timezones.
export function todayLocalDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export const DATE_FNS_LOCALES = { en: enUS, lt } as const;

// Non-reactive, like `t()` in useTranslation.ts — safe to call from plain
// utils/hooks that aren't React components, at the cost of not re-rendering
// on locale change on its own (callers that need that already re-render via
// useTranslation()/useLocaleStore elsewhere).
export function currentDateFnsLocale() {
  return DATE_FNS_LOCALES[useLocaleStore.getState().locale];
}

// date-fns's `lt` locale lowercases weekday/month names (e.g. "tr, rugp. 26") — capitalize
// the first letter so formatted dates read correctly regardless of locale.
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatCheckinDate(dateStr: string): string {
  return capitalize(format(parseISO(dateStr), 'EEE, MMM d', { locale: currentDateFnsLocale() }));
}

export function formatMonthDay(date: Date | string): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  return capitalize(format(parsed, 'MMM d', { locale: currentDateFnsLocale() }));
}

// Monday-first single-letter weekday headers for calendar grids.
export const WEEKDAY_LABELS_BY_LOCALE = {
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  lt: ['P', 'A', 'T', 'K', 'P', 'Š', 'S'],
} as const;

export function daysSince(dateStr: string): number {
  return differenceInCalendarDays(new Date(), parseISO(dateStr));
}

export function minutesSince(dateStr: string): number {
  return differenceInMinutes(new Date(), parseISO(dateStr));
}

export function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), 'HH:mm');
}

// Whether an ISO timestamp falls on today's local calendar day — used to
// find "today's" exercise_logs row without a timezone-unsafe date-range
// query (logged_at is a timestamptz; comparing the local formatted date
// after fetch avoids the UTC-boundary bugs toISOString() range queries
// would introduce, same reasoning as todayLocalDate() above).
export function isToday(dateStr: string): boolean {
  return format(parseISO(dateStr), 'yyyy-MM-dd') === todayLocalDate();
}
