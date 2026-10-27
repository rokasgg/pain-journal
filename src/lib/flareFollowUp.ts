import { differenceInMinutes, setHours, startOfDay, subDays } from 'date-fns';

// Morning check-in → "Ar jis dar tęsiasi?" follow-up for a recent flare-up
// (design: assets/possible-app-design/check-in-morning/flare.html).

export type EndWindow = 'evening' | 'night' | 'morning' | 'unknown';

export const END_WINDOWS: readonly EndWindow[] = ['evening', 'night', 'morning', 'unknown'];

// "Kada maždaug praėjo?" is a rough window, so it becomes a rough end time:
// yesterday evening ≈ 21:00, during the night ≈ 03:00, this morning ≈ 07:00.
// "Nežinau", or a window that falls before the flare began, gives no duration
// (null) rather than an invented one.
const END_HOURS: Record<Exclude<EndWindow, 'unknown'>, { daysAgo: number; hour: number }> = {
  evening: { daysAgo: 1, hour: 21 },
  night: { daysAgo: 0, hour: 3 },
  morning: { daysAgo: 0, hour: 7 },
};

export function estimatedDurationMinutes(window: EndWindow, occurredAt: Date, now: Date): number | null {
  if (window === 'unknown') return null;
  const { daysAgo, hour } = END_HOURS[window];
  const end = setHours(startOfDay(subDays(now, daysAgo)), hour);
  const minutes = differenceInMinutes(end, occurredAt);
  return minutes > 0 ? minutes : null;
}

// "45 min." / "15 val." / "3 d." — units come from i18n. Shown on the
// "Tęsiasi 15 val." pill.
export function formatElapsed(minutes: number, units: { minutes: string; hours: string; days: string }): string {
  const safe = Math.max(0, minutes);
  if (safe < 60) return `${safe} ${units.minutes}`;
  const hours = Math.floor(safe / 60);
  if (hours < 48) return `${hours} ${units.hours}`;
  return `${Math.floor(hours / 24)} ${units.days}`;
}
