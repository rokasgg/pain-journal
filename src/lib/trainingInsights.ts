import { addDays, format, parseISO, startOfWeek, subDays, subWeeks } from 'date-fns';

import { toLocalDate } from '@/lib/dates';
import { dailyAverages } from '@/lib/painTrend';
import type { Checkin, ExerciseLog, Routine } from '@/types/database.types';

// Training payoff + weekly goal. Two rules this file exists to enforce:
//  * rest days never "break" anything — progress is weekly, and an
//    unfinished current week can't reset a weeks-in-a-row run;
//  * the payoff is shown as plain arithmetic over logged data, no AI.

export const MIN_RELIEF_SESSIONS = 3;
const MIN_DAYS_PER_SIDE = 3;
const MIN_EXERCISE_ENTRIES = 4;
const MIN_EXERCISE_DROP = 1;
const MAX_PROGRESS_ITEMS = 3;
const MAX_WEEKS_LOOKBACK = 52;

function dateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// Distinct local days with a real (non-SKIPPED) session — two logs on the
// same day are one session.
export function trainedDaySet(logs: Pick<ExerciseLog, 'logged_at' | 'status'>[]): Set<string> {
  return new Set(logs.filter((log) => log.status !== 'SKIPPED').map((log) => toLocalDate(log.logged_at)));
}

function countInWeek(trained: Set<string>, weekStart: Date): number {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (trained.has(dateKey(addDays(weekStart, i)))) count += 1;
  }
  return count;
}

export interface WeeklyTrainingProgress {
  trainedDays: string[]; // this week's trained days, yyyy-MM-dd, ascending
  count: number;
  goal: number;
  goalMet: boolean;
  // Consecutive completed past weeks that met the goal, plus this week once
  // it's met. An in-progress week that hasn't met it yet doesn't reset it.
  weeksInARow: number;
  weekStart: string; // Monday of this week — the key for "celebrated once"
}

export function weeklyTrainingProgress(
  logs: Pick<ExerciseLog, 'logged_at' | 'status'>[],
  goal: number,
  today: string,
): WeeklyTrainingProgress {
  const trained = trainedDaySet(logs);
  const weekStart = startOfWeek(parseISO(today), { weekStartsOn: 1 });

  const trainedDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const key = dateKey(addDays(weekStart, i));
    if (trained.has(key)) trainedDays.push(key);
  }
  const count = trainedDays.length;
  const goalMet = count >= goal;

  let pastStreak = 0;
  for (let k = 1; k <= MAX_WEEKS_LOOKBACK; k++) {
    if (countInWeek(trained, subWeeks(weekStart, k)) < goal) break;
    pastStreak += 1;
  }

  return {
    trainedDays,
    count,
    goal,
    goalMet,
    weeksInARow: pastStreak + (goalMet ? 1 : 0),
    weekStart: dateKey(weekStart),
  };
}

export interface ReliefSummary {
  avgDrop: number; // positive = pain went down after training
  sessions: number;
}

export function trainingReliefSummary(
  logs: Pick<ExerciseLog, 'status' | 'pain_before' | 'pain_after'>[],
): ReliefSummary | null {
  const drops = logs
    .filter((log) => log.status !== 'SKIPPED' && log.pain_before != null && log.pain_after != null)
    .map((log) => (log.pain_before as number) - (log.pain_after as number));
  if (drops.length < MIN_RELIEF_SESSIONS) return null;
  return { avgDrop: drops.reduce((sum, d) => sum + d, 0) / drops.length, sessions: drops.length };
}

export interface NextDayComparison {
  afterTraining: number;
  afterRest: number;
  trainingDays: number;
  restDays: number;
}

// Next day's daily-average pain after training days vs after rest days.
// Returned regardless of gap size — the UI words a small gap honestly.
export function trainingVsRestNextDayPain(
  logs: Pick<ExerciseLog, 'logged_at' | 'status'>[],
  checkins: Pick<Checkin, 'checkin_date' | 'pain_level'>[],
  today: string,
  windowDays = 30,
): NextDayComparison | null {
  const trained = trainedDaySet(logs);
  const painByDay = dailyAverages(checkins);
  const afterTraining: number[] = [];
  const afterRest: number[] = [];

  for (let daysAgo = windowDays; daysAgo >= 1; daysAgo--) {
    const day = subDays(parseISO(today), daysAgo);
    const nextPain = painByDay.get(dateKey(addDays(day, 1)));
    if (nextPain === undefined) continue;
    (trained.has(dateKey(day)) ? afterTraining : afterRest).push(nextPain);
  }

  if (afterTraining.length < MIN_DAYS_PER_SIDE || afterRest.length < MIN_DAYS_PER_SIDE) return null;
  const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
  return {
    afterTraining: mean(afterTraining),
    afterRest: mean(afterRest),
    trainingDays: afterTraining.length,
    restDays: afterRest.length,
  };
}

export interface ExerciseProgressItem {
  name: string;
  from: number; // avg discomfort, earlier half of entries
  to: number; // avg discomfort, later half
}

// Exercises getting easier: per-exercise discomfort, first half vs second
// half of its entries in the window. Grouped by *name* — exercise ids are
// only unique within one routine.
export function exerciseProgress(
  logs: ExerciseLog[],
  routines: Pick<Routine, 'id' | 'exercises'>[],
  today: string,
  windowDays = 42,
): ExerciseProgressItem[] {
  const start = dateKey(subDays(parseISO(today), windowDays));
  const names = new Map<string, Map<string, string>>();
  for (const routine of routines) {
    names.set(routine.id, new Map(routine.exercises.map((exercise) => [exercise.id, exercise.name])));
  }

  const levelsByName = new Map<string, number[]>();
  const ordered = logs
    .filter((log) => log.status !== 'SKIPPED' && toLocalDate(log.logged_at) >= start)
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  for (const log of ordered) {
    for (const entry of log.completed_exercises) {
      const name = entry.completed ? names.get(log.routine_id)?.get(entry.exercise_id) : undefined;
      if (!name) continue;
      const levels = levelsByName.get(name) ?? [];
      levels.push(entry.pain_discomfort_level);
      levelsByName.set(name, levels);
    }
  }

  const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
  const items: ExerciseProgressItem[] = [];
  for (const [name, levels] of levelsByName) {
    if (levels.length < MIN_EXERCISE_ENTRIES) continue;
    const half = Math.floor(levels.length / 2);
    const from = mean(levels.slice(0, half));
    const to = mean(levels.slice(levels.length - half));
    if (from - to >= MIN_EXERCISE_DROP) items.push({ name, from, to });
  }
  return items.sort((a, b) => b.from - b.to - (a.from - a.to)).slice(0, MAX_PROGRESS_ITEMS);
}

// Which "training saved" toast to show — celebrates a drop, stays neutral
// (never guilt) when pain didn't go down, plain message when not answered.
export function trainingSavedToastKey(
  painBefore: number | null,
  painAfter: number | null,
): 'routine.logSavedReliefToast' | 'routine.logSavedPainToast' | 'routine.logSavedToast' {
  if (painBefore == null || painAfter == null) return 'routine.logSavedToast';
  return painAfter < painBefore ? 'routine.logSavedReliefToast' : 'routine.logSavedPainToast';
}
