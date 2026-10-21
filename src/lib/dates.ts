import { differenceInCalendarDays, differenceInMinutes, format, parseISO } from 'date-fns';
import { enUS, lt } from 'date-fns/locale';

import { useLocaleStore, type Locale } from '@/store/useLocaleStore';

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

// Standalone heading date: "Wednesday, 21 October" / "Trečiadienis, spalio 21 d.".
// Lithuanian needs the nominative weekday (`cccc`, not `EEEE`, which gives the
// accusative "trečiadienį") and the genitive month (`MMMM`). Not Intl:
// toLocaleDateString('lt') orders it "spalio 21 d., trečiadienis".
const HEADING_DATE_PATTERNS: Record<Locale, string> = {
  en: 'EEEE, d MMMM',
  lt: "cccc, MMMM d 'd.'",
};

// Takes the locale explicitly, so components pass the reactive `locale` from
// useTranslation() and the React Compiler re-renders it on a language switch.
export function formatHeadingDate(date: Date, locale: Locale): string {
  return capitalize(format(date, HEADING_DATE_PATTERNS[locale], { locale: DATE_FNS_LOCALES[locale] }));
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
  return toLocalDate(dateStr) === todayLocalDate();
}

// Converts any ISO timestamp (e.g. exercise_logs.logged_at, a timestamptz)
// to its local calendar-day string — the general form of the check `isToday`
// does above, exposed for callers that need to bucket timestamps by local
// day rather than just compare against today (e.g. building a Set of
// exercised dates for a calendar widget).
export function toLocalDate(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy-MM-dd');
}
