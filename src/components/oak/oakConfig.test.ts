import { buildTrainingCelebration, OAK_STAGE_LIST, OAK_STAGES } from './oakConfig';

describe('OAK_STAGES', () => {
  it('has a config for every oak stage', () => {
    OAK_STAGE_LIST.forEach((stage) => expect(OAK_STAGES[stage].stage).toBe(stage));
  });
});

describe('buildTrainingCelebration', () => {
  it('counts the first workout of the day', () => {
    expect(buildTrainingCelebration({ stage: 3, weekCountBefore: 1, goal: 3, wateredToday: false })).toEqual({
      stage: 3,
      sessions: 2,
      goal: 3,
      counted: true,
    });
  });

  it('adds nothing for a second workout on the same day', () => {
    expect(buildTrainingCelebration({ stage: 3, weekCountBefore: 2, goal: 3, wateredToday: true })).toMatchObject({
      sessions: 2,
      counted: false,
    });
  });

  it('hides the weekly card when the week was not loaded', () => {
    expect(
      buildTrainingCelebration({ stage: null, weekCountBefore: null, goal: 3, wateredToday: false }),
    ).toMatchObject({ sessions: null });
  });

  it('never uses a goal below one', () => {
    expect(buildTrainingCelebration({ stage: 1, weekCountBefore: 0, goal: 0, wateredToday: false }).goal).toBe(1);
  });
});
