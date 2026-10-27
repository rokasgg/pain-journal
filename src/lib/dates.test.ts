import {
  formatDateRange,
  formatDayLabel,
  formatHeadingDate,
  formatMonthTitle,
  formatOneDecimal,
  formatShortDayLabel,
} from '@/lib/dates';

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

describe('formatShortDayLabel', () => {
  it('abbreviates the month', () => {
    expect(formatShortDayLabel(new Date(2026, 9, 13), 'lt')).toBe('spal. 13 d.');
    expect(formatShortDayLabel(new Date(2026, 9, 13), 'en')).toBe('13 Oct');
  });
});

describe('formatDayLabel lowercase', () => {
  it('can skip capitalising', () => {
    expect(formatDayLabel(new Date(2026, 7, 24), 'lt', false)).toBe('rugpjūčio 24 d.');
  });
});

describe('formatDateRange', () => {
  it('within a month', () => {
    expect(formatDateRange(new Date(2026, 9, 21), new Date(2026, 9, 27), 'lt')).toBe('spalio 21–27 d.');
    expect(formatDateRange(new Date(2026, 9, 21), new Date(2026, 9, 27), 'en')).toBe('21–27 October');
  });

  it('across months', () => {
    expect(formatDateRange(new Date(2026, 9, 28), new Date(2026, 10, 3), 'lt')).toBe('spalio 28 d. – lapkričio 3 d.');
    expect(formatDateRange(new Date(2026, 9, 28), new Date(2026, 10, 3), 'en')).toBe('28 October – 3 November');
  });
});

describe('formatOneDecimal', () => {
  it('uses the locale separator', () => {
    expect(formatOneDecimal(1.46, 'lt')).toBe('1,5');
    expect(formatOneDecimal(1.46, 'en')).toBe('1.5');
  });
});
