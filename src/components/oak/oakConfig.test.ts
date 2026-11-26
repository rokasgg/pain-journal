jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { buildTrainingCelebration, countWaterings, getOakProgress } from './oakConfig';

describe('getOakProgress', () => {
  it('starts as a seed', () => {
    const progress = getOakProgress(0);
    expect(progress.stage.key).toBe('seed');
    expect(progress.next?.key).toBe('sprout');
    expect(progress).toMatchObject({ stageIndex: 0, inStage: 0, needed: 3 });
  });

  it('counts within the current stage', () => {
    expect(getOakProgress(13)).toMatchObject({ stageIndex: 2, inStage: 3, needed: 15 });
  });

  it('switches exactly at the thresholds', () => {
    expect(getOakProgress(2).stage.key).toBe('seed');
    expect(getOakProgress(3).stage.key).toBe('sprout');
    expect(getOakProgress(24).stage.key).toBe('sapling');
    expect(getOakProgress(25).stage.key).toBe('young');
    expect(getOakProgress(50).stage.key).toBe('mighty');
  });

  it('has no next stage at Mighty', () => {
    const progress = getOakProgress(80);
    expect(progress.next).toBeNull();
    expect(progress.needed).toBe(0);
  });

  it('treats negative input as zero', () => {
    expect(getOakProgress(-4).stageIndex).toBe(0);
  });
});

describe('countWaterings', () => {
  it('counts one watering per local day', () => {
    const day = new Date(2026, 10, 20, 9, 0).toISOString();
    const sameDay = new Date(2026, 10, 20, 19, 0).toISOString();
    const nextDay = new Date(2026, 10, 21, 8, 0).toISOString();
    expect(countWaterings([day, sameDay, nextDay])).toBe(2);
  });
});

describe('buildTrainingCelebration', () => {
  it('waters when no threshold is crossed', () => {
    expect(buildTrainingCelebration(4, false)).toEqual({
      kind: 'watering',
      fromStageIndex: 1,
      stageIndex: 1,
      waterings: 5,
      counted: true,
    });
  });

  it('grows when the new watering crosses a threshold', () => {
    expect(buildTrainingCelebration(9, false)).toMatchObject({ kind: 'growth', fromStageIndex: 1, stageIndex: 2 });
  });

  it('counts nothing for a second workout on the same day', () => {
    expect(buildTrainingCelebration(9, true)).toMatchObject({ kind: 'watering', waterings: 9, counted: false });
  });

  it('shows no progress when the count was not loaded', () => {
    expect(buildTrainingCelebration(null, false)).toMatchObject({ kind: 'watering', waterings: null });
  });
});
