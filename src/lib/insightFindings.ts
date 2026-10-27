import { format, parseISO, subDays } from 'date-fns';

import type { Checkin } from '@/types/database.types';

// Insights tab → "This week's insights". Plain arithmetic over the user's own
// check-ins (no AI, no running cost), like trainingInsights.ts. Each finding
// says how many entries it rests on, and returns `notEnough` instead of a
// made-up pattern when the data is thin. Wording describes, never claims a
// cause (the app's no-diagnosis rule).

// Rolling, not Monday-to-today: early in the week that would leave almost
// nothing to compare.
export const FINDINGS_WINDOW_DAYS = 7;
const MIN_PER_SLOT = 3; // mornings and evenings each
const MIN_NIGHTS_PER_SIDE = 2; // poor and good nights each
// Below this, morning vs evening reads as "about the same".
const SIMILAR_SLOT_GAP = 0.3;
// Sleep groups are small, so they need a bigger gap to count as a difference.
const SIMILAR_SLEEP_GAP = 0.5;
// A "poor night": quality 0–4 when answered, otherwise under 7 hours.
const POOR_SLEEP_QUALITY_MAX = 4;
const POOR_SLEEP_HOURS_BELOW = 7;

export interface FindingsWindow {
  from: string; // yyyy-MM-dd, inclusive
  to: string; // yyyy-MM-dd, inclusive (today)
}

export function findingsWindow(today: string): FindingsWindow {
  return { from: format(subDays(parseISO(today), FINDINGS_WINDOW_DAYS - 1), 'yyyy-MM-dd'), to: today };
}

type InWindow = Pick<Checkin, 'checkin_date' | 'type' | 'pain_level' | 'sleep_quality' | 'sleep_hours'>;

function inWindow<T extends Pick<Checkin, 'checkin_date'>>(checkins: T[], window: FindingsWindow): T[] {
  return checkins.filter((c) => c.checkin_date >= window.from && c.checkin_date <= window.to);
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export type NotEnough = { status: 'notEnough'; needed: number };

export type MorningVsEvening =
  | {
      status: 'ready';
      morning: number;
      evening: number;
      // morning − evening, rounded to what's shown
      diff: number;
      direction: 'morningHigher' | 'eveningHigher' | 'similar';
      entries: number;
    }
  | NotEnough;

export function morningVsEvening(checkins: InWindow[], today: string): MorningVsEvening {
  const recent = inWindow(checkins, findingsWindow(today));
  const mornings = recent.filter((c) => c.type === 'morning').map((c) => c.pain_level);
  const evenings = recent.filter((c) => c.type === 'evening').map((c) => c.pain_level);
  const needed = Math.max(0, MIN_PER_SLOT - mornings.length) + Math.max(0, MIN_PER_SLOT - evenings.length);
  if (needed > 0) return { status: 'notEnough', needed };

  const morning = mean(mornings);
  const evening = mean(evenings);
  const diff = morning - evening;
  return {
    status: 'ready',
    morning,
    evening,
    diff,
    direction: Math.abs(diff) < SIMILAR_SLOT_GAP ? 'similar' : diff > 0 ? 'morningHigher' : 'eveningHigher',
    entries: mornings.length + evenings.length,
  };
}

export function isPoorNight(checkin: Pick<Checkin, 'sleep_quality' | 'sleep_hours'>): boolean | null {
  if (checkin.sleep_quality != null) return checkin.sleep_quality <= POOR_SLEEP_QUALITY_MAX;
  if (checkin.sleep_hours != null) return checkin.sleep_hours < POOR_SLEEP_HOURS_BELOW;
  return null; // sleep not answered — doesn't count either way
}

export type SleepVsMorningPain =
  | {
      status: 'ready';
      afterPoor: number;
      afterGood: number;
      direction: 'higher' | 'lower' | 'similar'; // pain after poor nights vs good ones
      entries: number; // mornings with sleep answered
    }
  // Enough mornings, but they're all poor or all good — nothing to compare yet.
  | { status: 'oneSided'; entries: number }
  | NotEnough;

export function sleepVsMorningPain(checkins: InWindow[], today: string): SleepVsMorningPain {
  const mornings = inWindow(checkins, findingsWindow(today)).filter((c) => c.type === 'morning');
  const poor: number[] = [];
  const good: number[] = [];
  for (const morning of mornings) {
    const isPoor = isPoorNight(morning);
    if (isPoor === null) continue;
    (isPoor ? poor : good).push(morning.pain_level);
  }

  const entries = poor.length + good.length;
  if (poor.length >= MIN_NIGHTS_PER_SIDE && good.length >= MIN_NIGHTS_PER_SIDE) {
    const afterPoor = mean(poor);
    const afterGood = mean(good);
    const gap = afterPoor - afterGood;
    return {
      status: 'ready',
      afterPoor,
      afterGood,
      direction: Math.abs(gap) < SIMILAR_SLEEP_GAP ? 'similar' : gap > 0 ? 'higher' : 'lower',
      entries,
    };
  }
  if (entries >= MIN_NIGHTS_PER_SIDE * 2) return { status: 'oneSided', entries };
  return { status: 'notEnough', needed: MIN_NIGHTS_PER_SIDE * 2 - entries };
}
