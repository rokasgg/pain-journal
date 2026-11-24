import { buildStartingPicture, hasUnansweredAboutMe, type StartingPictureInput } from '@/lib/startingPicture';

const base: StartingPictureInput = {
  purpose: 'understand',
  workType: null,
  workHours: null,
  lifeStress: null,
  suspectedTriggers: [],
  worstTimeOfDay: null,
};
const ids = (input: Partial<StartingPictureInput>) => buildStartingPicture({ ...base, ...input }).map((c) => c.id);

describe('buildStartingPicture', () => {
  it('falls back to "we will learn as you log" with nothing to watch', () => {
    expect(ids({})).toEqual(['learnAsYouLog']);
  });

  it('starts with the starting point for recovery and both', () => {
    expect(ids({ purpose: 'recovery' })).toEqual(['startingPoint']);
    expect(ids({ purpose: 'both', suspectedTriggers: ['screens'] })).toEqual(['startingPoint', 'screens']);
  });

  it('flags long sitting days from the job or the hunch, with the desk-breaks experiment', () => {
    expect(ids({ workType: 'sitting', workHours: '8_plus' })).toEqual(['sitting']);
    expect(ids({ workType: 'sitting', workHours: 'under_4' })).toEqual(['learnAsYouLog']);
    expect(ids({ suspectedTriggers: ['sitting'] })).toEqual(['sitting']);
    expect(buildStartingPicture({ ...base, suspectedTriggers: ['sitting'] })[0].experiment).toBe('deskBreaks');
  });

  it('covers stress, feet and the worst time of day', () => {
    expect(ids({ lifeStress: 'high' })).toEqual(['stress']);
    expect(ids({ lifeStress: 'moderate' })).toEqual(['learnAsYouLog']);
    expect(ids({ workType: 'physical' })).toEqual(['onFeet']);
    expect(ids({ worstTimeOfDay: 'evening' })).toEqual(['worstTime']);
    expect(ids({ worstTimeOfDay: 'no_pattern' })).toEqual(['learnAsYouLog']);
  });

  it('keeps at most three cards, in priority order', () => {
    expect(
      ids({
        purpose: 'recovery',
        suspectedTriggers: ['sitting', 'stress', 'screens', 'poor_sleep'],
        worstTimeOfDay: 'morning',
      }),
    ).toEqual(['startingPoint', 'sitting', 'stress']);
  });
});

describe('hasUnansweredAboutMe', () => {
  it('is true until work, stress and a hunch are all answered', () => {
    expect(hasUnansweredAboutMe({})).toBe(true);
    expect(hasUnansweredAboutMe({ work_type: 'mixed', life_stress: 'low' })).toBe(true);
    expect(hasUnansweredAboutMe({ work_type: 'mixed', life_stress: 'low', worst_time_of_day: 'evening' })).toBe(false);
    expect(hasUnansweredAboutMe({ work_type: 'mixed', life_stress: 'low', suspected_triggers: ['dont_know'] })).toBe(
      false,
    );
  });
});
