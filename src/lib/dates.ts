import { differenceInCalendarDays, format, parseISO } from 'date-fns';

// checkin_date / injury_started_on are plain `date` columns — always derive
// them from local wall-clock time, never `toISOString()` (UTC), which can
// roll over to the wrong day near midnight in most timezones.
export function todayLocalDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatCheckinDate(dateStr: string): string {
  return format(parseISO(dateStr), 'EEE, MMM d');
}

export function daysSince(dateStr: string): number {
  return differenceInCalendarDays(new Date(), parseISO(dateStr));
}
