import { approxStartDate, onboardingSteps, purposeOf, wantsRecovery } from '@/lib/profileAnswers';

describe('purposeOf', () => {
  it('maps current and older goals', () => {
    expect(purposeOf('track_recovery')).toBe('recovery');
    expect(purposeOf('track_progress')).toBe('recovery');
    expect(purposeOf('understand_pain')).toBe('understand');
    expect(purposeOf('identify_triggers')).toBe('understand');
    expect(purposeOf('both')).toBe('both');
    expect(purposeOf('just_journal')).toBeNull();
    expect(purposeOf(null)).toBeNull();
  });

  it('treats both as recovery too', () => {
    expect(wantsRecovery('both')).toBe(true);
    expect(wantsRecovery('understand')).toBe(false);
  });
});

describe('onboardingSteps', () => {
  it('asks the same nine questions on every path', () => {
    const sorted = (purpose: Parameters<typeof onboardingSteps>[0]) => [...onboardingSteps(purpose)].sort();
    expect(onboardingSteps('recovery')).toHaveLength(9);
    expect(sorted('understand')).toEqual(sorted('recovery'));
    expect(sorted(null)).toEqual(sorted('both'));
  });

  it('asks about the diagnosis early for recovery and the hunches early for understanding', () => {
    const recovery = onboardingSteps('recovery');
    const understand = onboardingSteps('understand');
    expect(recovery.indexOf('diagnosis')).toBeLessThan(recovery.indexOf('hunches'));
    expect(understand.indexOf('hunches')).toBeLessThan(understand.indexOf('diagnosis'));
    expect(recovery[0]).toBe('purpose');
    expect(understand.at(-1)).toBe('ai');
  });
});

describe('approxStartDate', () => {
  it('turns a rough period into an approximate date', () => {
    expect(approxStartDate('this_week', '2026-11-24')).toBe('2026-11-21');
    expect(approxStartDate('month_ago', '2026-11-24')).toBe('2026-10-25');
    expect(approxStartDate('year_plus', '2026-11-24')).toBe('2025-11-24');
    expect(approxStartDate('unknown', '2026-11-24')).toBeNull();
  });
});
