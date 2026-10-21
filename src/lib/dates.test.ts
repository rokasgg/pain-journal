import { formatDayLabel, formatHeadingDate, formatMonthTitle } from '@/lib/dates';

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

describe('formatMonthTitle', () => {
  it('uses the standalone month', () => {
    expect(formatMonthTitle(new Date(2026, 9, 1), 'lt')).toBe('2026 m. spalis');
    expect(formatMonthTitle(new Date(2026, 9, 1), 'en')).toBe('October 2026');
  });
});

describe('formatDayLabel', () => {
  it('uses the genitive month in Lithuanian', () => {
    expect(formatDayLabel(new Date(2026, 9, 19), 'lt')).toBe('Spalio 19 d.');
    expect(formatDayLabel(new Date(2026, 9, 19), 'en')).toBe('19 October');
  });
});
