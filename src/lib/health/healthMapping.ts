import { addDays, set } from 'date-fns';

import type { ExerciseType } from '@/lib/checkinChoices';
import type { HealthSleep } from '@/lib/sleep';
import type { HealthWorkout } from '@/types/database.types';

// Apple Health samples → the app's own shapes. Pure and library-free, so it
// runs in Jest: src/lib/health/healthkit.ts (the only file that imports the
// native module) converts the library's samples into the Raw* shapes below.

// HKCategoryValueSleepAnalysis raw values (stable, Apple-defined).
const SLEEP_IN_BED = 0;
const SLEEP_ASLEEP_VALUES = new Set([1, 3, 4, 5]); // unspecified, core, deep, REM

export interface RawSleepSample {
  value: number;
  startDate: Date;
  endDate: Date;
}

export interface RawWorkout {
  activityType: number;
  startDate: Date;
  endDate: Date;
  sourceName: string;
}

interface Interval {
  start: number;
  end: number;
}

// Last night = 18:00 the previous evening → 12:00 today, so an evening nap
// the day before or an afternoon nap today doesn't count.
const NIGHT_START_HOUR = 18;
const NIGHT_END_HOUR = 12;

export function nightWindow(now: Date): { start: Date; end: Date } {
  const end = set(now, { hours: NIGHT_END_HOUR, minutes: 0, seconds: 0, milliseconds: 0 });
  const start = set(addDays(now, -1), { hours: NIGHT_START_HOUR, minutes: 0, seconds: 0, milliseconds: 0 });
  return { start, end };
}

// Overlapping samples are normal (iPhone and Apple Watch both record a
// night), so intervals are merged before summing, never added up.
function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) last.end = Math.max(last.end, interval.end);
    else merged.push({ ...interval });
  }
  return merged;
}

function totalMinutes(intervals: Interval[]): number {
  return Math.round(intervals.reduce((sum, i) => sum + (i.end - i.start), 0) / 60000);
}

function clipped(samples: RawSleepSample[], window: { start: Date; end: Date }, keep: (value: number) => boolean): Interval[] {
  const from = window.start.getTime();
  const to = window.end.getTime();
  return samples
    .filter((s) => keep(s.value))
    .map((s) => ({ start: Math.max(s.startDate.getTime(), from), end: Math.min(s.endDate.getTime(), to) }))
    .filter((i) => i.end > i.start);
}

export function toHealthSleep(samples: RawSleepSample[], now: Date): HealthSleep | null {
  const window = nightWindow(now);
  const asleep = mergeIntervals(clipped(samples, window, (v) => SLEEP_ASLEEP_VALUES.has(v)));
  if (asleep.length === 0) return null;
  const inBed = mergeIntervals(clipped(samples, window, (v) => v === SLEEP_IN_BED));
  return {
    asleepMinutes: totalMinutes(asleep),
    inBedMinutes: inBed.length > 0 ? totalMinutes(inBed) : null,
    start: new Date(asleep[0].start).toISOString(),
    end: new Date(asleep[asleep.length - 1].end).toISOString(),
    updatedAt: now.toISOString(),
  };
}

// HKWorkoutActivityType raw values (stable, Apple-defined) → the evening
// check-in's activity chips. Anything else is 'Other'.
const WORKOUT_TYPE_TO_EXERCISE: Record<number, ExerciseType> = {
  52: 'Walking',
  24: 'Walking', // hiking
  37: 'Running',
  13: 'Cycling',
  74: 'Cycling', // hand cycling
  46: 'Swimming',
  50: 'Gym', // traditional strength training
  20: 'Gym', // functional strength training
  63: 'Gym', // HIIT
  11: 'Gym', // cross training
  57: 'Yoga',
};

export const OTHER_WORKOUT = 'Other';

export function workoutExerciseType(activityType: number): ExerciseType | typeof OTHER_WORKOUT {
  return WORKOUT_TYPE_TO_EXERCISE[activityType] ?? OTHER_WORKOUT;
}

// Strava and an Apple Watch often both record the same walk. Same type and
// overlapping in time counts once (the longer one is kept).
export function summariseWorkouts(workouts: RawWorkout[]): HealthWorkout[] {
  const sorted = [...workouts].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const kept: { type: string; start: number; end: number; source: string }[] = [];
  for (const workout of sorted) {
    const type = workoutExerciseType(workout.activityType);
    const start = workout.startDate.getTime();
    const end = workout.endDate.getTime();
    if (end <= start) continue;
    const duplicate = kept.find((k) => k.type === type && start < k.end && end > k.start);
    if (!duplicate) {
      kept.push({ type, start, end, source: workout.sourceName });
    } else if (end - start > duplicate.end - duplicate.start) {
      Object.assign(duplicate, { start, end, source: workout.sourceName });
    }
  }
  return kept.map((k) => ({ type: k.type, minutes: Math.round((k.end - k.start) / 60000), source: k.source }));
}

// Distinct chip values, in the order the workouts happened.
export function exerciseTypesFromWorkouts(workouts: HealthWorkout[]): string[] {
  return [...new Set(workouts.map((w) => w.type))];
}
