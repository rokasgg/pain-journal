import { findingsWindow, isPoorNight, morningVsEvening, sleepVsMorningPain } from '@/lib/insightFindings';
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
    const flipped = week.map((x) => ({ ...x, type: x.type === 'morning' ? ('evening' as const) : ('morning' as const) }));
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
