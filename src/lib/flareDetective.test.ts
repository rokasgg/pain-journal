import { addDays, format, parseISO } from 'date-fns';

import {
  analyzeFlareUps,
  buildBaseline,
  flareLeadUp,
  flareTriggers,
  timeOfDayOf,
  type DetectiveCheckin,
  type DetectiveFlareUp,
} from '@/lib/flareDetective';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const TODAY = '2026-10-30';
const START = '2026-09-01';

function day(offset: number): string {
  return format(addDays(parseISO(START), offset), 'yyyy-MM-dd');
}

// Local times (no offset) so the tests don't depend on the machine's timezone.
function morning(date: string, sleep_hours: number, extra: Partial<DetectiveCheckin> = {}): DetectiveCheckin {
  return {
    checkin_date: date,
    type: 'morning',
    pain_level: 2,
    stiffness_level: 3,
    sleep_hours,
    sleep_quality: 7,
    screen_time_hours: null,
    activity_level: null,
    steps: null,
    created_at: `${date}T08:00:00`,
    ...extra,
  };
}

function evening(date: string, screen_time_hours: number, extra: Partial<DetectiveCheckin> = {}): DetectiveCheckin {
  return {
    checkin_date: date,
    type: 'evening',
    pain_level: 2,
    stiffness_level: 3,
    sleep_hours: null,
    sleep_quality: null,
    screen_time_hours,
    activity_level: 5,
    steps: 8000,
    created_at: `${date}T21:00:00`,
    ...extra,
  };
}

function flare(id: string, date: string, time = '15:00', extra: Partial<DetectiveFlareUp> = {}): DetectiveFlareUp {
  return {
    id,
    occurred_at: `${date}T${time}:00`,
    pain_level: 7,
    triggers: [],
    likely_cause: null,
    resolved_duration_minutes: null,
    ...extra,
  };
}

// 60 ordinary days: 7.5 h sleep, 3 h screens. Flare days get a short night
// and a long screen evening before them.
function history(flareDays: string[]): DetectiveCheckin[] {
  const flareSet = new Set(flareDays);
  const out: DetectiveCheckin[] = [];
  for (let i = 0; i < 60; i++) {
    const date = day(i);
    const tomorrow = day(i + 1);
    out.push(morning(date, flareSet.has(date) ? 5 : 7.5));
    out.push(evening(date, flareSet.has(tomorrow) ? 9 : 3));
  }
  return out;
}

describe('analyzeFlareUps', () => {
  it('says there is nothing to analyse without flare-ups', () => {
    expect(analyzeFlareUps({ checkins: history([]), flareUps: [], trainedDays: null, today: TODAY })).toEqual({
      status: 'none',
    });
  });

  it('asks for more flare-ups before naming patterns', () => {
    const result = analyzeFlareUps({
      checkins: history([day(10)]),
      flareUps: [flare('a', day(10))],
      trainedDays: null,
      today: TODAY,
    });
    expect(result).toEqual({ status: 'notEnough', flares: 1, needed: 2 });
  });

  it('finds short sleep and long screen time before flare-ups', () => {
    const flareDays = [day(10), day(25), day(40)];
    const result = analyzeFlareUps({
      checkins: history(flareDays),
      flareUps: flareDays.map((d, i) => flare(String(i), d)),
      trainedDays: null,
      today: TODAY,
    });
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    const ids = result.patterns.map((p) => `${p.factor}:${p.direction}`);
    expect(ids).toEqual(expect.arrayContaining(['sleepHours:low', 'screenTime:high']));
    const sleep = result.patterns.find((p) => p.factor === 'sleepHours');
    expect(sleep).toMatchObject({ hits: 3, total: 3, usual: 7.5 });
  });

  it('finds stressful days before flare-ups, against a calm-to-normal usual', () => {
    const flareDays = [day(10), day(25), day(40)];
    // Ordinary evenings are "normal" (2); the evening before each flare-up is
    // "very stressful" (4). Sleep and screens stay ordinary throughout.
    const stressedEvenings = new Set(flareDays.map((d) => format(addDays(parseISO(d), -1), 'yyyy-MM-dd')));
    const checkins = history([]).map((c) =>
      c.type === 'evening' ? { ...c, stress_level: stressedEvenings.has(c.checkin_date) ? 4 : 2 } : c,
    );
    const result = analyzeFlareUps({
      checkins,
      flareUps: flareDays.map((d, i) => flare(String(i), d)),
      trainedDays: null,
      today: TODAY,
    });
    expect(result.status === 'ready' && result.patterns.map((p) => `${p.factor}:${p.direction}`)).toEqual([
      'stress:high',
    ]);
  });

  it('does not flag a "stressful" day when stressful is the usual', () => {
    const checkins = history([]).map((c) => (c.type === 'evening' ? { ...c, stress_level: 3 } : c));
    const flareDays = [day(10), day(25), day(40)];
    const result = analyzeFlareUps({
      checkins,
      flareUps: flareDays.map((d, i) => flare(String(i), d)),
      trainedDays: null,
      today: TODAY,
    });
    expect(result.status === 'ready' && result.patterns).toEqual([]);
  });

  it('does not call something a pattern when it is off on ordinary days too', () => {
    // Every night is short, so a short night before a flare-up says nothing.
    const checkins = history([]).map((c) => (c.type === 'morning' ? { ...c, sleep_hours: 5 } : c));
    const flareDays = [day(10), day(25), day(40)];
    const result = analyzeFlareUps({
      checkins,
      flareUps: flareDays.map((d, i) => flare(String(i), d)),
      trainedDays: null,
      today: TODAY,
    });
    expect(result.status === 'ready' && result.patterns).toEqual([]);
  });

  it('counts repeated triggers, the usual time of day and the average duration', () => {
    const flareDays = [day(10), day(25), day(40)];
    const result = analyzeFlareUps({
      checkins: history([]),
      flareUps: [
        flare('a', flareDays[0], '19:00', { triggers: ['Desk work', 'Stress'], resolved_duration_minutes: 120 }),
        flare('b', flareDays[1], '20:30', { triggers: ['Desk work'], resolved_duration_minutes: 240 }),
        flare('c', flareDays[2], '10:00', { likely_cause: 'Stress' }),
      ],
      trainedDays: null,
      today: TODAY,
    });
    expect(result).toMatchObject({
      status: 'ready',
      triggers: [
        { trigger: 'Desk work', count: 2 },
        { trigger: 'Stress', count: 2 },
      ],
      timeOfDay: 'evening',
      avgDurationMinutes: 180,
    });
  });

  it('ignores flare-ups older than the window', () => {
    const result = analyzeFlareUps({
      checkins: history([]),
      flareUps: [flare('old', '2026-01-10')],
      trainedDays: null,
      today: TODAY,
    });
    expect(result).toEqual({ status: 'none' });
  });
});

describe('flareLeadUp', () => {
  const checkins = history([day(20)]);
  const input = { checkins, flareUps: [flare('x', day(20))], trainedDays: null, today: TODAY };

  it('lists what was off against the usual value', () => {
    const lead = flareLeadUp(flare('x', day(20)), checkins, buildBaseline(input), null);
    expect(lead.deviations).toEqual(
      expect.arrayContaining([
        { factor: 'sleepHours', direction: 'low', value: 5, usual: 7.5 },
        { factor: 'screenTime', direction: 'high', value: 9, usual: 3 },
      ]),
    );
    expect(lead.checked).toBeGreaterThan(0);
  });

  it('leaves out the morning answers given after a morning flare-up', () => {
    const early = flare('x', day(20), '07:00');
    const late = morning(day(20), 5, { stiffness_level: 9, created_at: `${day(20)}T09:00:00` });
    const data = checkins.map((c) => (c.type === 'morning' && c.checkin_date === day(20) ? late : c));
    const lead = flareLeadUp(early, data, buildBaseline({ ...input, checkins: data }), null);
    expect(lead.deviations.some((d) => d.factor === 'morningStiffness')).toBe(false);
  });

  it('uses the previous night for a flare-up in the small hours', () => {
    const night = flare('x', day(20), '03:00');
    const lead = flareLeadUp(night, checkins, buildBaseline(input), null);
    // day(19)'s morning was an ordinary 7.5 h night.
    expect(lead.deviations.some((d) => d.factor === 'sleepHours')).toBe(false);
  });

  it('says nothing was checked when nothing was logged', () => {
    const lead = flareLeadUp(flare('x', '2026-12-01'), checkins, buildBaseline(input), null);
    expect(lead).toEqual({ flareId: 'x', deviations: [], checked: 0 });
  });

  it('flags training the day before only for someone who usually rests', () => {
    const trained = new Set([day(19)]);
    const lead = flareLeadUp(flare('x', day(20)), checkins, buildBaseline({ ...input, trainedDays: trained }), trained);
    expect(lead.deviations).toEqual(expect.arrayContaining([expect.objectContaining({ factor: 'trained' })]));
  });
});

describe('helpers', () => {
  it('falls back to likely_cause for old flare-ups', () => {
    expect(flareTriggers({ triggers: [], likely_cause: ' Stress ' })).toEqual(['Stress']);
    expect(flareTriggers({ triggers: ['Sleep'], likely_cause: 'Sleep' })).toEqual(['Sleep']);
    expect(flareTriggers({ triggers: [], likely_cause: null })).toEqual([]);
  });

  it('buckets the time of day', () => {
    expect(timeOfDayOf('2026-10-01T06:00:00')).toBe('morning');
    expect(timeOfDayOf('2026-10-01T13:00:00')).toBe('afternoon');
    expect(timeOfDayOf('2026-10-01T18:00:00')).toBe('evening');
    expect(timeOfDayOf('2026-10-01T23:30:00')).toBe('night');
  });
});
