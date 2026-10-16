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
} from 'date-fns';

import type { Checkin } from '@/types/database.types';

export type TrendRange = 'week' | 'month' | 'all';
export type TrendGranularity = 'day' | 'week' | 'month';

export interface PainTrendPoint extends Record<string, unknown> {
  // Bucket index across the whole range (including empty buckets), so gaps
  // with no check-ins still take up horizontal space on the chart.
  x: number;
  // Mean of the bucket's daily averages; null when nothing was logged.
  pain: number | null;
  // First day of the bucket, yyyy-MM-dd.
  date: string;
}

export interface PainTrend {
  points: PainTrendPoint[];
  granularity: TrendGranularity;
}

const FIXED_RANGE_DAYS: Record<Exclude<TrendRange, 'all'>, number> = { week: 7, month: 30 };

// "All" picks its bucket size from how much history actually exists, so the
// chart stays at roughly ≤30 points no matter how long the user has logged.
const DAILY_MAX_SPAN_DAYS = 45;
const WEEKLY_MAX_SPAN_DAYS = 180;

type PainSample = Pick<Checkin, 'checkin_date' | 'pain_level'>;

// One value per day — morning and evening averaged together — so a day with
// both check-ins never counts twice in any later average.
export function dailyPainAverages(checkins: PainSample[]): Map<string, number> {
  const byDate = new Map<string, number[]>();
  for (const checkin of checkins) {
    const levels = byDate.get(checkin.checkin_date) ?? [];
    levels.push(checkin.pain_level);
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
export function rangeStartDate(range: TrendRange, today: string, checkins: PainSample[]): string {
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

export function buildPainTrend(checkins: PainSample[], range: TrendRange, today: string): PainTrend {
  const start = rangeStartDate(range, today, checkins);
  const granularity = pickGranularity(range, start, today);

  const valuesByBucket = new Map<string, number[]>();
  for (const [date, average] of dailyPainAverages(checkins)) {
    if (date < start || date > today) continue;
    const key = format(bucketStart(parseISO(date), granularity), 'yyyy-MM-dd');
    const values = valuesByBucket.get(key) ?? [];
    values.push(average);
    valuesByBucket.set(key, values);
  }

  const points: PainTrendPoint[] = [];
  const end = parseISO(today);
  for (let cursor = bucketStart(parseISO(start), granularity); cursor <= end; cursor = nextBucket(cursor, granularity)) {
    const date = format(cursor, 'yyyy-MM-dd');
    const values = valuesByBucket.get(date);
    points.push({
      x: points.length,
      pain: values ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
      date,
    });
  }

  return { points, granularity };
}
