import { countLoggedDays, getJourneyState, isCareStepDue, resolveTrainingEnabled } from './journey';

describe('countLoggedDays', () => {
  it('counts distinct dates, so morning + evening is one day', () => {
    expect(
      countLoggedDays([
        { checkin_date: '2026-10-15' },
        { checkin_date: '2026-10-15' },
        { checkin_date: '2026-10-16' },
      ]),
    ).toBe(2);
  });
});

describe('getJourneyState', () => {
  it('starts with nothing unlocked and History next', () => {
    const state = getJourneyState(0);
    expect(state.unlocked.size).toBe(0);
    expect(state.next).toEqual({ key: 'history', days: 3, daysRemaining: 3 });
  });

  it('unlocks exactly at each threshold', () => {
    expect(getJourneyState(2).unlocked.has('history')).toBe(false);
    expect(getJourneyState(3).unlocked.has('history')).toBe(true);
    expect(getJourneyState(3).next).toMatchObject({ key: 'insights', daysRemaining: 4 });
    const seven = getJourneyState(7);
    expect([...seven.unlocked]).toEqual(['history', 'insights', 'careStep']);
    expect(seven.next).toMatchObject({ key: 'reports', daysRemaining: 7 });
  });

  it('has no next milestone once everything is unlocked', () => {
    const state = getJourneyState(40);
    expect(state.unlocked.size).toBe(4);
    expect(state.next).toBeNull();
  });
});

describe('resolveTrainingEnabled', () => {
  it('respects an explicit choice either way', () => {
    expect(resolveTrainingEnabled({ training_enabled: false, primary_goal: 'track_exercises' }, true)).toBe(false);
    expect(resolveTrainingEnabled({ training_enabled: true, primary_goal: null }, false)).toBe(true);
  });

  it('keeps it on for undecided users who already use it or asked for it', () => {
    expect(resolveTrainingEnabled({ training_enabled: null, primary_goal: null }, true)).toBe(true);
    expect(resolveTrainingEnabled({ training_enabled: null, primary_goal: 'track_exercises' }, false)).toBe(true);
    expect(resolveTrainingEnabled({ training_enabled: null, primary_goal: 'just_journal' }, false)).toBe(false);
    expect(resolveTrainingEnabled(undefined, false)).toBe(false);
  });
});

describe('isCareStepDue', () => {
  const TODAY = '2026-10-18';
  const unlocked = getJourneyState(7);

  it('is not due before the milestone', () => {
    expect(isCareStepDue(getJourneyState(6), { care_status: null, care_status_answered_at: null }, TODAY)).toBe(false);
  });

  it('is due once unlocked and unanswered', () => {
    expect(isCareStepDue(unlocked, { care_status: null, care_status_answered_at: null }, TODAY)).toBe(true);
  });

  it('re-asks "not yet" after 14 days only', () => {
    const recent = { care_status: 'not_yet' as const, care_status_answered_at: '2026-10-10T09:00:00Z' };
    const old = { care_status: 'not_yet' as const, care_status_answered_at: '2026-10-01T09:00:00Z' };
    expect(isCareStepDue(unlocked, recent, TODAY)).toBe(false);
    expect(isCareStepDue(unlocked, old, TODAY)).toBe(true);
  });

  it('never re-asks the other answers', () => {
    const answered = { care_status: 'just_tracking' as const, care_status_answered_at: '2026-01-01T09:00:00Z' };
    expect(isCareStepDue(unlocked, answered, TODAY)).toBe(false);
  });
});
