import { formatHeadingDate } from '@/lib/dates';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('formatHeadingDate', () => {
  const wednesday = new Date(2026, 9, 21);

  it('uses the nominative weekday and genitive month in Lithuanian', () => {
    expect(formatHeadingDate(wednesday, 'lt')).toBe('Trečiadienis, spalio 21 d.');
  });

  it('formats English', () => {
    expect(formatHeadingDate(wednesday, 'en')).toBe('Wednesday, 21 October');
  });
});
