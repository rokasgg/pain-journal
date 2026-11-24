import { addDays, format, parseISO } from 'date-fns';

import {
  findingsWindow,
  isPoorNight,
  morningVsEvening,
  progressSinceStart,
  sleepVsMorningPain,
  stepsVsNextMorningPain,
  stressVsEveningPain,
} from '@/lib/insightFindings';
import type { Checkin } from '@/types/database.types';

const TODAY = '2026-10-27';

type Sample = Pick<Checkin, 'checkin_date' | 'type' | 'pain_level' | 'sleep_quality' | 'sleep_hours'>;

function c(
  checkin_date: string,
  type: 'morning' | 'evening',
  pain_level: number,
  sleep: { quality?: number | null; hours?: number | null } = {},
): Sample {
  return { checkin_date, type, pain_level, sleep_quality: sleep.quality ?? null, sleep_hours: sleep.hours ?? null };
}

describe('findingsWindow', () => {
  it('is the last 7 days including today', () => {
    expect(findingsWindow(TODAY)).toEqual({ from: '2026-10-21', to: '2026-10-27' });
  });
});

describe('morningVsEvening', () => {
  const week = [
    c('2026-10-23', 'morning', 5),
    c('2026-10-24', 'morning', 4),
    c('2026-10-25', 'morning', 5),
    c('2026-10-23', 'evening', 3),
    c('2026-10-24', 'evening', 3),
    c('2026-10-25', 'evening', 3),
  ];

  it('reports higher mornings with the averages and entry count', () => {
    const result = morningVsEvening(week, TODAY);
    expect(result).toMatchObject({ status: 'ready', direction: 'morningHigher', entries: 6, evening: 3 });
    if (result.status === 'ready') expect(result.morning).toBeCloseTo(4.667, 2);
  });

  it('flips when evenings hurt more', () => {
    const flipped = week.map((x) => ({
      ...x,
      type: x.type === 'morning' ? ('evening' as const) : ('morning' as const),
    }));
    expect(morningVsEvening(flipped, TODAY)).toMatchObject({ direction: 'eveningHigher' });
  });

  it('calls a gap under 0.3 similar', () => {
    // 4.0 vs 3.75 → a 0.25 gap.
    const close = [
      c('2026-10-23', 'morning', 4),
      c('2026-10-24', 'morning', 4),
      c('2026-10-25', 'morning', 4),
      c('2026-10-26', 'morning', 4),
      c('2026-10-23', 'evening', 4),
      c('2026-10-24', 'evening', 4),
      c('2026-10-25', 'evening', 4),
      c('2026-10-26', 'evening', 3),
    ];
    expect(morningVsEvening(close, TODAY)).toMatchObject({ direction: 'similar' });
  });

  it('needs 3 of each and says how many are missing', () => {
    expect(morningVsEvening(week.slice(0, 4), TODAY)).toEqual({ status: 'notEnough', needed: 2 });
    expect(morningVsEvening([], TODAY)).toEqual({ status: 'notEnough', needed: 6 });
  });

  it('ignores entries outside the 7-day window', () => {
    const old = week.map((x) => ({ ...x, checkin_date: '2026-10-20' }));
    expect(morningVsEvening(old, TODAY)).toEqual({ status: 'notEnough', needed: 6 });
  });
});

describe('isPoorNight', () => {
  it('uses quality first, then hours, else unknown', () => {
    expect(isPoorNight({ sleep_quality: 4, sleep_hours: 9 })).toBe(true);
    expect(isPoorNight({ sleep_quality: 5, sleep_hours: 4 })).toBe(false);
    expect(isPoorNight({ sleep_quality: null, sleep_hours: 6.5 })).toBe(true);
    expect(isPoorNight({ sleep_quality: null, sleep_hours: 7 })).toBe(false);
    expect(isPoorNight({ sleep_quality: null, sleep_hours: null })).toBeNull();
  });
});

describe('sleepVsMorningPain', () => {
  it('compares morning pain after poor vs good nights', () => {
    const rows = [
      c('2026-10-22', 'morning', 6, { quality: 3 }),
      c('2026-10-23', 'morning', 7, { hours: 5 }),
      c('2026-10-24', 'morning', 3, { quality: 8 }),
      c('2026-10-25', 'morning', 2, { hours: 8 }),
      c('2026-10-25', 'evening', 9), // evenings don't count
    ];
    expect(sleepVsMorningPain(rows, TODAY)).toMatchObject({
      status: 'ready',
      direction: 'higher',
      afterPoor: 6.5,
      afterGood: 2.5,
      entries: 4,
    });
  });

  it('lower and similar', () => {
    const lower = [
      c('2026-10-22', 'morning', 2, { quality: 3 }),
      c('2026-10-23', 'morning', 2, { quality: 3 }),
      c('2026-10-24', 'morning', 5, { quality: 8 }),
      c('2026-10-25', 'morning', 5, { quality: 8 }),
    ];
    expect(sleepVsMorningPain(lower, TODAY)).toMatchObject({ direction: 'lower' });
    const similar = lower.map((x) => ({ ...x, pain_level: 4 }));
    expect(sleepVsMorningPain(similar, TODAY)).toMatchObject({ direction: 'similar' });
  });

  it('one-sided when every night was the same kind', () => {
    const allGood = ['22', '23', '24', '25'].map((d) => c(`2026-10-${d}`, 'morning', 3, { quality: 8 }));
    expect(sleepVsMorningPain(allGood, TODAY)).toEqual({ status: 'oneSided', entries: 4 });
  });

  it('not enough, skipping mornings without sleep answers', () => {
    const rows = [c('2026-10-24', 'morning', 3, { quality: 2 }), c('2026-10-25', 'morning', 3)];
    expect(sleepVsMorningPain(rows, TODAY)).toEqual({ status: 'notEnough', needed: 3 });
  });
});

describe('stepsVsNextMorningPain', () => {
  // An evening with steps on `day`, and the next morning's pain.
  const day = (date: string, steps: number | null, nextMorning: string, nextPain: number) => [
    { checkin_date: date, type: 'evening' as const, pain_level: 3, steps },
    { checkin_date: nextMorning, type: 'morning' as const, pain_level: nextPain, steps: null },
  ];

  it('needs 3 days on each side with a next-morning check-in', () => {
    const data = [...day('2026-10-20', 9000, '2026-10-21', 2), ...day('2026-10-21', 3000, '2026-10-22', 5)];
    expect(stepsVsNextMorningPain(data, TODAY)).toEqual({ status: 'notEnough', needed: 4 });
  });

  it('skips evenings without steps or without a next morning', () => {
    const data = [
      { checkin_date: '2026-10-20', type: 'evening' as const, pain_level: 3, steps: 8000 }, // no next morning
      ...day('2026-10-21', null, '2026-10-22', 4), // Health not synced
    ];
    expect(stepsVsNextMorningPain(data, TODAY)).toEqual({ status: 'notEnough', needed: 6 });
  });

  it('compares the more active half of days with the quieter half', () => {
    const data = [
      ...day('2026-10-15', 2000, '2026-10-16', 6),
      ...day('2026-10-16', 3000, '2026-10-17', 5),
      ...day('2026-10-17', 4000, '2026-10-18', 6),
      ...day('2026-10-18', 8250, '2026-10-19', 3),
      ...day('2026-10-19', 9000, '2026-10-20', 4),
      ...day('2026-10-20', 12000, '2026-10-21', 2),
    ];
    const result = stepsVsNextMorningPain(data, TODAY);
    expect(result).toMatchObject({ status: 'ready', threshold: 8200, direction: 'lower', entries: 6 });
    if (result.status === 'ready') {
      expect(result.afterQuiet).toBeCloseTo(17 / 3);
      expect(result.afterActive).toBeCloseTo(3);
    }
  });

  it('reads a gap under half a point as similar', () => {
    const data = [
      ...day('2026-10-15', 2000, '2026-10-16', 4),
      ...day('2026-10-16', 3000, '2026-10-17', 4),
      ...day('2026-10-17', 4000, '2026-10-18', 4),
      ...day('2026-10-18', 8000, '2026-10-19', 4),
      ...day('2026-10-19', 9000, '2026-10-20', 4),
      ...day('2026-10-20', 12000, '2026-10-21', 5),
    ];
    expect(stepsVsNextMorningPain(data, TODAY)).toMatchObject({ status: 'ready', direction: 'similar' });
  });
});

describe('stressVsEveningPain', () => {
  const evening = (checkin_date: string, stress_level: number | null, pain_level: number) => ({
    checkin_date,
    type: 'evening' as const,
    pain_level,
    stress_level,
  });

  it('needs three stressful and three calm evenings', () => {
    const rows = [evening('2026-11-01', 4, 6), evening('2026-11-02', 1, 2), evening('2026-11-03', null, 9)];
    expect(stressVsEveningPain(rows, '2026-11-10')).toEqual({ status: 'notEnough', needed: 4 });
  });

  it('compares pain on stressful and calm evenings', () => {
    const rows = [
      evening('2026-11-01', 4, 6),
      evening('2026-11-02', 3, 5),
      evening('2026-11-03', 3, 7),
      evening('2026-11-04', 1, 2),
      evening('2026-11-05', 2, 3),
      evening('2026-11-06', 2, 1),
    ];
    expect(stressVsEveningPain(rows, '2026-11-10')).toMatchObject({
      status: 'ready',
      stressful: 6,
      calm: 2,
      direction: 'higher',
      entries: 6,
    });
  });
});

describe('progressSinceStart', () => {
  // `count` consecutive logged days from 1 Sep, pain stepping from `from` to `to`.
  const days = (count: number, painAt: (i: number) => number) =>
    Array.from({ length: count }, (_, i) => ({
      checkin_date: format(addDays(parseISO('2026-09-01'), i), 'yyyy-MM-dd'),
      pain_level: painAt(i),
      stiffness_level: null,
      range_of_motion: null,
    }));

  it('waits for 21 logged days', () => {
    expect(progressSinceStart(days(20, () => 5))).toEqual({ status: 'notEnough', needed: 1 });
  });

  it('uses 7-day windows between 21 and 27 days, so they never overlap', () => {
    // Pain 6 for the first 7 days, 3 for the last 7, and 9 in between: a
    // window that reached into the middle would change the result.
    const at = (count: number) => (i: number) => (i < 7 ? 6 : i >= count - 7 ? 3 : 9);
    for (const count of [21, 27]) {
      expect(progressSinceStart(days(count, at(count)))).toMatchObject({
        status: 'ready',
        windowDays: 7,
        pain: { start: 6, now: 3 },
        direction: 'better',
      });
    }
  });

  it('uses 14-day windows from 28 days', () => {
    const result = progressSinceStart(days(28, (i) => (i < 14 ? 4 : 6)));
    expect(result).toMatchObject({ status: 'ready', windowDays: 14, pain: { start: 4, now: 6 }, direction: 'worse' });
  });

  it('calls a small change steady and leaves out metrics with too few answers', () => {
    const result = progressSinceStart(days(30, () => 5));
    expect(result).toMatchObject({ direction: 'steady', stiffness: null, rangeOfMotion: null });
  });
});
