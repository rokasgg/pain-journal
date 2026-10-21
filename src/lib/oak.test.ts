import { getOakStage } from '@/lib/oak';

describe('getOakStage', () => {
  it.each([
    [0, 1],
    [1, 2],
    [2, 2],
    [3, 3],
    [6, 3],
    [7, 4],
    [13, 4],
    [14, 5],
    [365, 5],
  ])('%i logged days → stage %i', (count, stage) => {
    expect(getOakStage(count)).toBe(stage);
  });

  it('treats negative or fractional counts safely', () => {
    expect(getOakStage(-1)).toBe(1);
    expect(getOakStage(2.9)).toBe(2);
  });

  it('never goes down as the count grows', () => {
    let previous = getOakStage(0);
    for (let count = 1; count <= 30; count++) {
      const stage = getOakStage(count);
      expect(stage).toBeGreaterThanOrEqual(previous);
      previous = stage;
    }
  });
});
