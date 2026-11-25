import { pickLocale } from '@/lib/i18n/deviceLocale';

describe('pickLocale', () => {
  it('uses Lithuanian for a Lithuanian phone', () => {
    expect(pickLocale(['lt'])).toBe('lt');
    expect(pickLocale(['LT'])).toBe('lt');
  });

  it('falls back to English for everything else', () => {
    expect(pickLocale(['en'])).toBe('en');
    expect(pickLocale(['de', 'lt'])).toBe('en');
    expect(pickLocale([])).toBe('en');
    expect(pickLocale([null, 'lt'])).toBe('lt');
  });
});
