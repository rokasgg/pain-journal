import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  type Locale,
} from 'date-fns';

import type { Checkin } from '@/types/database.types';

export type TrendRange = 'week' | 'month' | 'all';
export type TrendGranularity = 'day' | 'week' | 'month';
// The three 0–10 body metrics every check-in collects. Note range_of_motion
// is "higher is better" — the opposite direction of the other two.
export type TrendMetric = 'pain_level' | 'stiffness_level' | 'range_of_motion';

export interface TrendPoint extends Record<string, unknown> {
  // Bucket index across the whole range (including empty buckets), so gaps
  // with no check-ins still take up horizontal space on the chart.
  x: number;
  // Mean of the bucket's daily averages; null when nothing was logged for
  // the metric.
  value: number | null;
  // First day of the bucket, yyyy-MM-dd.
  date: string;
}

export interface Trend {
  points: TrendPoint[];
  granularity: TrendGranularity;
}

const FIXED_RANGE_DAYS: Record<Exclude<TrendRange, 'all'>, number> = { week: 7, month: 30 };

// "All" picks its bucket size from how much history actually exists, so the
// chart stays at roughly ≤30 points no matter how long the user has logged.
const DAILY_MAX_SPAN_DAYS = 45;
const WEEKLY_MAX_SPAN_DAYS = 180;

type TrendSample = Pick<Checkin, 'checkin_date' | 'pain_level'> &
  Partial<Pick<Checkin, 'stiffness_level' | 'range_of_motion'>>;

// One value per day — morning and evening averaged together — so a day with
// both check-ins never counts twice in any later average. Null values are
// skipped (stiffness/range of motion are nullable, and older rows may lack
// them), so a day with only nulls gets no entry at all.
export function dailyAverages(checkins: TrendSample[], metric: TrendMetric = 'pain_level'): Map<string, number> {
  const byDate = new Map<string, number[]>();
  for (const checkin of checkins) {
    const level = checkin[metric];
    if (level == null) continue;
    const levels = byDate.get(checkin.checkin_date) ?? [];
    levels.push(level);
    byDate.set(checkin.checkin_date, levels);
  }

  const averages = new Map<string, number>();
  for (const [date, levels] of byDate) {
    averages.set(date, levels.reduce((sum, level) => sum + level, 0) / levels.length);
  }
  return averages;
}

// First local day (yyyy-MM-dd) included in a range. `today` is injected so
// callers derive it via todayLocalDate() and tests stay deterministic.
export function rangeStartDate(range: TrendRange, today: string, checkins: Pick<Checkin, 'checkin_date'>[]): string {
  if (range !== 'all') {
    return format(subDays(parseISO(today), FIXED_RANGE_DAYS[range] - 1), 'yyyy-MM-dd');
  }
  // "All" starts at the first check-in, not the fetch window, so a new
  // account doesn't get a mostly empty chart.
  let earliest = today;
  for (const checkin of checkins) {
    if (checkin.checkin_date < earliest) earliest = checkin.checkin_date;
  }
  return earliest;
}

function pickGranularity(range: TrendRange, start: string, today: string): TrendGranularity {
  if (range !== 'all') return 'day';
  const spanDays = differenceInCalendarDays(parseISO(today), parseISO(start)) + 1;
  if (spanDays <= DAILY_MAX_SPAN_DAYS) return 'day';
  if (spanDays <= WEEKLY_MAX_SPAN_DAYS) return 'week';
  return 'month';
}

function bucketStart(date: Date, granularity: TrendGranularity): Date {
  if (granularity === 'week') return startOfWeek(date, { weekStartsOn: 1 });
  if (granularity === 'month') return startOfMonth(date);
  return date;
}

function nextBucket(date: Date, granularity: TrendGranularity): Date {
  if (granularity === 'week') return addWeeks(date, 1);
  if (granularity === 'month') return addMonths(date, 1);
  return addDays(date, 1);
}

// Bucket boundaries depend only on range + check-in dates, never on which
// metric is selected — so switching metric keeps an identical x axis and the
// chart can morph the line as a pure y change.
export function buildTrend(
  checkins: TrendSample[],
  range: TrendRange,
  today: string,
  metric: TrendMetric = 'pain_level',
): Trend {
  const start = rangeStartDate(range, today, checkins);
  const granularity = pickGranularity(range, start, today);

  const valuesByBucket = new Map<string, number[]>();
  for (const [date, average] of dailyAverages(checkins, metric)) {
    if (date < start || date > today) continue;
    const key = format(bucketStart(parseISO(date), granularity), 'yyyy-MM-dd');
    const values = valuesByBucket.get(key) ?? [];
    values.push(average);
    valuesByBucket.set(key, values);
  }

  const points: TrendPoint[] = [];
  const end = parseISO(today);
  for (let cursor = bucketStart(parseISO(start), granularity); cursor <= end; cursor = nextBucket(cursor, granularity)) {
    const date = format(cursor, 'yyyy-MM-dd');
    const values = valuesByBucket.get(date);
    points.push({
      x: points.length,
      value: values ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
      date,
    });
  }

  return { points, granularity };
}

const BUCKET_DATE_FORMATS: Record<TrendGranularity, string> = {
  day: 'EEE, MMM d',
  week: 'MMM d',
  month: 'LLLL',
};

// Date part of the scrubber readout. Week buckets return just the start date —
// the caller wraps it in the translated "Week of …".
export function formatBucketDate(date: string, granularity: TrendGranularity, locale: Locale): string {
  const text = format(parseISO(date), BUCKET_DATE_FORMATS[granularity], { locale });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface PeriodComparison {
  current: number;
  previous: number;
  // In points on the 0–10 scale, not percent — percent change on a 0–10
  // scale is misleading (1 → 2 reads as "+100%").
  delta: number;
}

const MIN_DAYS_PER_PERIOD = 3;

export function meanOfDays(averages: Map<string, number>, from: string, to: string): { mean: number; days: number } {
  let sum = 0;
  let days = 0;
  for (const [date, value] of averages) {
    if (date < from || date > to) continue;
    sum += value;
    days += 1;
  }
  return { mean: days > 0 ? sum / days : 0, days };
}

// Current range vs the same-length window right before it, both as means of
// daily averages. null for "all" (no previous period), too little data on
// either side, or a change that would round to 0.0.
export function comparePeriods(
  checkins: TrendSample[],
  range: TrendRange,
  today: string,
  metric: TrendMetric = 'pain_level',
): PeriodComparison | null {
  if (range === 'all') return null;

  const length = FIXED_RANGE_DAYS[range];
  const currentStart = rangeStartDate(range, today, checkins);
  const previousEnd = format(subDays(parseISO(currentStart), 1), 'yyyy-MM-dd');
  const previousStart = format(subDays(parseISO(currentStart), length), 'yyyy-MM-dd');

  const averages = dailyAverages(checkins, metric);
  const current = meanOfDays(averages, currentStart, today);
  const previous = meanOfDays(averages, previousStart, previousEnd);
  if (current.days < MIN_DAYS_PER_PERIOD || previous.days < MIN_DAYS_PER_PERIOD) return null;

  const delta = current.mean - previous.mean;
  if (Math.abs(delta) < 0.05) return null;
  return { current: current.mean, previous: previous.mean, delta };
}

// A day counts as pain-free only if its *daily average* is 0 — morning 0 and
// evening 2 is not a pain-free day.
export function countPainFreeDays(checkins: TrendSample[]): { painFree: number; logged: number } {
  const averages = dailyAverages(checkins);
  let painFree = 0;
  for (const value of averages.values()) {
    if (value === 0) painFree += 1;
  }
  return { painFree, logged: averages.size };
}
