import { estimatedDurationMinutes, formatElapsed } from './flareFollowUp';

const units = { minutes: 'min.', hours: 'val.', days: 'd.' };
// Tuesday 27 Oct 2026, 08:30 — a morning check-in.
const now = new Date(2026, 9, 27, 8, 30);

describe('estimatedDurationMinutes', () => {
  const flare = new Date(2026, 9, 26, 19, 12); // yesterday 19:12

  it('estimates each window from when the flare began', () => {
    expect(estimatedDurationMinutes('evening', flare, now)).toBe(108); // → 21:00
    expect(estimatedDurationMinutes('night', flare, now)).toBe(7 * 60 + 48); // → 03:00
    expect(estimatedDurationMinutes('morning', flare, now)).toBe(11 * 60 + 48); // → 07:00
  });

  it('gives no duration for "don\'t know"', () => {
    expect(estimatedDurationMinutes('unknown', flare, now)).toBeNull();
  });

  it('gives no duration when the window is before the flare began', () => {
    // Flare began at 23:30 — "yesterday evening" can't be when it ended.
    expect(estimatedDurationMinutes('evening', new Date(2026, 9, 26, 23, 30), now)).toBeNull();
  });
});

describe('formatElapsed', () => {
  it('uses minutes, hours, then days', () => {
    expect(formatElapsed(0, units)).toBe('0 min.');
    expect(formatElapsed(45, units)).toBe('45 min.');
    expect(formatElapsed(15 * 60 + 20, units)).toBe('15 val.');
    expect(formatElapsed(47 * 60, units)).toBe('47 val.');
    expect(formatElapsed(72 * 60, units)).toBe('3 d.');
  });
  it('never goes negative', () => {
    expect(formatElapsed(-5, units)).toBe('0 min.');
  });
});
