import { addDays, differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';

import { toLocalDate } from '@/lib/dates';
import { dailyAverages } from '@/lib/painTrend';
import type { Checkin, Experiment, ExperimentDay, FlareUp } from '@/types/database.types';

// Personal experiments: the days the user stuck to the change, compared with
// the 14 days before it started. Plain averages of logged data, no AI. One
// short test proves nothing on its own, so the copy built on this always says
// so; a small gap reads as "no clear difference", not a win.

export const BASELINE_DAYS = 14;
export const MIN_FOLLOWED_DAYS = 4;
export const MIN_BASELINE_DAYS = 3;
const SIMILAR_GAP = 0.3;

type ExperimentLike = Pick<Experiment, 'started_on' | 'length_days' | 'status' | 'ended_on'>;
type ResultCheckin = Pick<Checkin, 'checkin_date' | 'type' | 'pain_level' | 'stiffness_level'>;

function shift(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd');
}

// The experiment's planned last day.
export function plannedEnd(experiment: Pick<Experiment, 'started_on' | 'length_days'>): string {
  return shift(experiment.started_on, experiment.length_days - 1);
}

// The last day that counts: the planned end, an early stop, or today while
// it's still running.
export function lastCountedDay(experiment: ExperimentLike, today: string): string {
  const end = experiment.ended_on ?? plannedEnd(experiment);
  return end < today ? end : today;
}

// Running = active and its last day hasn't passed. An 'active' row past its
// end is finished; it's marked 'done' when the next experiment starts.
export function isRunning(experiment: ExperimentLike, today: string): boolean {
  return experiment.status === 'active' && plannedEnd(experiment) >= today && experiment.started_on <= today;
}

export function isFinished(experiment: ExperimentLike, today: string): boolean {
  return experiment.status === 'done' || (experiment.status === 'active' && plannedEnd(experiment) < today);
}

// Whether the evening check-in for `date` should ask about this experiment.
export function asksOn(experiment: ExperimentLike, date: string): boolean {
  if (experiment.status === 'stopped') return false;
  return date >= experiment.started_on && date <= plannedEnd(experiment);
}

export type DayState = 'followed' | 'skipped' | 'unanswered' | 'upcoming';

// One entry per planned day, for the dot bar.
export function experimentDayStates(
  experiment: ExperimentLike,
  days: Pick<ExperimentDay, 'date' | 'followed'>[],
  today: string,
): { date: string; state: DayState }[] {
  const answers = new Map(days.map((d) => [d.date, d.followed]));
  const stoppedAfter = experiment.status === 'stopped' ? experiment.ended_on : null;
  return Array.from({ length: experiment.length_days }, (_, i) => {
    const date = shift(experiment.started_on, i);
    const answer = answers.get(date);
    if (answer !== undefined) return { date, state: answer ? 'followed' : 'skipped' };
    if (date > today || (stoppedAfter && date > stoppedAfter)) return { date, state: 'upcoming' };
    return { date, state: 'unanswered' };
  });
}

export interface Comparison {
  during: number;
  before: number;
  direction: 'lower' | 'higher' | 'similar';
}

function compare(during: number[], before: number[]): Comparison | null {
  if (during.length < MIN_FOLLOWED_DAYS || before.length < MIN_BASELINE_DAYS) return null;
  const a = during.reduce((s, v) => s + v, 0) / during.length;
  const b = before.reduce((s, v) => s + v, 0) / before.length;
  const gap = a - b;
  return { during: a, before: b, direction: Math.abs(gap) < SIMILAR_GAP ? 'similar' : gap < 0 ? 'lower' : 'higher' };
}

export type ExperimentResult =
  | { status: 'notEnough'; followedDays: number; neededFollowed: number; baselineDays: number; neededBaseline: number }
  | {
      status: 'ready';
      followedDays: number;
      // Daily average pain on followed days vs the 14 days before.
      pain: Comparison;
      // The next morning's pain and stiffness after a followed day, vs the
      // mornings of the 14 days before.
      nextMorningPain: Comparison | null;
      nextMorningStiffness: Comparison | null;
      // Flare-ups per week during the whole experiment vs before.
      flaresPerWeekDuring: number;
      flaresPerWeekBefore: number;
    };

export function experimentResult(
  experiment: ExperimentLike,
  days: Pick<ExperimentDay, 'date' | 'followed'>[],
  checkins: ResultCheckin[],
  flareUps: Pick<FlareUp, 'occurred_at'>[],
  today: string,
): ExperimentResult {
  const start = experiment.started_on;
  const end = lastCountedDay(experiment, today);
  const baselineFrom = format(subDays(parseISO(start), BASELINE_DAYS), 'yyyy-MM-dd');
  const baselineTo = shift(start, -1);
  const inRange = (date: string, from: string, to: string) => date >= from && date <= to;

  const followed = days.filter((d) => d.followed && inRange(d.date, start, end)).map((d) => d.date);
  const averages = dailyAverages(checkins);
  const duringPain = followed.map((d) => averages.get(d)).filter((v): v is number => v !== undefined);
  const beforePain = [...averages.entries()].filter(([d]) => inRange(d, baselineFrom, baselineTo)).map(([, v]) => v);

  if (duringPain.length < MIN_FOLLOWED_DAYS || beforePain.length < MIN_BASELINE_DAYS) {
    return {
      status: 'notEnough',
      followedDays: duringPain.length,
      neededFollowed: Math.max(0, MIN_FOLLOWED_DAYS - duringPain.length),
      baselineDays: beforePain.length,
      neededBaseline: Math.max(0, MIN_BASELINE_DAYS - beforePain.length),
    };
  }

  const mornings = new Map(checkins.filter((c) => c.type === 'morning').map((c) => [c.checkin_date, c]));
  const nextMornings = followed.map((d) => mornings.get(shift(d, 1))).filter((c) => c !== undefined);
  const baselineMornings = [...mornings.values()].filter((c) => inRange(c.checkin_date, shift(baselineFrom, 1), start));
  const stiffness = (list: ResultCheckin[]) =>
    list.map((c) => c.stiffness_level).filter((v): v is number => v != null);

  const countFlares = (from: string, to: string) =>
    flareUps.filter((f) => inRange(toLocalDate(f.occurred_at), from, to)).length;
  const runDays = differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;

  return {
    status: 'ready',
    followedDays: duringPain.length,
    pain: compare(duringPain, beforePain) as Comparison,
    nextMorningPain: compare(
      nextMornings.map((c) => c.pain_level),
      baselineMornings.map((c) => c.pain_level),
    ),
    nextMorningStiffness: compare(stiffness(nextMornings), stiffness(baselineMornings)),
    flaresPerWeekDuring: (countFlares(start, end) / runDays) * 7,
    flaresPerWeekBefore: (countFlares(baselineFrom, baselineTo) / BASELINE_DAYS) * 7,
  };
}
