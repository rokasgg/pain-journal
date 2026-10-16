import { enUS, lt } from 'date-fns/locale';

import { buildTrend, dailyAverages, formatBucketDate, rangeStartDate } from './painTrend';

const TODAY = '2026-10-16'; // a Friday

function checkin(checkin_date: string, pain_level: number) {
  return { checkin_date, pain_level };
}

describe('dailyAverages', () => {
  it('averages morning and evening into one value per day', () => {
    const result = dailyAverages([checkin('2026-10-15', 2), checkin('2026-10-15', 6), checkin('2026-10-16', 3)]);
    expect(result.get('2026-10-15')).toBe(4);
    expect(result.get('2026-10-16')).toBe(3);
  });
});

describe('rangeStartDate', () => {
  it('includes today in the fixed ranges', () => {
    expect(rangeStartDate('week', TODAY, [])).toBe('2026-10-10');
    expect(rangeStartDate('month', TODAY, [])).toBe('2026-09-17');
  });

  it('starts "all" at the first check-in', () => {
    expect(rangeStartDate('all', TODAY, [checkin('2026-10-01', 1), checkin('2026-09-20', 1)])).toBe('2026-09-20');
  });
});

describe('buildTrend', () => {
  it('returns 7 daily buckets for a week, with null for days without data', () => {
    const { points, granularity } = buildTrend(
      [checkin('2026-10-10', 4), checkin('2026-10-16', 2), checkin('2026-10-16', 4)],
      'week',
      TODAY,
    );
    expect(granularity).toBe('day');
    expect(points).toHaveLength(7);
    expect(points[0]).toEqual({ x: 0, value: 4, date: '2026-10-10' });
    expect(points[1].value).toBeNull();
    expect(points[6]).toEqual({ x: 6, value: 3, date: '2026-10-16' });
  });

  it('ignores check-ins outside the range', () => {
    const { points } = buildTrend([checkin('2026-09-01', 9), checkin('2026-10-16', 1)], 'week', TODAY);
    expect(points.filter((p) => p.value !== null)).toHaveLength(1);
  });

  it('uses daily buckets for "all" with a short history', () => {
    const { points, granularity } = buildTrend([checkin('2026-10-01', 5), checkin('2026-10-16', 1)], 'all', TODAY);
    expect(granularity).toBe('day');
    expect(points).toHaveLength(16);
  });

  it('uses Monday-start weekly buckets for "all" with a few months of history', () => {
    const { points, granularity } = buildTrend(
      // Mon 2026-10-12 and Fri 2026-10-16 share a week; 2026-07-01 sets the span.
      [checkin('2026-07-01', 2), checkin('2026-10-12', 2), checkin('2026-10-16', 6)],
      'all',
      TODAY,
    );
    expect(granularity).toBe('week');
    expect(points[0].date).toBe('2026-06-29');
    expect(points[points.length - 1]).toMatchObject({ date: '2026-10-12', value: 4 });
  });

  it('uses monthly buckets for "all" with a long history', () => {
    const { points, granularity } = buildTrend([checkin('2025-11-20', 8), checkin('2026-10-02', 2)], 'all', TODAY);
    expect(granularity).toBe('month');
    expect(points[0]).toMatchObject({ date: '2025-11-01', value: 8 });
    expect(points).toHaveLength(12);
    expect(points[points.length - 1]).toMatchObject({ date: '2026-10-01', value: 2 });
  });
});

describe('buildTrend metrics', () => {
  it('buckets stiffness instead of pain when asked', () => {
    const { points } = buildTrend(
      [{ checkin_date: '2026-10-16', pain_level: 8, stiffness_level: 2 }],
      'week',
      TODAY,
      'stiffness_level',
    );
    expect(points[6].value).toBe(2);
  });

  it('skips null values instead of counting them as 0', () => {
    const averages = dailyAverages(
      [
        { checkin_date: '2026-10-16', pain_level: 1, range_of_motion: 6 },
        { checkin_date: '2026-10-16', pain_level: 1, range_of_motion: null },
      ],
      'range_of_motion',
    );
    expect(averages.get('2026-10-16')).toBe(6);
  });

  it('keeps the same buckets when a metric was never filled in', () => {
    const checkins = [checkin('2026-10-10', 3), checkin('2026-10-16', 5)];
    const pain = buildTrend(checkins, 'week', TODAY);
    const mobility = buildTrend(checkins, 'week', TODAY, 'range_of_motion');
    expect(mobility.points.map((p) => p.date)).toEqual(pain.points.map((p) => p.date));
    expect(mobility.points.every((p) => p.value === null)).toBe(true);
  });
});

describe('formatBucketDate', () => {
  it('formats each granularity', () => {
    expect(formatBucketDate('2026-10-16', 'day', enUS)).toBe('Fri, Oct 16');
    expect(formatBucketDate('2026-10-12', 'week', enUS)).toBe('Oct 12');
    expect(formatBucketDate('2026-10-01', 'month', enUS)).toBe('October');
  });

  it('capitalizes Lithuanian names', () => {
    expect(formatBucketDate('2026-10-01', 'month', lt)).toBe('Spalis');
  });
});
