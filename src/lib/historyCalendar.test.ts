import { dayAveragePain, firstCheckinDate, painTint } from '@/lib/historyCalendar';

describe('painTint', () => {
  it.each([
    [null, 'none'],
    [undefined, 'none'],
    [0, 'free'],
    [0.5, 'low'],
    [3.9, 'low'],
    [4, 'mid'],
    [6.9, 'mid'],
    [7, 'high'],
    [10, 'high'],
  ])('%p → %s', (avg, tint) => {
    expect(painTint(avg)).toBe(tint);
  });
});

describe('firstCheckinDate', () => {
  it('returns the earliest date regardless of order', () => {
    expect(
      firstCheckinDate([{ checkin_date: '2026-10-05' }, { checkin_date: '2026-09-28' }, { checkin_date: '2026-10-01' }]),
    ).toBe('2026-09-28');
  });

  it('null when empty', () => {
    expect(firstCheckinDate([])).toBeNull();
  });
});

describe('dayAveragePain', () => {
  it('averages the day', () => {
    expect(dayAveragePain([{ pain_level: 4 }, { pain_level: 7 }])).toBe(5.5);
  });

  it('null without check-ins', () => {
    expect(dayAveragePain([])).toBeNull();
  });
});
