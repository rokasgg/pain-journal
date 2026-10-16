import type { ExerciseLog, Routine } from '@/types/database.types';

import {
  exerciseProgress,
  trainingReliefSummary,
  trainingVsRestNextDayPain,
  weeklyTrainingProgress,
} from './trainingInsights';

// trainingInsights → lib/dates → useLocaleStore, which persists via AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const TODAY = '2026-10-16'; // Friday; this week is Mon Oct 12 – Sun Oct 18

// A local-time ISO timestamp for a yyyy-MM-dd day (6pm), so toLocalDate()
// maps it back to the same day in any timezone.
function at(day: string, hour = 18): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, hour).toISOString();
}

function log(day: string, overrides: Partial<ExerciseLog> = {}): ExerciseLog {
  return {
    id: `${day}-${overrides.status ?? 'FULL'}-${Math.random()}`,
    user_id: 'u1',
    routine_id: 'r1',
    logged_at: at(day),
    status: 'FULL',
    completed_exercises: [],
    general_note: null,
    pain_before: null,
    pain_after: null,
    ...overrides,
  };
}

describe('weeklyTrainingProgress', () => {
  it('counts distinct days this week and ignores SKIPPED', () => {
    const logs = [
      log('2026-10-12'),
      log('2026-10-12', { status: 'PARTIAL' }), // same day — still one session
      log('2026-10-14', { status: 'SKIPPED' }),
      log('2026-10-15'),
      log('2026-10-11'), // last Sunday — previous week
    ];
    const progress = weeklyTrainingProgress(logs, 3, TODAY);
    expect(progress).toMatchObject({ trainedDays: ['2026-10-12', '2026-10-15'], count: 2, goalMet: false });
    expect(progress.weekStart).toBe('2026-10-12');
  });

  it('keeps a weeks-in-a-row run alive through an unfinished current week', () => {
    const logs = [
      // two previous weeks each with 2 sessions (goal 2)
      log('2026-09-29'),
      log('2026-10-01'),
      log('2026-10-06'),
      log('2026-10-09'),
      // this week: only 1 so far
      log('2026-10-13'),
    ];
    expect(weeklyTrainingProgress(logs, 2, TODAY).weeksInARow).toBe(2);
    expect(weeklyTrainingProgress([...logs, log('2026-10-15')], 2, TODAY)).toMatchObject({
      goalMet: true,
      weeksInARow: 3,
    });
  });

  it('stops counting at the first past week that missed the goal', () => {
    const logs = [
      log('2026-09-22'),
      log('2026-09-23'), // week of Sep 21: met
      log('2026-09-30'), // week of Sep 28: only 1 — missed
      log('2026-10-06'),
      log('2026-10-07'), // last week: met
    ];
    expect(weeklyTrainingProgress(logs, 2, TODAY).weeksInARow).toBe(1);
  });
});

describe('trainingReliefSummary', () => {
  it('averages before − after over sessions that have both', () => {
    const logs = [
      log('2026-10-10', { pain_before: 5, pain_after: 3 }),
      log('2026-10-11', { pain_before: 4, pain_after: 3 }),
      log('2026-10-12', { pain_before: 6, pain_after: 3 }),
      log('2026-10-13', { pain_before: 6 }), // no after — ignored
      log('2026-10-14', { pain_before: 9, pain_after: 0, status: 'SKIPPED' }),
    ];
    expect(trainingReliefSummary(logs)).toEqual({ avgDrop: 2, sessions: 3 });
  });

  it('needs at least 3 sessions', () => {
    expect(trainingReliefSummary([log('2026-10-10', { pain_before: 5, pain_after: 3 })])).toBeNull();
  });
});

describe('trainingVsRestNextDayPain', () => {
  const checkin = (checkin_date: string, pain_level: number) => ({ checkin_date, pain_level });

  it('compares next-day pain after training vs rest days, across a month boundary', () => {
    // Trained Sep 28, 30, Oct 2 → next days Sep 29, Oct 1, Oct 3 (pain 2).
    const logs = [log('2026-09-28'), log('2026-09-30'), log('2026-10-02')];
    const checkins = [
      checkin('2026-09-29', 2),
      checkin('2026-10-01', 2),
      checkin('2026-10-03', 2),
      // After rest days Sep 29, Oct 1, Oct 3 → Sep 30, Oct 2, Oct 4 (pain 4).
      checkin('2026-09-30', 4),
      checkin('2026-10-02', 4),
      checkin('2026-10-04', 4),
    ];
    expect(trainingVsRestNextDayPain(logs, checkins, TODAY)).toEqual({
      afterTraining: 2,
      afterRest: 4,
      trainingDays: 3,
      restDays: 3,
    });
  });

  it('needs 3 days on each side', () => {
    expect(trainingVsRestNextDayPain([log('2026-10-10')], [checkin('2026-10-11', 2)], TODAY)).toBeNull();
  });
});

describe('exerciseProgress', () => {
  const routine = (id: string, exerciseId: string, name: string) =>
    ({ id, exercises: [{ id: exerciseId, name }] }) as Pick<Routine, 'id' | 'exercises'>;
  const done = (exercise_id: string, level: number) => ({
    exercise_id,
    completed: true,
    pain_discomfort_level: level,
    flagged_pain: false,
    note: null,
  });

  it('groups by name across routines and reports a real drop', () => {
    const routines = [routine('r1', 'ex_1', 'Chin tucks'), routine('r2', 'ex_3', 'Chin tucks')];
    const logs = [
      log('2026-10-01', { routine_id: 'r1', completed_exercises: [done('ex_1', 6)] }),
      log('2026-10-04', { routine_id: 'r2', completed_exercises: [done('ex_3', 6)] }),
      log('2026-10-10', { routine_id: 'r1', completed_exercises: [done('ex_1', 2)] }),
      log('2026-10-14', { routine_id: 'r2', completed_exercises: [done('ex_3', 2)] }),
    ];
    expect(exerciseProgress(logs, routines, TODAY)).toEqual([{ name: 'Chin tucks', from: 6, to: 2 }]);
  });

  it('skips exercises with too few entries or no real improvement', () => {
    const routines = [routine('r1', 'ex_1', 'Wall angels')];
    const flat = ['2026-10-01', '2026-10-04', '2026-10-10', '2026-10-14'].map((day) =>
      log(day, { completed_exercises: [done('ex_1', 3)] }),
    );
    expect(exerciseProgress(flat, routines, TODAY)).toEqual([]);
    expect(exerciseProgress(flat.slice(0, 3), routines, TODAY)).toEqual([]);
  });
});
