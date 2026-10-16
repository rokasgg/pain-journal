import { addDays, endOfMonth, format, getDaysInMonth, parseISO, startOfWeek, subMonths } from 'date-fns';

import { toLocalDate } from '@/lib/dates';
import { countPainFreeDays, dailyAverages, meanOfDays, type TrendMetric } from '@/lib/painTrend';
import type { Checkin, ExerciseLog, FlareUp, Routine } from '@/types/database.types';

// Monthly Wrap: a story-style recap of one completed calendar month.
//
// Tone rule: pain data is mostly negative, so a Wrap celebrates showing up
// and progress, and frames a harder month with compassion. There is
// deliberately no "worst day" slide — `calmestWeek` is its positive
// counterpart. Every number here is plain client-side arithmetic, no AI.

export type WrapTone = 'better' | 'worse' | 'steady';

export interface MetricChange {
  current: number;
  previous: number;
  tone: WrapTone;
}

export type WrapSlide =
  | { kind: 'intro'; month: string; daysLogged: number }
  | { kind: 'consistency'; daysLogged: number; daysInMonth: number; longestStreak: number; fullDays: number }
  | { kind: 'painFree'; painFreeDays: number; daysLogged: number }
  | ({ kind: 'painChange' } & MetricChange)
  | { kind: 'calmestWeek'; weekStart: string; weekEnd: string; average: number }
  | { kind: 'body'; stiffness: MetricChange | null; mobility: MetricChange | null }
  | { kind: 'training'; sessions: number; fullSessions: number; topExercise: { name: string; count: number } | null }
  | { kind: 'flareUps'; count: number; previousCount: number; avgDurationMinutes: number | null; tone: WrapTone }
  | { kind: 'sleep'; wellRestedPain: number; shortSleepPain: number; thresholdHours: number }
  | {
      kind: 'summary';
      daysLogged: number;
      averagePain: number;
      painFreeDays: number;
      sessions: number;
      flareUps: number;
    };

export type WrapSlideKind = WrapSlide['kind'];

export interface WrapInput {
  month: string; // yyyy-MM
  checkins: Checkin[];
  flareUps: FlareUp[];
  exerciseLogs: ExerciseLog[];
  routines: Routine[];
}

export const MIN_WRAP_DAYS = 7;
const MIN_COMPARE_DAYS = 3;
const MIN_WEEK_DAYS = 3;
const STEADY_THRESHOLD = 0.3;
const SLEEP_THRESHOLD_HOURS = 7;
const MIN_SLEEP_SAMPLES = 3;
const MIN_SLEEP_GAP = 0.5;

interface MonthWindow {
  start: string;
  end: string;
}

function monthWindow(month: string): MonthWindow {
  const start = parseISO(`${month}-01`);
  return { start: format(start, 'yyyy-MM-dd'), end: format(endOfMonth(start), 'yyyy-MM-dd') };
}

function inWindow(date: string, window: MonthWindow): boolean {
  return date >= window.start && date <= window.end;
}

// `higherIsBetter` flips the tone for range of motion, the one 0–10 metric
// where going up is good.
function toneFor(delta: number, higherIsBetter = false): WrapTone {
  if (Math.abs(delta) < STEADY_THRESHOLD) return 'steady';
  const improved = higherIsBetter ? delta > 0 : delta < 0;
  return improved ? 'better' : 'worse';
}

function metricChange(
  checkins: Checkin[],
  metric: TrendMetric,
  current: MonthWindow,
  previous: MonthWindow,
  higherIsBetter = false,
): MetricChange | null {
  const averages = dailyAverages(checkins, metric);
  const now = meanOfDays(averages, current.start, current.end);
  const before = meanOfDays(averages, previous.start, previous.end);
  if (now.days < MIN_COMPARE_DAYS || before.days < MIN_COMPARE_DAYS) return null;
  return { current: now.mean, previous: before.mean, tone: toneFor(now.mean - before.mean, higherIsBetter) };
}

function longestStreak(sortedDates: string[]): number {
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of sortedDates) {
    run = previous && format(addDays(parseISO(previous), 1), 'yyyy-MM-dd') === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }
  return longest;
}

function calmestWeek(painByDay: Map<string, number>, window: MonthWindow): WrapSlide | null {
  const weeks = new Map<string, number[]>();
  for (const [date, value] of painByDay) {
    const key = format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const values = weeks.get(key) ?? [];
    values.push(value);
    weeks.set(key, values);
  }

  const qualifying = [...weeks.entries()]
    .filter(([, values]) => values.length >= MIN_WEEK_DAYS)
    .map(([weekStart, values]) => ({ weekStart, average: values.reduce((s, v) => s + v, 0) / values.length }));
  // "Calmest" only means something with at least two weeks to compare.
  if (qualifying.length < 2) return null;

  const best = qualifying.reduce((a, b) => (b.average < a.average ? b : a));
  const weekEnd = format(addDays(parseISO(best.weekStart), 6), 'yyyy-MM-dd');
  return {
    kind: 'calmestWeek',
    // Clamp to the month so a week straddling month boundaries reads correctly.
    weekStart: best.weekStart < window.start ? window.start : best.weekStart,
    weekEnd: weekEnd > window.end ? window.end : weekEnd,
    average: best.average,
  };
}

function training(logs: ExerciseLog[], routines: Routine[]): WrapSlide | null {
  const done = logs.filter((log) => log.status !== 'SKIPPED');
  if (done.length === 0) return null;

  const exerciseNames = new Map<string, Map<string, string>>();
  for (const routine of routines) {
    exerciseNames.set(routine.id, new Map(routine.exercises.map((exercise) => [exercise.id, exercise.name])));
  }

  // Counted by name, not id — exercise ids are only unique within one routine.
  const counts = new Map<string, number>();
  for (const log of done) {
    const names = exerciseNames.get(log.routine_id);
    for (const entry of log.completed_exercises) {
      const name = entry.completed ? names?.get(entry.exercise_id) : undefined;
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  let topExercise: { name: string; count: number } | null = null;
  for (const [name, count] of counts) {
    if (count >= 2 && (!topExercise || count > topExercise.count)) topExercise = { name, count };
  }

  return {
    kind: 'training',
    sessions: done.length,
    fullSessions: done.filter((log) => log.status === 'FULL').length,
    topExercise,
  };
}

function sleep(checkins: Checkin[], window: MonthWindow): WrapSlide | null {
  // A morning check-in's sleep_hours describes the night before that same
  // morning's pain_level, so the pair lines up without any date shifting.
  const rested: number[] = [];
  const short: number[] = [];
  for (const checkin of checkins) {
    if (checkin.type !== 'morning' || checkin.sleep_hours == null || !inWindow(checkin.checkin_date, window)) continue;
    (checkin.sleep_hours >= SLEEP_THRESHOLD_HOURS ? rested : short).push(checkin.pain_level);
  }
  if (rested.length < MIN_SLEEP_SAMPLES || short.length < MIN_SLEEP_SAMPLES) return null;

  const mean = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length;
  const wellRestedPain = mean(rested);
  const shortSleepPain = mean(short);
  // Only an insight worth a slide when more sleep clearly lines up with less pain.
  if (shortSleepPain - wellRestedPain < MIN_SLEEP_GAP) return null;
  return { kind: 'sleep', wellRestedPain, shortSleepPain, thresholdHours: SLEEP_THRESHOLD_HOURS };
}

export function buildMonthlyWrap({ month, checkins, flareUps, exerciseLogs, routines }: WrapInput): WrapSlide[] | null {
  const current = monthWindow(month);
  const previous = monthWindow(format(subMonths(parseISO(`${month}-01`), 1), 'yyyy-MM'));

  const monthCheckins = checkins.filter((checkin) => inWindow(checkin.checkin_date, current));
  const painByDay = dailyAverages(monthCheckins);
  const loggedDays = [...painByDay.keys()].sort();
  if (loggedDays.length < MIN_WRAP_DAYS) return null;

  const typesByDay = new Map<string, Set<string>>();
  for (const checkin of monthCheckins) {
    const types = typesByDay.get(checkin.checkin_date) ?? new Set<string>();
    types.add(checkin.type);
    typesByDay.set(checkin.checkin_date, types);
  }

  const { painFree } = countPainFreeDays(monthCheckins);
  const averagePain = meanOfDays(painByDay, current.start, current.end).mean;

  const flareUpsIn = (window: MonthWindow) => flareUps.filter((f) => inWindow(toLocalDate(f.occurred_at), window));
  const monthFlareUps = flareUpsIn(current);
  const previousFlareCount = flareUpsIn(previous).length;
  const durations = monthFlareUps
    .map((f) => f.resolved_duration_minutes)
    .filter((minutes): minutes is number => minutes != null);

  const monthLogs = exerciseLogs.filter((log) => inWindow(toLocalDate(log.logged_at), current));
  const trainingSlide = training(monthLogs, routines);
  const sessions = trainingSlide?.kind === 'training' ? trainingSlide.sessions : 0;

  const painChange = metricChange(checkins, 'pain_level', current, previous);
  const stiffness = metricChange(checkins, 'stiffness_level', current, previous);
  const mobility = metricChange(checkins, 'range_of_motion', current, previous, true);

  const slides: (WrapSlide | null)[] = [
    { kind: 'intro', month, daysLogged: loggedDays.length },
    {
      kind: 'consistency',
      daysLogged: loggedDays.length,
      daysInMonth: getDaysInMonth(parseISO(current.start)),
      longestStreak: longestStreak(loggedDays),
      fullDays: [...typesByDay.values()].filter((types) => types.size >= 2).length,
    },
    painFree > 0 ? { kind: 'painFree', painFreeDays: painFree, daysLogged: loggedDays.length } : null,
    painChange ? { kind: 'painChange', ...painChange } : null,
    calmestWeek(painByDay, current),
    stiffness || mobility ? { kind: 'body', stiffness, mobility } : null,
    trainingSlide,
    {
      kind: 'flareUps',
      count: monthFlareUps.length,
      previousCount: previousFlareCount,
      avgDurationMinutes: durations.length > 0 ? durations.reduce((s, m) => s + m, 0) / durations.length : null,
      tone:
        monthFlareUps.length === 0 || monthFlareUps.length < previousFlareCount
          ? 'better'
          : monthFlareUps.length > previousFlareCount
            ? 'worse'
            : 'steady',
    },
    sleep(checkins, current),
    {
      kind: 'summary',
      daysLogged: loggedDays.length,
      averagePain,
      painFreeDays: painFree,
      sessions,
      flareUps: monthFlareUps.length,
    },
  ];

  return slides.filter((slide): slide is WrapSlide => slide !== null);
}

// Completed calendar months (never the current one), newest first.
export function recentCompletedMonths(today: string, count: number): string[] {
  const base = parseISO(today);
  return Array.from({ length: count }, (_, i) => format(subMonths(base, i + 1), 'yyyy-MM'));
}

// Cheap availability check (no slide building) for listing which months have a Wrap.
export function isWrapAvailable(checkins: Pick<Checkin, 'checkin_date' | 'pain_level'>[], month: string): boolean {
  const window = monthWindow(month);
  const days = new Set<string>();
  for (const checkin of checkins) {
    if (inWindow(checkin.checkin_date, window)) days.add(checkin.checkin_date);
  }
  return days.size >= MIN_WRAP_DAYS;
}
