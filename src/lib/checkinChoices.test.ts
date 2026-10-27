import { SCREEN_TIME_BUCKETS, screenTimeBucketId } from './checkinChoices';

describe('screenTimeBucketId', () => {
  it('maps hours to the bucket that contains them', () => {
    expect(screenTimeBucketId(null)).toBeNull();
    expect(screenTimeBucketId(0)).toBe('lt2');
    expect(screenTimeBucketId(1.75)).toBe('lt2');
    expect(screenTimeBucketId(2)).toBe('h2to4');
    expect(screenTimeBucketId(3.5)).toBe('h2to4');
    expect(screenTimeBucketId(4)).toBe('h4to6');
    expect(screenTimeBucketId(6)).toBe('h6to8');
    expect(screenTimeBucketId(8)).toBe('gte8');
    expect(screenTimeBucketId(14)).toBe('gte8');
  });

  it('round-trips every bucket through its saved value', () => {
    for (const bucket of SCREEN_TIME_BUCKETS) {
      expect(screenTimeBucketId(bucket.hours)).toBe(bucket.id);
    }
  });
});
