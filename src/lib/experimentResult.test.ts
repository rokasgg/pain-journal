import { addDays, format, parseISO } from 'date-fns';

import {
  asksOn,
  experimentDayStates,
  experimentResult,
  isFinished,
  isRunning,
  lastCountedDay,
  plannedEnd,
} from '@/lib/experimentResult';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const START = '2026-10-15';
const experiment = { started_on: START, length_days: 7, status: 'active' as const, ended_on: null };

function day(offset: number): string {
  return format(addDays(parseISO(START), offset), 'yyyy-MM-dd');
}

function checkin(date: string, type: 'morning' | 'evening', pain_level: number, stiffness_level: number | null = null) {
  return { checkin_date: date, type, pain_level, stiffness_level };
}

describe('dates', () => {
  it('knows the planned end and the last day that counts', () => {
    expect(plannedEnd(experiment)).toBe('2026-10-21');
    expect(lastCountedDay(experiment, '2026-10-18')).toBe('2026-10-18');
    expect(lastCountedDay(experiment, '2026-11-01')).toBe('2026-10-21');
    expect(lastCountedDay({ ...experiment, status: 'stopped', ended_on: '2026-10-17' }, '2026-11-01')).toBe('2026-10-17');
  });

  it('is running until its last day, then finished', () => {
    expect(isRunning(experiment, '2026-10-21')).toBe(true);
    expect(isRunning(experiment, '2026-10-22')).toBe(false);
    expect(isFinished(experiment, '2026-10-22')).toBe(true);
    expect(isFinished({ ...experiment, status: 'stopped' }, '2026-10-22')).toBe(false);
  });

  it('asks in the evening check-in only during the experiment', () => {
    expect(asksOn(experiment, '2026-10-14')).toBe(false);
    expect(asksOn(experiment, '2026-10-15')).toBe(true);
    expect(asksOn(experiment, '2026-10-22')).toBe(false);
    expect(asksOn({ ...experiment, status: 'stopped' }, '2026-10-16')).toBe(false);
  });
});

describe('experimentDayStates', () => {
  it('marks followed, skipped, unanswered and upcoming days', () => {
    const states = experimentDayStates(
      experiment,
      [
        { date: day(0), followed: true },
        { date: day(1), followed: false },
      ],
      day(3),
    ).map((d) => d.state);
    expect(states).toEqual(['followed', 'skipped', 'unanswered', 'unanswered', 'upcoming', 'upcoming', 'upcoming']);
  });
});

describe('experimentResult', () => {
  // Before: pain 5 every day, stiffness 6. During: pain 3, stiffness 4.
  const checkins = [
    ...Array.from({ length: 14 }, (_, i) => [
      checkin(day(-14 + i), 'morning', 5, 6),
      checkin(day(-14 + i), 'evening', 5),
    ]).flat(),
    ...Array.from({ length: 8 }, (_, i) => [checkin(day(i), 'morning', 3, 4), checkin(day(i), 'evening', 3)]).flat(),
  ];
  const followed = Array.from({ length: 7 }, (_, i) => ({ date: day(i), followed: i !== 2 }));

  it('compares followed days with the 14 days before', () => {
    const result = experimentResult(experiment, followed, checkins, [], '2026-11-01');
    expect(result).toMatchObject({
      status: 'ready',
      followedDays: 6,
      pain: { during: 3, before: 5, direction: 'lower' },
      nextMorningStiffness: { direction: 'lower' },
    });
  });

  it('counts flare-ups per week before and during', () => {
    const flares = [{ occurred_at: `${day(-3)}T10:00:00` }, { occurred_at: `${day(-10)}T10:00:00` }];
    const result = experimentResult(experiment, followed, checkins, flares, '2026-11-01');
    expect(result.status === 'ready' && result.flaresPerWeekBefore).toBe(1);
    expect(result.status === 'ready' && result.flaresPerWeekDuring).toBe(0);
  });

  it('calls a small gap similar', () => {
    const flat = checkins.map((c) => ({ ...c, pain_level: c.checkin_date >= START ? 4.9 : 5 }));
    const result = experimentResult(experiment, followed, flat, [], '2026-11-01');
    expect(result.status === 'ready' && result.pain.direction).toBe('similar');
  });

  it('waits for enough followed days and a baseline', () => {
    const result = experimentResult(experiment, followed.slice(0, 2), checkins, [], '2026-11-01');
    expect(result).toMatchObject({ status: 'notEnough', followedDays: 2, neededFollowed: 2, neededBaseline: 0 });
    const noBaseline = experimentResult(experiment, followed, checkins.filter((c) => c.checkin_date >= START), [], '2026-11-01');
    expect(noBaseline).toMatchObject({ status: 'notEnough', neededBaseline: 3 });
  });

  it("ignores answers after an early stop", () => {
    const stopped = { ...experiment, status: 'stopped' as const, ended_on: day(2) };
    const result = experimentResult(stopped, followed, checkins, [], '2026-11-01');
    expect(result).toMatchObject({ status: 'notEnough', followedDays: 2 });
  });
});
