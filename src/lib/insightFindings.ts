import { addDays, format, parseISO, subDays } from 'date-fns';

import { STRESSFUL_LEVEL } from '@/lib/checkinChoices';
import { dailyAverages } from '@/lib/painTrend';
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

// `days` defaults to the Insights card's week; the AI chat passes its own
// period (7/30/90).
export function findingsWindow(today: string, days = FINDINGS_WINDOW_DAYS): FindingsWindow {
  return { from: format(subDays(parseISO(today), days - 1), 'yyyy-MM-dd'), to: today };
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

export function morningVsEvening(checkins: InWindow[], today: string, days = FINDINGS_WINDOW_DAYS): MorningVsEvening {
  const recent = inWindow(checkins, findingsWindow(today, days));
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

export function sleepVsMorningPain(
  checkins: InWindow[],
  today: string,
  days = FINDINGS_WINDOW_DAYS,
): SleepVsMorningPain {
  const mornings = inWindow(checkins, findingsWindow(today, days)).filter((c) => c.type === 'morning');
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

// Activity (Apple Health steps on evening check-ins) vs the NEXT morning's
// pain. Steps only exist on synced days, so this looks at a longer window than
// the weekly cards. Days are split at the user's own median, not a fixed
// "10,000 steps": what counts as an active day differs a lot between people.
export const ACTIVITY_WINDOW_DAYS = 30;
const MIN_DAYS_PER_SIDE = 3;
const SIMILAR_ACTIVITY_GAP = 0.5;

type ActivityInput = Pick<Checkin, 'checkin_date' | 'type' | 'pain_level' | 'steps'>;

export type StepsVsNextMorningPain =
  | {
      status: 'ready';
      afterActive: number;
      afterQuiet: number;
      // Fewest steps among the "active" days, rounded down to the hundred.
      threshold: number;
      direction: 'higher' | 'lower' | 'similar'; // pain after active days vs quieter ones
      entries: number; // days with steps and a next-morning check-in
    }
  | NotEnough;

export function stepsVsNextMorningPain(
  checkins: ActivityInput[],
  today: string,
  days = ACTIVITY_WINDOW_DAYS,
): StepsVsNextMorningPain {
  const recent = inWindow(checkins, findingsWindow(today, days));
  const mornings = new Map(recent.filter((c) => c.type === 'morning').map((c) => [c.checkin_date, c.pain_level]));
  const pairs: { steps: number; nextPain: number }[] = [];
  for (const evening of recent) {
    if (evening.type !== 'evening' || evening.steps == null) continue;
    const next = format(addDays(parseISO(evening.checkin_date), 1), 'yyyy-MM-dd');
    const nextPain = mornings.get(next);
    if (nextPain !== undefined) pairs.push({ steps: evening.steps, nextPain });
  }

  const needed = MIN_DAYS_PER_SIDE * 2 - pairs.length;
  if (needed > 0) return { status: 'notEnough', needed };

  pairs.sort((a, b) => a.steps - b.steps);
  const half = Math.floor(pairs.length / 2);
  const quiet = pairs.slice(0, half);
  const active = pairs.slice(half);
  const afterQuiet = mean(quiet.map((p) => p.nextPain));
  const afterActive = mean(active.map((p) => p.nextPain));
  const gap = afterActive - afterQuiet;
  return {
    status: 'ready',
    afterActive,
    afterQuiet,
    threshold: Math.floor(active[0].steps / 100) * 100,
    direction: Math.abs(gap) < SIMILAR_ACTIVITY_GAP ? 'similar' : gap > 0 ? 'higher' : 'lower',
    entries: pairs.length,
  };
}

// Daily stress (evening "How stressful was your day?", 1–4) vs that evening's
// pain: stressful days (≥ STRESSFUL_LEVEL) against calm or normal ones.
const MIN_STRESS_DAYS_PER_SIDE = 3;
const SIMILAR_STRESS_GAP = 0.5;

type StressInput = Pick<Checkin, 'checkin_date' | 'type' | 'pain_level' | 'stress_level'>;

export type StressVsEveningPain =
  | {
      status: 'ready';
      stressful: number; // mean evening pain on stressful days
      calm: number; // … on calm or normal days
      direction: 'higher' | 'lower' | 'similar'; // pain on stressful days vs calm ones
      entries: number;
    }
  | NotEnough;

export function stressVsEveningPain(checkins: StressInput[], today: string, days = 30): StressVsEveningPain {
  const evenings = inWindow(checkins, findingsWindow(today, days)).filter(
    (c) => c.type === 'evening' && c.stress_level != null,
  );
  const stressful = evenings.filter((c) => (c.stress_level ?? 0) >= STRESSFUL_LEVEL).map((c) => c.pain_level);
  const calm = evenings.filter((c) => (c.stress_level ?? 0) < STRESSFUL_LEVEL).map((c) => c.pain_level);

  const needed =
    Math.max(0, MIN_STRESS_DAYS_PER_SIDE - stressful.length) + Math.max(0, MIN_STRESS_DAYS_PER_SIDE - calm.length);
  if (needed > 0) return { status: 'notEnough', needed };

  const gap = mean(stressful) - mean(calm);
  return {
    status: 'ready',
    stressful: mean(stressful),
    calm: mean(calm),
    direction: Math.abs(gap) < SIMILAR_STRESS_GAP ? 'similar' : gap > 0 ? 'higher' : 'lower',
    entries: stressful.length + calm.length,
  };
}

// "Progress since you started": the first logged days against the latest
// ones. The two windows never share a day: 14 + 14 from 28 logged days, and
// 7 + 7 between 21 and 27 (with 14 + 14 those would overlap and partly
// compare the data with itself). Under 21 logged days there's nothing yet.
export const PROGRESS_MIN_DAYS = 21;
const PROGRESS_FULL_DAYS = 28;
const PROGRESS_MIN_METRIC_DAYS = 5; // per window, for stiffness / range of motion
const SIMILAR_PROGRESS_GAP = 0.3;

type ProgressInput = Pick<Checkin, 'checkin_date' | 'pain_level' | 'stiffness_level' | 'range_of_motion'>;

export interface MetricProgress {
  start: number;
  now: number;
}

export type ProgressSinceStart =
  | {
      status: 'ready';
      windowDays: 7 | 14;
      pain: MetricProgress;
      stiffness: MetricProgress | null;
      rangeOfMotion: MetricProgress | null; // higher is better
      // Pain only: lower now is "better". Never framed as failure when higher.
      direction: 'better' | 'worse' | 'steady';
      loggedDays: number;
      startedOn: string; // first logged day
    }
  | NotEnough;

function windowMean(averages: Map<string, number>, dates: string[]): number | null {
  const values = dates.map((d) => averages.get(d)).filter((v): v is number => v !== undefined);
  return values.length >= PROGRESS_MIN_METRIC_DAYS ? mean(values) : null;
}

export function progressSinceStart(checkins: ProgressInput[]): ProgressSinceStart {
  const pain = dailyAverages(checkins);
  const dates = [...pain.keys()].sort();
  if (dates.length < PROGRESS_MIN_DAYS) return { status: 'notEnough', needed: PROGRESS_MIN_DAYS - dates.length };

  const windowDays = dates.length >= PROGRESS_FULL_DAYS ? 14 : 7;
  const first = dates.slice(0, windowDays);
  const last = dates.slice(-windowDays);
  const metric = (averages: Map<string, number>): MetricProgress | null => {
    const start = windowMean(averages, first);
    const now = windowMean(averages, last);
    return start === null || now === null ? null : { start, now };
  };

  const painProgress = {
    start: mean(first.map((d) => pain.get(d) ?? 0)),
    now: mean(last.map((d) => pain.get(d) ?? 0)),
  };
  const gap = painProgress.now - painProgress.start;
  return {
    status: 'ready',
    windowDays,
    pain: painProgress,
    stiffness: metric(dailyAverages(checkins, 'stiffness_level')),
    rangeOfMotion: metric(dailyAverages(checkins, 'range_of_motion')),
    direction: Math.abs(gap) < SIMILAR_PROGRESS_GAP ? 'steady' : gap < 0 ? 'better' : 'worse',
    loggedDays: dates.length,
    startedOn: dates[0],
  };
}
