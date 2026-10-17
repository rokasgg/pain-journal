import type { Checkin } from '@/types/database.types';

import { findPreviousCheckin, previousHintValues } from './checkinHints';

function checkin(checkin_date: string, type: Checkin['type'], pain_level = 3): Checkin {
  return { id: `${checkin_date}-${type}`, checkin_date, type, pain_level } as Checkin;
}

describe('findPreviousCheckin', () => {
  const checkins = [
    checkin('2026-10-13', 'morning', 2),
    checkin('2026-10-15', 'morning', 5),
    checkin('2026-10-15', 'evening', 7),
    checkin('2026-10-16', 'morning', 1), // same day as the form — not "previous"
  ];

  it('returns the latest same-type check-in before the date, flagged as yesterday', () => {
    expect(findPreviousCheckin(checkins, 'morning', '2026-10-16')).toEqual({
      checkin: checkins[1],
      isYesterday: true,
    });
  });

  it('flags an older one as not-yesterday (e.g. a backfilled date)', () => {
    expect(findPreviousCheckin(checkins, 'morning', '2026-10-15')).toEqual({
      checkin: checkins[0],
      isYesterday: false,
    });
  });

  it('never mixes morning and evening', () => {
    expect(findPreviousCheckin(checkins, 'evening', '2026-10-16')?.checkin.pain_level).toBe(7);
    expect(findPreviousCheckin(checkins, 'evening', '2026-10-15')).toBeNull();
  });
});

describe('previousHintValues', () => {
  it('keeps answered sliders and skips pain 0 and nulls', () => {
    const previous = {
      ...checkin('2026-10-15', 'morning', 0),
      stiffness_level: 4,
      range_of_motion: null,
      sleep_quality: 7,
    } as Checkin;
    expect(previousHintValues(previous)).toEqual({ stiffness_level: 4, sleep_quality: 7 });
  });
});
