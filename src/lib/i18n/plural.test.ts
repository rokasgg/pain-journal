import { formatCount, formatDayCount } from './plural';

describe('formatDayCount', () => {
  it('handles English singular/plural', () => {
    expect(formatDayCount(1, 'en')).toBe('1 day');
    expect(formatDayCount(2, 'en')).toBe('2 days');
  });

  it('uses Lithuanian nominative forms ("liko 2 dienos")', () => {
    expect(formatDayCount(1, 'lt')).toBe('1 diena');
    expect(formatDayCount(2, 'lt')).toBe('2 dienos');
    expect(formatDayCount(5, 'lt')).toBe('5 dienos');
    expect(formatDayCount(10, 'lt')).toBe('10 dienų');
    expect(formatDayCount(11, 'lt')).toBe('11 dienų');
    expect(formatDayCount(12, 'lt')).toBe('12 dienų');
    expect(formatDayCount(21, 'lt')).toBe('21 diena');
    expect(formatDayCount(22, 'lt')).toBe('22 dienos');
  });

  it('uses Lithuanian accusative forms ("dar 2 dienas")', () => {
    expect(formatDayCount(1, 'lt', 'accusative')).toBe('1 dieną');
    expect(formatDayCount(2, 'lt', 'accusative')).toBe('2 dienas');
    expect(formatDayCount(15, 'lt', 'accusative')).toBe('15 dienų');
  });
});

describe('formatCount', () => {
  it('Lithuanian forms', () => {
    expect(formatCount(1, 'visit', 'lt')).toBe('1 vizitas');
    expect(formatCount(7, 'visit', 'lt')).toBe('7 vizitai');
    expect(formatCount(11, 'visit', 'lt')).toBe('11 vizitų');
    expect(formatCount(6, 'exercise', 'lt')).toBe('6 pratimai');
    expect(formatCount(9, 'entry', 'lt')).toBe('9 įrašais');
    expect(formatCount(6, 'morning', 'lt')).toBe('6 rytais');
    expect(formatCount(21, 'routine', 'lt')).toBe('21 treniruotė');
  });

  it('English forms', () => {
    expect(formatCount(1, 'visit', 'en')).toBe('1 visit');
    expect(formatCount(7, 'entry', 'en')).toBe('7 entries');
  });
});
