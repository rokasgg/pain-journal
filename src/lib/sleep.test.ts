import { SLEEP_START_HOURS, formatDuration, healthAsleepHours, splitHours, stepSleepHours, timelineSegment } from './sleep';

describe('stepSleepHours', () => {
  it('lands on the starting value on the first tap, whichever button', () => {
    expect(stepSleepHours(null, 1, 14)).toBe(SLEEP_START_HOURS);
    expect(stepSleepHours(null, -1, 14)).toBe(SLEEP_START_HOURS);
  });

  it('moves in 30 minute steps and stays within 0..max', () => {
    expect(stepSleepHours(7.5, 1, 14)).toBe(8);
    expect(stepSleepHours(7.5, -1, 14)).toBe(7);
    expect(stepSleepHours(0, -1, 14)).toBe(0);
    expect(stepSleepHours(14, 1, 14)).toBe(14);
    expect(stepSleepHours(7 + 20 / 60, 1, 14)).toBeCloseTo(7 + 50 / 60);
  });
});

describe('formatting', () => {
  const units = { hours: 'val.', minutes: 'min.' };
  it('splits decimal hours', () => {
    expect(splitHours(7.5)).toEqual({ hours: 7, minutes: 30 });
    expect(splitHours(0)).toEqual({ hours: 0, minutes: 0 });
  });
  it('formats a duration, dropping zero minutes', () => {
    expect(formatDuration(450, units)).toBe('7 val. 30 min.');
    expect(formatDuration(480, units)).toBe('8 val.');
    expect(formatDuration(485, units)).toBe('8 val. 5 min.');
  });
});

describe('Apple Health sleep', () => {
  it('turns asleep minutes into decimal hours', () => {
    const sleep = { asleepMinutes: 440, inBedMinutes: 485, start: '', end: '', updatedAt: '' };
    expect(healthAsleepHours(sleep)).toBeCloseTo(7.33, 2);
  });

  it('places 23:48 → 07:08 on the 21:00–09:00 bar', () => {
    const segment = timelineSegment(new Date(2026, 9, 26, 23, 48), new Date(2026, 9, 27, 7, 8));
    expect(segment.leftPct).toBeCloseTo(23.33, 1);
    expect(segment.widthPct).toBeCloseTo(61.11, 1);
  });

  it('anchors a sleep that starts after midnight to the previous evening', () => {
    const segment = timelineSegment(new Date(2026, 9, 27, 1, 0), new Date(2026, 9, 27, 8, 0));
    expect(segment.leftPct).toBeCloseTo(33.33, 1);
    expect(segment.widthPct).toBeCloseTo(58.33, 1);
  });

  it('clamps to the bar', () => {
    const segment = timelineSegment(new Date(2026, 9, 26, 19, 0), new Date(2026, 9, 27, 11, 0));
    expect(segment.leftPct).toBe(0);
    expect(segment.leftPct + segment.widthPct).toBeLessThanOrEqual(100);
  });
});
