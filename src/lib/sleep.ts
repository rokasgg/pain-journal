import { setHours, startOfDay, subDays } from 'date-fns';

// Morning check-in sleep helpers: the −/+ duration stepper and the Apple
// Health sleep summary shown in its place (design:
// assets/possible-app-design/check-in-morning).

// ── Stepper ──
const STEP_MINUTES = 30;
// What the first tap lands on when nothing is answered yet (the card shows
// "—" until then, so an untouched field is never saved).
export const SLEEP_START_HOURS = 7.5;

export function splitHours(value: number): { hours: number; minutes: number } {
  const total = Math.round(value * 60);
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

export function stepSleepHours(value: number | null, direction: 1 | -1, maxHours: number): number {
  if (value === null) return SLEEP_START_HOURS;
  const next = Math.round(value * 60) + direction * STEP_MINUTES;
  return Math.min(maxHours, Math.max(0, next / 60));
}

// "7 val. 30 min." / "8 val." — units come from i18n.
export function formatDuration(totalMinutes: number, units: { hours: string; minutes: string }): string {
  const { hours, minutes } = splitHours(totalMinutes / 60);
  return minutes === 0 ? `${hours} ${units.hours}` : `${hours} ${units.hours} ${minutes} ${units.minutes}`;
}

// ── Apple Health ──
export interface HealthSleep {
  // Time actually asleep (what `sleep_hours` is filled from).
  asleepMinutes: number;
  // Time in bed, when the source reports it.
  inBedMinutes: number | null;
  // Start of the sleep and wake-up time, ISO timestamps.
  start: string;
  end: string;
  // When the health data was last synced, ISO timestamp.
  updatedAt: string;
}

export function healthAsleepHours(sleep: HealthSleep): number {
  return Math.round((sleep.asleepMinutes / 60) * 100) / 100;
}

// The night bar spans 21:00 → 09:00.
const TIMELINE_START_HOUR = 21;
const TIMELINE_HOURS = 12;

export interface TimelineSegment {
  leftPct: number;
  widthPct: number;
}

// Where the sleep sits on the 21:00–09:00 bar, as percentages. A sleep that
// starts before 21:00 (or after midnight) is anchored to the right evening
// and clamped to the bar.
export function timelineSegment(start: Date, end: Date): TimelineSegment {
  // Starting in the afternoon/evening → that day's 21:00; starting after
  // midnight (before noon) → the previous evening's 21:00.
  const eveningOfStartDay = setHours(startOfDay(start), TIMELINE_START_HOUR);
  const anchor = start.getHours() >= 12 ? eveningOfStartDay : subDays(eveningOfStartDay, 1);
  const windowMs = TIMELINE_HOURS * 60 * 60 * 1000;
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const left = clamp((start.getTime() - anchor.getTime()) / windowMs);
  const right = clamp((end.getTime() - anchor.getTime()) / windowMs);
  return { leftPct: left * 100, widthPct: Math.max(0, right - left) * 100 };
}

// Axis labels under the bar.
export const TIMELINE_AXIS = ['21:00', '03:00', '09:00'] as const;
