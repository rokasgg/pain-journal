import {
  OTHER_WORKOUT,
  exerciseTypesFromWorkouts,
  nightWindow,
  summariseWorkouts,
  toHealthSleep,
  workoutExerciseType,
} from './healthMapping';

// Local times, so the night window (18:00 → 12:00) is tested in the device's
// own timezone, like the app uses it.
const at = (day: number, hours: number, minutes = 0) => new Date(2026, 10, day, hours, minutes);
const now = at(4, 7, 30);

describe('nightWindow', () => {
  it('runs from 18:00 yesterday to 12:00 today', () => {
    expect(nightWindow(now)).toEqual({ start: at(3, 18), end: at(4, 12) });
  });
});

describe('toHealthSleep', () => {
  it('returns null without asleep samples', () => {
    expect(toHealthSleep([], now)).toBeNull();
    expect(toHealthSleep([{ value: 0, startDate: at(3, 23), endDate: at(4, 7) }], now)).toBeNull();
  });

  it('sums the asleep stages and keeps in-bed separately', () => {
    const sleep = toHealthSleep(
      [
        { value: 0, startDate: at(3, 23, 30), endDate: at(4, 7, 15) }, // in bed
        { value: 3, startDate: at(3, 23, 48), endDate: at(4, 2) }, // core
        { value: 2, startDate: at(4, 2), endDate: at(4, 2, 20) }, // awake — not counted
        { value: 5, startDate: at(4, 2, 20), endDate: at(4, 7, 8) }, // REM
      ],
      now,
    );
    expect(sleep).toEqual({
      asleepMinutes: 132 + 288,
      inBedMinutes: 465,
      start: at(3, 23, 48).toISOString(),
      end: at(4, 7, 8).toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it('merges overlapping iPhone and Apple Watch samples instead of adding them up', () => {
    const sleep = toHealthSleep(
      [
        { value: 1, startDate: at(3, 23), endDate: at(4, 6) },
        { value: 4, startDate: at(4, 1), endDate: at(4, 7) },
      ],
      now,
    );
    expect(sleep?.asleepMinutes).toBe(8 * 60);
    expect(sleep?.inBedMinutes).toBeNull();
  });

  it('ignores naps outside the night window and clips samples at its edges', () => {
    const sleep = toHealthSleep(
      [
        { value: 1, startDate: at(3, 14), endDate: at(3, 15) }, // yesterday afternoon nap
        { value: 1, startDate: at(3, 17), endDate: at(3, 19) }, // straddles 18:00
        { value: 1, startDate: at(4, 13), endDate: at(4, 14) }, // today's nap
      ],
      now,
    );
    expect(sleep?.asleepMinutes).toBe(60);
    expect(sleep?.start).toBe(at(3, 18).toISOString());
  });
});

describe('workouts', () => {
  const workout = (activityType: number, start: Date, end: Date, sourceName = 'Strava') => ({
    activityType,
    startDate: start,
    endDate: end,
    sourceName,
  });

  it('maps Health workout types to the check-in chips', () => {
    expect(workoutExerciseType(52)).toBe('Walking');
    expect(workoutExerciseType(24)).toBe('Walking');
    expect(workoutExerciseType(37)).toBe('Running');
    expect(workoutExerciseType(13)).toBe('Cycling');
    expect(workoutExerciseType(46)).toBe('Swimming');
    expect(workoutExerciseType(50)).toBe('Gym');
    expect(workoutExerciseType(57)).toBe('Yoga');
    expect(workoutExerciseType(3000)).toBe(OTHER_WORKOUT);
  });

  it('counts the same walk recorded by two apps once, keeping the longer one', () => {
    const summary = summariseWorkouts([
      workout(52, at(4, 17), at(4, 17, 40), 'Apple Watch'),
      workout(52, at(4, 16, 58), at(4, 17, 43), 'Strava'),
      workout(50, at(4, 19), at(4, 19, 30), 'Apple Watch'),
    ]);
    expect(summary).toEqual([
      { type: 'Walking', minutes: 45, source: 'Strava' },
      { type: 'Gym', minutes: 30, source: 'Apple Watch' },
    ]);
  });

  it('keeps two separate walks and skips zero-length samples', () => {
    const summary = summariseWorkouts([
      workout(52, at(4, 8), at(4, 8, 20)),
      workout(52, at(4, 18), at(4, 18, 30)),
      workout(37, at(4, 12), at(4, 12)),
    ]);
    expect(summary.map((w) => w.minutes)).toEqual([20, 30]);
    expect(exerciseTypesFromWorkouts(summary)).toEqual(['Walking']);
  });
});
