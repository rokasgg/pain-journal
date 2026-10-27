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

// Calendar month title: "October 2026" / "2026 m. spalis" (standalone month).
const MONTH_TITLE_PATTERNS: Record<Locale, string> = {
  en: 'LLLL yyyy',
  lt: "yyyy 'm.' LLLL",
};

export function formatMonthTitle(date: Date, locale: Locale): string {
  return format(date, MONTH_TITLE_PATTERNS[locale], { locale: DATE_FNS_LOCALES[locale] });
}

// Day without weekday, for screen-reader labels: "19 October" / "Spalio 19 d."
const DAY_LABEL_PATTERNS: Record<Locale, string> = {
  en: 'd MMMM',
  lt: "MMMM d 'd.'",
};

export function formatDayLabel(date: Date, locale: Locale, capitalized = true): string {
  const text = format(date, DAY_LABEL_PATTERNS[locale], { locale: DATE_FNS_LOCALES[locale] });
  return capitalized ? capitalize(text) : text;
}

// Compact day: "13 Oct" / "spal. 13 d."
const SHORT_DAY_LABEL_PATTERNS: Record<Locale, string> = {
  en: 'd MMM',
  lt: "MMM d 'd.'",
};

export function formatShortDayLabel(date: Date, locale: Locale): string {
  return format(date, SHORT_DAY_LABEL_PATTERNS[locale], { locale: DATE_FNS_LOCALES[locale] });
}

// Inclusive day range: "21–27 October" / "spalio 21–27 d.", or across a
// month boundary "28 October – 3 November" / "spalio 28 d. – lapkričio 3 d.".
export function formatDateRange(from: Date, to: Date, locale: Locale): string {
  const options = { locale: DATE_FNS_LOCALES[locale] };
  const sameMonth = format(from, 'yyyy-MM') === format(to, 'yyyy-MM');
  if (locale === 'lt') {
    return sameMonth
      ? `${format(from, 'MMMM', options)} ${format(from, 'd')}–${format(to, 'd')} d.`
      : `${format(from, "MMMM d 'd.'", options)} – ${format(to, "MMMM d 'd.'", options)}`;
  }
  return sameMonth
    ? `${format(from, 'd')}–${format(to, 'd MMMM', options)}`
    : `${format(from, 'd MMMM', options)} – ${format(to, 'd MMMM', options)}`;
}

// One decimal with the locale's separator: "1.5" / "1,5".
export function formatOneDecimal(value: number, locale: Locale): string {
  const text = value.toFixed(1);
  return locale === 'lt' ? text.replace('.', ',') : text;
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
