import { format, getHours, parseISO, subDays } from 'date-fns';

import { STRESSFUL_LEVEL } from '@/lib/checkinChoices';
import { toLocalDate } from '@/lib/dates';
import type { Checkin, FlareUp } from '@/types/database.types';

// Flare-up detective: what was unusual in the day or so before each flare-up,
// measured against the user's OWN normal, and which of those things keep
// coming back across flare-ups. Plain arithmetic over logged data, no AI.
// Wording built on this must only describe ("came before"), never claim a
// cause; the app never diagnoses.

export const DETECTIVE_WINDOW_DAYS = 90;
export const MIN_FLARES_FOR_PATTERNS = 3;
// A "usual" value needs this many ordinary days behind it.
const MIN_BASELINE_DAYS = 5;
// A pattern: off before at least half the flare-ups (and at least 2), and
// clearly more often than on ordinary days. Without the last check, something
// that's off most days would look like a pattern.
const MIN_PATTERN_SHARE = 0.5;
const MIN_PATTERN_HITS = 2;
const MIN_PATTERN_LIFT = 0.2;
const MAX_PATTERNS = 3;
const MAX_TRIGGERS = 3;
// A flare-up before this hour happened during the night, so "the night
// before" is the previous morning's sleep answer.
const NIGHT_FLARE_BEFORE_HOUR = 6;

export type FactorId =
  | 'sleepHours'
  | 'sleepQuality'
  | 'morningStiffness'
  | 'eveningPain'
  | 'screenTime'
  | 'stress'
  | 'activity'
  | 'steps'
  | 'trained';

export type Direction = 'low' | 'high';

// How far from the user's usual value counts as "unusual". Every rule is
// relative to their own data, not a population norm.
function deviation(factor: FactorId, value: number, usual: number): Direction | null {
  switch (factor) {
    case 'sleepHours':
      return value <= usual - 1 ? 'low' : null;
    case 'sleepQuality':
      return value <= usual - 2 ? 'low' : null;
    case 'morningStiffness':
    case 'eveningPain':
      return value >= usual + 2 ? 'high' : null;
    case 'screenTime':
      // Buckets are saved as 1/3/5/7/9 h, so +2 is the next bucket up.
      return value >= usual + 2 ? 'high' : null;
    case 'stress':
      // 1 calm … 4 very stressful: a step above usual, and at least "stressful".
      return value >= usual + 1 && value >= STRESSFUL_LEVEL ? 'high' : null;
    case 'activity':
      if (value >= usual + 3) return 'high';
      if (value <= usual - 3) return 'low';
      return null;
    case 'steps':
      if (usual <= 0) return null;
      if (value < usual * 0.7) return 'low';
      if (value > usual * 1.5) return 'high';
      return null;
    case 'trained':
      // `usual` is the share of ordinary days with a session.
      return value === 1 && usual < 0.5 ? 'high' : null;
  }
}

const FACTORS: FactorId[] = [
  'sleepHours',
  'sleepQuality',
  'morningStiffness',
  'eveningPain',
  'screenTime',
  'stress',
  'activity',
  'steps',
  'trained',
];

export type DetectiveCheckin = Pick<
  Checkin,
  | 'checkin_date'
  | 'type'
  | 'pain_level'
  | 'stiffness_level'
  | 'sleep_hours'
  | 'sleep_quality'
  | 'screen_time_hours'
  | 'stress_level'
  | 'activity_level'
  | 'steps'
  | 'created_at'
>;

export type DetectiveFlareUp = Pick<
  FlareUp,
  'id' | 'occurred_at' | 'pain_level' | 'triggers' | 'likely_cause' | 'resolved_duration_minutes'
>;

type FactorValues = Partial<Record<FactorId, number>>;

interface DayIndex {
  morning: Map<string, DetectiveCheckin>;
  evening: Map<string, DetectiveCheckin>;
}

function indexCheckins(checkins: DetectiveCheckin[]): DayIndex {
  const morning = new Map<string, DetectiveCheckin>();
  const evening = new Map<string, DetectiveCheckin>();
  for (const c of checkins) (c.type === 'morning' ? morning : evening).set(c.checkin_date, c);
  return { morning, evening };
}

function dayBefore(date: string): string {
  return format(subDays(parseISO(date), 1), 'yyyy-MM-dd');
}

// The values that describe the lead-up to `day`: last night's sleep, that
// morning's stiffness, and the previous day (evening pain, screen time,
// activity, steps, training). For a flare-up, `flareAt` keeps answers given
// AFTER it (and so possibly caused by it) out.
function leadUpValues(day: string, index: DayIndex, trainedDays: Set<string> | null, flareAt?: Date): FactorValues {
  const values: FactorValues = {};
  const previous = dayBefore(day);

  const nightMorning =
    flareAt && getHours(flareAt) < NIGHT_FLARE_BEFORE_HOUR ? index.morning.get(previous) : index.morning.get(day);
  if (nightMorning?.sleep_hours != null) values.sleepHours = nightMorning.sleep_hours;
  if (nightMorning?.sleep_quality != null) values.sleepQuality = nightMorning.sleep_quality;

  const morning = index.morning.get(day);
  const morningBeforeFlare = !flareAt || (morning && parseISO(morning.created_at) <= flareAt);
  if (morning && morningBeforeFlare && morning.stiffness_level != null) {
    values.morningStiffness = morning.stiffness_level;
  }

  const evening = index.evening.get(previous);
  if (evening) {
    values.eveningPain = evening.pain_level;
    if (evening.screen_time_hours != null) values.screenTime = evening.screen_time_hours;
    if (evening.stress_level != null) values.stress = evening.stress_level;
    if (evening.activity_level != null) values.activity = evening.activity_level;
    if (evening.steps != null) values.steps = evening.steps;
  }

  if (trainedDays) values.trained = trainedDays.has(previous) ? 1 : 0;
  return values;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export interface Baseline {
  usual: Partial<Record<FactorId, number>>;
  // Share of ordinary days where the factor was off in that direction.
  ordinaryRate: Partial<Record<`${FactorId}:${Direction}`, number>>;
}

export interface Deviation {
  factor: FactorId;
  direction: Direction;
  value: number;
  usual: number;
}

export interface FlareLeadUp {
  flareId: string;
  deviations: Deviation[];
  // Factors with an answer in the lead-up (0 means nothing was logged).
  checked: number;
}

export interface FlarePattern {
  factor: FactorId;
  direction: Direction;
  hits: number; // flare-ups where it was off
  total: number; // flare-ups with an answer for this factor
  usual: number;
  ordinaryRate: number;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type FlareDetective =
  | { status: 'none' }
  | { status: 'notEnough'; flares: number; needed: number }
  | {
      status: 'ready';
      flares: number;
      patterns: FlarePattern[];
      triggers: { trigger: string; count: number }[];
      timeOfDay: TimeOfDay | null;
      avgDurationMinutes: number | null;
    };

export interface DetectiveInput {
  checkins: DetectiveCheckin[];
  flareUps: DetectiveFlareUp[];
  // Days with a real training session, or null when training isn't tracked
  // (then "trained" is left out rather than read as "never trains").
  trainedDays: Set<string> | null;
  today: string;
}

function windowFlares(flareUps: DetectiveFlareUp[], today: string): DetectiveFlareUp[] {
  const from = format(subDays(parseISO(today), DETECTIVE_WINDOW_DAYS - 1), 'yyyy-MM-dd');
  return flareUps.filter((f) => {
    const day = toLocalDate(f.occurred_at);
    return day >= from && day <= today;
  });
}

export function buildBaseline({ checkins, flareUps, trainedDays, today }: DetectiveInput): Baseline {
  const index = indexCheckins(checkins);
  const flareDays = new Set(flareUps.map((f) => toLocalDate(f.occurred_at)));
  const collected: Partial<Record<FactorId, number[]>> = {};

  for (let i = 0; i < DETECTIVE_WINDOW_DAYS; i++) {
    const day = format(subDays(parseISO(today), i), 'yyyy-MM-dd');
    if (flareDays.has(day)) continue;
    // Only days the user actually logged around; otherwise "trained: no"
    // would count for every empty day.
    if (!index.morning.has(day) && !index.evening.has(dayBefore(day))) continue;
    const values = leadUpValues(day, index, trainedDays);
    for (const factor of FACTORS) {
      const value = values[factor];
      if (value === undefined) continue;
      (collected[factor] ??= []).push(value);
    }
  }

  const usual: Baseline['usual'] = {};
  const ordinaryRate: Baseline['ordinaryRate'] = {};
  for (const factor of FACTORS) {
    const values = collected[factor];
    if (!values || values.length < MIN_BASELINE_DAYS) continue;
    const typical = factor === 'trained' ? mean(values) : median(values);
    usual[factor] = typical;
    for (const direction of ['low', 'high'] as const) {
      const off = values.filter((v) => deviation(factor, v, typical) === direction).length;
      ordinaryRate[`${factor}:${direction}`] = off / values.length;
    }
  }
  return { usual, ordinaryRate };
}

export function flareLeadUp(
  flare: DetectiveFlareUp,
  checkins: DetectiveCheckin[],
  baseline: Baseline,
  trainedDays: Set<string> | null,
): FlareLeadUp {
  const flareAt = parseISO(flare.occurred_at);
  const values = leadUpValues(toLocalDate(flare.occurred_at), indexCheckins(checkins), trainedDays, flareAt);
  const deviations: Deviation[] = [];
  let checked = 0;
  for (const factor of FACTORS) {
    const value = values[factor];
    if (value === undefined) continue;
    // "Trained: no" isn't an answer the user gave, so it doesn't count as
    // something we looked at.
    if (factor !== 'trained' || value === 1) checked += 1;
    const usual = baseline.usual[factor];
    if (usual === undefined) continue;
    const direction = deviation(factor, value, usual);
    if (direction) deviations.push({ factor, direction, value, usual });
  }
  return { flareId: flare.id, deviations, checked };
}

// Old flare-ups only have the free-text likely_cause (see the flare-up form).
export function flareTriggers(flare: Pick<FlareUp, 'triggers' | 'likely_cause'>): string[] {
  if (flare.triggers.length > 0) return flare.triggers;
  const cause = flare.likely_cause?.trim();
  return cause ? [cause] : [];
}

export function timeOfDayOf(occurredAt: string): TimeOfDay {
  const hour = getHours(parseISO(occurredAt));
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export function analyzeFlareUps(input: DetectiveInput): FlareDetective {
  const flares = windowFlares(input.flareUps, input.today);
  if (flares.length === 0) return { status: 'none' };
  if (flares.length < MIN_FLARES_FOR_PATTERNS) {
    return { status: 'notEnough', flares: flares.length, needed: MIN_FLARES_FOR_PATTERNS - flares.length };
  }

  const baseline = buildBaseline(input);
  const leadUps = flares.map((f) => flareLeadUp(f, input.checkins, baseline, input.trainedDays));
  const index = indexCheckins(input.checkins);

  const patterns: FlarePattern[] = [];
  for (const factor of FACTORS) {
    const usual = baseline.usual[factor];
    if (usual === undefined) continue;
    const total = flares.filter((f) => {
      const values = leadUpValues(toLocalDate(f.occurred_at), index, input.trainedDays, parseISO(f.occurred_at));
      return values[factor] !== undefined;
    }).length;
    if (total < MIN_FLARES_FOR_PATTERNS) continue;
    for (const direction of ['low', 'high'] as const) {
      const hits = leadUps.filter((l) =>
        l.deviations.some((d) => d.factor === factor && d.direction === direction),
      ).length;
      const ordinaryRate = baseline.ordinaryRate[`${factor}:${direction}`] ?? 0;
      const share = hits / total;
      if (hits >= MIN_PATTERN_HITS && share >= MIN_PATTERN_SHARE && share - ordinaryRate >= MIN_PATTERN_LIFT) {
        patterns.push({ factor, direction, hits, total, usual, ordinaryRate });
      }
    }
  }
  patterns.sort((a, b) => b.hits / b.total - b.ordinaryRate - (a.hits / a.total - a.ordinaryRate));

  const triggerCounts = new Map<string, number>();
  for (const flare of flares) {
    for (const trigger of new Set(flareTriggers(flare))) {
      triggerCounts.set(trigger, (triggerCounts.get(trigger) ?? 0) + 1);
    }
  }
  const triggers = [...triggerCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TRIGGERS)
    .map(([trigger, count]) => ({ trigger, count }));

  const timeCounts = new Map<TimeOfDay, number>();
  for (const flare of flares) {
    const slot = timeOfDayOf(flare.occurred_at);
    timeCounts.set(slot, (timeCounts.get(slot) ?? 0) + 1);
  }
  const [topSlot, topCount] = [...timeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const timeOfDay = topCount / flares.length >= MIN_PATTERN_SHARE && topCount >= MIN_PATTERN_HITS ? topSlot : null;

  const durations = flares.map((f) => f.resolved_duration_minutes).filter((m): m is number => m != null && m > 0);
  const avgDurationMinutes = durations.length >= 2 ? mean(durations) : null;

  return {
    status: 'ready',
    flares: flares.length,
    patterns: patterns.slice(0, MAX_PATTERNS),
    triggers,
    timeOfDay,
    avgDurationMinutes,
  };
}
