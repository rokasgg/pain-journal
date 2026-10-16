import type { Checkin, ExerciseLog, FlareUp, Routine } from '@/types/database.types';

import { buildMonthlyWrap, recentCompletedMonths, type WrapSlide, type WrapSlideKind } from './wrap';

// wrap → lib/dates → useLocaleStore, which persists via AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const MONTH = '2026-09';

function checkin(checkin_date: string, pain_level: number, overrides: Partial<Checkin> = {}): Checkin {
  return {
    id: `${checkin_date}-${overrides.type ?? 'morning'}`,
    user_id: 'u1',
    type: 'morning',
    checkin_date,
    pain_level,
    stiffness_level: null,
    range_of_motion: null,
    sleep_quality: null,
    sleep_hours: null,
    woke_up_with_pain: null,
    sleep_position: null,
    activity_level: null,
    screen_time_hours: null,
    did_exercises: null,
    exercise_notes: null,
    exercise_hours: null,
    exercise_intensity: null,
    symptoms: {},
    triggers: [],
    notes: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function flareUp(occurred_at: string, resolved_duration_minutes: number | null = null): FlareUp {
  return {
    id: occurred_at,
    user_id: 'u1',
    occurred_at,
    pain_level: 8,
    likely_cause: null,
    description: null,
    status: 'resolved',
    status_updated_at: occurred_at,
    resolved_duration_minutes,
    resolution_note: null,
    created_at: occurred_at,
  };
}

// Sept 1–n, one morning check-in a day at a fixed pain level.
function septemberDays(n: number, pain = 3, overrides: Partial<Checkin> = {}): Checkin[] {
  return Array.from({ length: n }, (_, i) => checkin(`2026-09-${String(i + 1).padStart(2, '0')}`, pain, overrides));
}

function build(input: Partial<Parameters<typeof buildMonthlyWrap>[0]>) {
  return buildMonthlyWrap({ month: MONTH, checkins: [], flareUps: [], exerciseLogs: [], routines: [], ...input });
}

function slide<K extends WrapSlideKind>(slides: WrapSlide[] | null, kind: K) {
  return slides?.find((s): s is Extract<WrapSlide, { kind: K }> => s.kind === kind);
}

describe('buildMonthlyWrap', () => {
  it('needs at least 7 logged days in the month', () => {
    expect(build({ checkins: septemberDays(6) })).toBeNull();
    expect(build({ checkins: septemberDays(7) })).not.toBeNull();
  });

  it('always starts with intro and ends with summary', () => {
    const slides = build({ checkins: septemberDays(10) });
    expect(slides?.[0].kind).toBe('intro');
    expect(slides?.[slides.length - 1].kind).toBe('summary');
  });

  it('measures the longest streak across a gap and counts full days', () => {
    const checkins = [
      ...septemberDays(5),
      checkin('2026-09-01', 3, { type: 'evening' }),
      ...['10', '11', '12', '13', '14', '15', '16'].map((d) => checkin(`2026-09-${d}`, 3)),
    ];
    const consistency = slide(build({ checkins }), 'consistency');
    expect(consistency).toMatchObject({ daysLogged: 12, daysInMonth: 30, longestStreak: 7, fullDays: 1 });
  });

  it('skips the pain-free slide when there were none', () => {
    expect(slide(build({ checkins: septemberDays(10, 2) }), 'painFree')).toBeUndefined();
    const withZeros = [...septemberDays(8, 2), checkin('2026-09-20', 0), checkin('2026-09-21', 0)];
    expect(slide(build({ checkins: withZeros }), 'painFree')).toMatchObject({ painFreeDays: 2 });
  });

  describe('painChange', () => {
    const previous = ['01', '02', '03'].map((d) => checkin(`2026-08-${d}`, 4));

    it('is better, worse or steady against the previous month', () => {
      expect(slide(build({ checkins: [...previous, ...septemberDays(8, 2)] }), 'painChange')?.tone).toBe('better');
      expect(slide(build({ checkins: [...previous, ...septemberDays(8, 6)] }), 'painChange')?.tone).toBe('worse');
      expect(slide(build({ checkins: [...previous, ...septemberDays(8, 4.2)] }), 'painChange')?.tone).toBe('steady');
    });

    it('is skipped without enough previous-month data', () => {
      expect(slide(build({ checkins: [previous[0], ...septemberDays(8)] }), 'painChange')).toBeUndefined();
    });
  });

  it('picks the calmest week, ignoring weeks with fewer than 3 days', () => {
    const checkins = [
      // Mon Sep 7 – Sun Sep 13: avg 4
      ...['07', '08', '09'].map((d) => checkin(`2026-09-${d}`, 4)),
      // Mon Sep 14 – Sun Sep 20: avg 1.5
      ...['14', '15', '16', '17'].map((d, i) => checkin(`2026-09-${d}`, i % 2 === 0 ? 1 : 2)),
      // Only two days that week, at pain 0 — not enough to count.
      checkin('2026-09-21', 0),
      checkin('2026-09-22', 0),
    ];
    expect(slide(build({ checkins }), 'calmestWeek')).toEqual({
      kind: 'calmestWeek',
      weekStart: '2026-09-14',
      weekEnd: '2026-09-20',
      average: 1.5,
    });
  });

  it('treats a rise in range of motion as better', () => {
    const previous = ['01', '02', '03'].map((d) => checkin(`2026-08-${d}`, 3, { range_of_motion: 4 }));
    const body = slide(build({ checkins: [...previous, ...septemberDays(8, 3, { range_of_motion: 7 })] }), 'body');
    expect(body?.mobility?.tone).toBe('better');
    expect(body?.stiffness).toBeNull();
  });

  it('summarizes training with the most-completed exercise', () => {
    const routine = {
      id: 'r1',
      exercises: [
        { id: 'ex_1', name: 'Chin tucks' },
        { id: 'ex_2', name: 'Wall angels' },
      ],
    } as Routine;
    const log = (day: string, status: ExerciseLog['status'], done: string[]): ExerciseLog => ({
      id: day,
      user_id: 'u1',
      routine_id: 'r1',
      logged_at: new Date(2026, 8, Number(day), 18).toISOString(),
      status,
      completed_exercises: ['ex_1', 'ex_2'].map((id) => ({
        exercise_id: id,
        completed: done.includes(id),
        pain_discomfort_level: 2,
        flagged_pain: false,
        note: null,
      })),
      general_note: null,
    });
    const exerciseLogs = [
      log('2', 'FULL', ['ex_1', 'ex_2']),
      log('4', 'PARTIAL', ['ex_1']),
      log('6', 'SKIPPED', []),
    ];
    expect(slide(build({ checkins: septemberDays(8), exerciseLogs, routines: [routine] }), 'training')).toEqual({
      kind: 'training',
      sessions: 2,
      fullSessions: 1,
      topExercise: { name: 'Chin tucks', count: 2 },
    });
  });

  describe('flareUps', () => {
    it('celebrates a month with none', () => {
      expect(slide(build({ checkins: septemberDays(8) }), 'flareUps')).toMatchObject({ count: 0, tone: 'better' });
    });

    it('counts a just-after-midnight flare-up in its local month', () => {
      // 00:30 local on Oct 1 — still Sep 30 in UTC for any UTC+ timezone.
      const lateNight = flareUp(new Date(2026, 9, 1, 0, 30).toISOString());
      expect(slide(build({ checkins: septemberDays(8), flareUps: [lateNight] }), 'flareUps')?.count).toBe(0);
    });

    it('compares with last month and averages known durations', () => {
      const flareUps = [
        flareUp(new Date(2026, 7, 10, 12).toISOString()),
        flareUp(new Date(2026, 8, 3, 12).toISOString(), 60),
        flareUp(new Date(2026, 8, 9, 12).toISOString(), 120),
      ];
      expect(slide(build({ checkins: septemberDays(8), flareUps }), 'flareUps')).toMatchObject({
        count: 2,
        previousCount: 1,
        avgDurationMinutes: 90,
        tone: 'worse',
      });
    });
  });

  it('only shows the sleep slide when more sleep clearly lines up with less pain', () => {
    const rested = ['01', '02', '03', '04'].map((d) => checkin(`2026-09-${d}`, 2, { sleep_hours: 8 }));
    const short = ['05', '06', '07', '08'].map((d) => checkin(`2026-09-${d}`, 4, { sleep_hours: 5.5 }));
    expect(slide(build({ checkins: [...rested, ...short] }), 'sleep')).toMatchObject({
      wellRestedPain: 2,
      shortSleepPain: 4,
    });

    const noGap = short.map((c) => ({ ...c, pain_level: 2 }));
    expect(slide(build({ checkins: [...rested, ...noGap] }), 'sleep')).toBeUndefined();
  });
});

describe('recentCompletedMonths', () => {
  it('lists previous months newest first, never the current one', () => {
    expect(recentCompletedMonths('2026-01-15', 3)).toEqual(['2025-12', '2025-11', '2025-10']);
  });
});
