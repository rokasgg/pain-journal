import { addDays, format, parseISO } from 'date-fns';

import type { CheckinType } from '@/types/database.types';

import { buildCelebration } from './checkinCelebration';

// `count` distinct logged days ending the day before 2026-11-04.
function days(count: number, type: CheckinType = 'morning') {
  return Array.from({ length: count }, (_, index) => ({
    checkin_date: format(addDays(parseISO('2026-11-03'), -index), 'yyyy-MM-dd'),
    type,
  }));
}

const TODAY = '2026-11-04';

describe('buildCelebration', () => {
  it('first ever check-in: day 1, the acorn sprouts (milestone)', () => {
    const { progress, dayComplete } = buildCelebration({ type: 'morning', checkinDate: TODAY, checkinsBefore: [] });
    expect(dayComplete).toBe(false);
    expect(progress).toMatchObject({
      isNewDay: true,
      daysBefore: 0,
      daysAfter: 1,
      stageBefore: 1,
      stageAfter: 2,
      newlyUnlocked: [],
      next: { key: 'history', days: 3, daysRemaining: 2 },
      tier: 'milestone',
    });
  });

  it('evening after that day’s morning: no new day, the day is complete', () => {
    const before = [...days(4), { checkin_date: TODAY, type: 'morning' as const }];
    const { progress, dayComplete } = buildCelebration({ type: 'evening', checkinDate: TODAY, checkinsBefore: before });
    expect(dayComplete).toBe(true);
    expect(progress).toMatchObject({ isNewDay: false, daysBefore: 5, daysAfter: 5, tier: 'normal' });
  });

  it('a normal day in between milestones', () => {
    const { progress } = buildCelebration({ type: 'morning', checkinDate: TODAY, checkinsBefore: days(4) });
    expect(progress).toMatchObject({
      daysAfter: 5,
      stageBefore: 3,
      stageAfter: 3,
      next: { key: 'insights', days: 7, daysRemaining: 2 },
      tier: 'normal',
    });
  });

  it('day 3 unlocks History and grows a sapling', () => {
    const { progress } = buildCelebration({ type: 'evening', checkinDate: TODAY, checkinsBefore: days(2) });
    expect(progress).toMatchObject({
      daysAfter: 3,
      stageAfter: 3,
      newlyUnlocked: ['history'],
      next: { key: 'insights', daysRemaining: 4 },
      tier: 'milestone',
    });
  });

  it('day 7 announces Insights but never the care step', () => {
    const { progress } = buildCelebration({ type: 'morning', checkinDate: TODAY, checkinsBefore: days(6) });
    expect(progress?.newlyUnlocked).toEqual(['insights']);
    expect(progress?.next).toMatchObject({ key: 'reports', daysRemaining: 7 });
  });

  it('day 14 unlocks Reports; nothing is left to unlock', () => {
    const { progress } = buildCelebration({ type: 'morning', checkinDate: TODAY, checkinsBefore: days(13) });
    expect(progress).toMatchObject({ newlyUnlocked: ['reports'], stageAfter: 5, next: null, tier: 'milestone' });
  });

  it('long-term users: a normal day has no next unlock and no milestone', () => {
    const { progress } = buildCelebration({ type: 'morning', checkinDate: TODAY, checkinsBefore: days(20) });
    expect(progress).toMatchObject({ daysAfter: 21, next: null, anniversary: null, tier: 'normal' });
  });

  it('round numbers of days are celebrated', () => {
    const { progress } = buildCelebration({ type: 'morning', checkinDate: TODAY, checkinsBefore: days(29) });
    expect(progress).toMatchObject({ daysAfter: 30, anniversary: 30, tier: 'milestone' });
  });

  it('a late check-in for a day that already has an entry adds no day', () => {
    const before = days(5);
    const { progress } = buildCelebration({
      type: 'evening',
      checkinDate: before[1].checkin_date,
      checkinsBefore: before,
    });
    expect(progress).toMatchObject({ isNewDay: false, daysAfter: 5, tier: 'normal' });
  });

  it('history not loaded: no progress, so no wrong numbers', () => {
    expect(buildCelebration({ type: 'morning', checkinDate: TODAY, checkinsBefore: null })).toEqual({
      type: 'morning',
      dayComplete: false,
      progress: null,
    });
  });
});
